import { test } from "node:test";
import assert from "node:assert/strict";
import {
  WEEK_MS,
  backtest,
  forecastNextWeek,
  reorderAmount,
  startOfWeek,
  weeklyTotals,
} from "../src/lib/forecast.js";

// Thursday 15 Oct 2026, 10:00 UTC. Its week starts Monday 12 Oct.
const now = new Date("2026-10-15T10:00:00Z");

test("startOfWeek returns Monday 00:00 UTC", () => {
  assert.equal(startOfWeek(now).toISOString(), "2026-10-12T00:00:00.000Z");
  // A Monday is its own week start, and Sunday belongs to the week before.
  assert.equal(startOfWeek(new Date("2026-10-12T08:00:00Z")).toISOString(), "2026-10-12T00:00:00.000Z");
  assert.equal(startOfWeek(new Date("2026-10-18T23:00:00Z")).toISOString(), "2026-10-12T00:00:00.000Z");
});

test("weeklyTotals buckets full weeks, oldest first, and skips the current week", () => {
  const monday = startOfWeek(now).getTime();
  const sales = [
    { productId: 1, quantity: 5, createdAt: new Date(monday - 1) }, // last full week
    { productId: 1, quantity: 3, createdAt: new Date(monday - 1.5 * WEEK_MS) }, // two weeks ago
    { productId: 1, quantity: 2, createdAt: new Date(monday + 1000) }, // this week: ignored
    { productId: 1, quantity: 9, createdAt: new Date(monday - 10 * WEEK_MS) }, // too old: ignored
    { productId: 2, quantity: 4, createdAt: new Date(monday - 3.5 * WEEK_MS) },
  ];

  const totals = weeklyTotals(sales, 4, now);

  assert.deepEqual(totals.get(1), [0, 0, 3, 5]);
  assert.deepEqual(totals.get(2), [4, 0, 0, 0]);
});

test("forecast is the average of the last 4 weeks", () => {
  assert.equal(forecastNextWeek([100, 10, 20, 30, 40]), 25);
});

test("reorder tops stock up to 2 weeks of forecast", () => {
  assert.equal(reorderAmount(10, 5), 15);
  assert.equal(reorderAmount(10, 20), 0);
  assert.equal(reorderAmount(10, 25), 0);
});

test("backtest scores the hidden weeks against the model and the naive guess", () => {
  // Known weeks end with 40; average of the last 4 known weeks is 25.
  const result = backtest([10, 20, 30, 40, 30, 30, 30, 30], 4);

  assert.equal(result.model, 25);
  assert.equal(result.naive, 40);
  assert.equal(result.modelError, 20); // 4 weeks × |30 - 25|
  assert.equal(result.naiveError, 40); // 4 weeks × |30 - 40|
  assert.equal(result.actualTotal, 120);
});
