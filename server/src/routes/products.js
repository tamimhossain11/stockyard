import express from "express";
import { z } from "zod";
import prisma from "../db.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";
import { parse, idParam } from "../lib/validate.js";

const router = express.Router();

//This line is to remind that its for logged in users.
router.use(requireAuth);

const UNITS = ["bag", "ton", "cft", "piece"];

// Limits match the columns: Decimal(12, 2) for money, Decimal(12, 3) for quantities.
const price = z.number().positive().max(9_999_999_999);
const quantity = z.number().nonnegative().max(999_999_999);

const createSchema = z.object({
  title: z.string().trim().min(1).max(100),
  variant: z.string().trim().min(1).max(100),
  unit: z.enum(UNITS),
  price,
  stock: quantity.default(0),
});

// List active products (any logged-in user).
router.get("/", async (req, res) => {
  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: [{ title: "asc" }, { variant: "asc" }],
  });

  res.json(products);
});

// Create a product (admin or manager).
router.post("/", requireRole("ADMIN", "MANAGER"), async (req, res) => {
  const data = parse(createSchema, req.body);
  const product = await prisma.product.create({ data });

  res.status(201).json(product);
});

// Set the stock count (admin or manager), e.g. after a delivery or a recount.
router.patch("/:id/stock", requireRole("ADMIN", "MANAGER"), async (req, res) => {
  const id = parse(idParam, req.params.id);
  const { stock } = parse(z.object({ stock: quantity }), req.body);

  const product = await prisma.product.update({
    where: { id, active: true },
    data: { stock },
  });

  res.json(product);
});

// Change the price (admin only). This is the role rule.
router.patch("/:id/price", requireRole("ADMIN"), async (req, res) => {
  const id = parse(idParam, req.params.id);
  const data = parse(z.object({ price }), req.body);

  const product = await prisma.product.update({
    where: { id, active: true },
    data,
  });

  res.json(product);
});

// Archive instead of delete: old order items still point at this product.
router.patch("/:id/archive", requireRole("ADMIN", "MANAGER"), async (req, res) => {
  const id = parse(idParam, req.params.id);

  const product = await prisma.product.update({
    where: { id, active: true },
    data: { active: false },
  });

  res.json(product);
});

export default router;
