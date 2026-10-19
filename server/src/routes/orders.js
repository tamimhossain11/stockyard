import express from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import prisma from "../db.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { parse, idParam } from "../lib/validate.js";
import { HttpError } from "../lib/httpError.js";
import { ORDER_STATUSES, canMove, nextStatuses, stockChange } from "../lib/orderStatus.js";

const router = express.Router();

// Admins and managers both can create orders.
router.use(requireAuth);

const createSchema = z.object({
  customerName: z.string().trim().min(1).max(100),
  customerPhone: z
    .string()
    .trim()
    .regex(/^\+?[0-9][0-9 -]{5,19}$/, "Enter a valid phone number"),
  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        quantity: z.number().positive().max(999_999_999),
      })
    )
    .min(1, "Add at least one item")
    .max(50)
    .refine(
      (items) => new Set(items.map((i) => i.productId)).size === items.length,
      "Each product can appear only once in an order"
    ),
});

const listSchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
});

const statusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
});

const orderDetail = {
  createdBy: { select: { id: true, name: true } },
  items: {
    include: { product: { select: { id: true, title: true, variant: true, unit: true } } },
    orderBy: { id: "asc" },
  },
};

const withNextStatuses = (order) => ({ ...order, nextStatuses: nextStatuses(order.status) });

// Create an order. 

router.post("/", async (req, res) => {
  const { customerName, customerPhone, items } = parse(createSchema, req.body);

  const products = await prisma.product.findMany({
    where: { id: { in: items.map((i) => i.productId) }, active: true },
  });

  if (products.length !== items.length) {
    throw new HttpError(400, "One or more products don't exist or are archived");
  }

  const priceById = new Map(products.map((p) => [p.id, p.price]));

  const lines = items.map((item) => ({
    productId: item.productId,
    quantity: new Prisma.Decimal(item.quantity).toDecimalPlaces(3),
    unitPrice: priceById.get(item.productId),
  }));

  const total = lines.reduce(
    (sum, line) => sum.plus(line.unitPrice.times(line.quantity)),
    new Prisma.Decimal(0)
  );

  const order = await prisma.order.create({
    data: {
      customerName,
      customerPhone,
      createdById: req.user.id,
      total: total.toDecimalPlaces(2),
      items: { create: lines },
    },
    include: orderDetail,
  });

  res.status(201).json(withNextStatuses(order));
});

// List orders, newest first.
router.get("/", async (req, res) => {
  const { status } = parse(listSchema, req.query);

  const orders = await prisma.order.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      createdBy: { select: { id: true, name: true } },
      _count: { select: { items: true } },
    },
  });

  res.json(orders.map(withNextStatuses));
});

// One order with its items.
router.get("/:id", async (req, res) => {
  const id = parse(idParam, req.params.id);

  const order = await prisma.order.findUnique({ where: { id }, include: orderDetail });

  if (!order) throw new HttpError(404, "Order not found");

  res.json(withNextStatuses(order));
});

// Change status.
router.patch("/:id/status", async (req, res) => {
  const id = parse(idParam, req.params.id);
  const { status: to } = parse(statusSchema, req.body);

  const order = await prisma.$transaction(async (tx) => {
    const current = await tx.order.findUnique({ where: { id }, include: { items: true } });

    if (!current) throw new HttpError(404, "Order not found");

    const from = current.status;

    if (!canMove(from, to)) {
      throw new HttpError(400, `Can't move an order from ${from} to ${to}`);
    }

    // Only matches if the status is still what we just read.

    const { count } = await tx.order.updateMany({
      where: { id, status: from },
      data: { status: to },
    });

    if (count === 0) {
      throw new HttpError(409, "Someone else just changed this order. Reload and try again.");
    }

    const change = stockChange(from, to);

    if (change === "deduct") {
      for (const item of current.items) {
        // Deduct only if there's enough: the check and the update are one statement.
        const { count } = await tx.product.updateMany({
          where: { id: item.productId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });

        if (count === 0) {
          const p = await tx.product.findUnique({ where: { id: item.productId } });
          throw new HttpError(
            409,
            `Not enough stock for ${p.title} ${p.variant}: ${p.stock} ${p.unit} left, this order needs ${item.quantity}`
          );
        }
      }
    }

    if (change === "restore") {
      for (const item of current.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
    }

    return tx.order.findUnique({ where: { id }, include: orderDetail });
  });

  res.json(withNextStatuses(order));
});

export default router;
