import express from "express";
import prisma from "../db.js";
import { requireAuth } from "../middleware/requireAuth.js";
import {
  AVERAGE_WEEKS,
  COVER_WEEKS,
  WEEK_MS,
  backtest,
  forecastNextWeek,
  reorderAmount,
  startOfWeek,
  weekStarts,
  weeklyTotals,
} from "../lib/forecast.js";

const router = express.Router();

router.use(requireAuth);

const HISTORY_WEEKS = 12;
const BACKTEST_HIDDEN_WEEKS = 4;

const round = (n, places = 2) => Math.round(n * 10 ** places) / 10 ** places;

// Delivered sales from the last `weeks` full weeks, as plain numbers.
async function deliveredSales(weeks, now) {
  const since = new Date(startOfWeek(now).getTime() - weeks * WEEK_MS);

  const items = await prisma.orderItem.findMany({
    where: { order: { status: "DELIVERED", createdAt: { gte: since } } },
    select: { productId: true, quantity: true, order: { select: { createdAt: true } } },
  });

  return items.map((i) => ({
    productId: i.productId,
    quantity: Number(i.quantity),
    createdAt: i.order.createdAt,
  }));
}

function activeProducts() {
  return prisma.product.findMany({
    where: { active: true },
    orderBy: [{ title: "asc" }, { variant: "asc" }],
  });
}

// Forecast for next week = average of the last 4 full weeks of delivered sales.
router.get("/", async (req, res) => {
  const now = new Date();
  const [sales, products] = await Promise.all([
    deliveredSales(AVERAGE_WEEKS, now),
    activeProducts(),
  ]);
  const totals = weeklyTotals(sales, AVERAGE_WEEKS, now);

  const rows = products.map((p) => {
    const weekly = totals.get(p.id) ?? new Array(AVERAGE_WEEKS).fill(0);
    const forecast = forecastNextWeek(weekly);
    const stock = Number(p.stock);

    return {
      productId: p.id,
      title: p.title,
      variant: p.variant,
      unit: p.unit,
      stock,
      weekly: weekly.map((w) => round(w, 3)),
      forecast: round(forecast, 3),
      reorder: round(reorderAmount(forecast, stock), 3),
    };
  });

  // Products that need restocking first, biggest shortfall (relative to forecast) on top.
  rows.sort((a, b) => b.reorder / (b.forecast || 1) - a.reorder / (a.forecast || 1));

  res.json({
    averageWeeks: AVERAGE_WEEKS,
    coverWeeks: COVER_WEEKS,
    weekStarts: weekStarts(AVERAGE_WEEKS, now),
    rows,
  });
});

router.get("/backtest", async (req, res) => {
  const now = new Date();
  const [sales, products] = await Promise.all([
    deliveredSales(HISTORY_WEEKS, now),
    activeProducts(),
  ]);
  const totals = weeklyTotals(sales, HISTORY_WEEKS, now);

  const rows = products
    .map((p) => {
      const series = totals.get(p.id) ?? new Array(HISTORY_WEEKS).fill(0);
      const result = backtest(series, BACKTEST_HIDDEN_WEEKS);
      if (result.actualTotal === 0) return null; // no sales in the hidden weeks to score

      return {
        productId: p.id,
        title: p.title,
        variant: p.variant,
        unit: p.unit,
        actual: result.actual.map((a) => round(a, 3)),
        modelForecast: round(result.model, 3),
        naiveForecast: round(result.naive, 3),
        modelError: round(result.modelError / result.actualTotal, 3),
        naiveError: round(result.naiveError / result.actualTotal, 3),
      };
    })
    .filter(Boolean);

  const mean = (key) => round(rows.reduce((s, r) => s + r[key], 0) / (rows.length || 1), 3);

  res.json({
    historyWeeks: HISTORY_WEEKS,
    hiddenWeeks: BACKTEST_HIDDEN_WEEKS,
    summary: {
      products: rows.length,
      modelError: mean("modelError"),
      naiveError: mean("naiveError"),
      modelWins: rows.filter((r) => r.modelError < r.naiveError).length,
    },
    rows,
  });
});

export default router;
