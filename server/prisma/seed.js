import bcrypt from "bcryptjs";
import prisma from "../src/db.js";
import { startOfWeek, WEEK_MS } from "../src/lib/forecast.js";

// Demo logins
const ADMIN = { email: "admin@stockyard.demo", password: "Admin@1234" };
const MANAGER = { email: "manager@stockyard.demo", password: "Manager@1234" };


const products = [
  { title: "BSRM Rod", variant: "10mm", unit: "ton", price: 96000, stock: 4.5, weekly: 1.5, growth: 1, step: 0.5 },
  { title: "BSRM Rod", variant: "12mm", unit: "ton", price: 95000, stock: 6, weekly: 2, growth: 2, step: 0.5 },
  { title: "BSRM Rod", variant: "16mm", unit: "ton", price: 94500, stock: 3, weekly: 1, growth: 1, step: 0.5 },
  { title: "Cement", variant: "Shah 50kg", unit: "bag", price: 540, stock: 320, weekly: 120, growth: 2.2, step: 5 },
  { title: "Cement", variant: "Bashundhara 50kg", unit: "bag", price: 530, stock: 250, weekly: 140, growth: 1, step: 5 },
  { title: "Cement", variant: "Seven Rings 50kg", unit: "bag", price: 550, stock: 180, weekly: 60, growth: 1, step: 5 },
  { title: "Sand", variant: "Sylhet (coarse)", unit: "cft", price: 55, stock: 2400, weekly: 900, growth: 1, step: 10 },
  { title: "Sand", variant: "Local (fine)", unit: "cft", price: 22, stock: 3500, weekly: 1200, growth: 1, step: 10 },
  { title: "Stone Chips", variant: "3/4 inch", unit: "cft", price: 210, stock: 1200, weekly: 300, growth: 2.3, step: 10 },
  { title: "Brick Chips", variant: "1st class", unit: "cft", price: 120, stock: 900, weekly: 250, growth: 1, step: 10 },
  { title: "Brick", variant: "1st class", unit: "piece", price: 14, stock: 25000, weekly: 8000, growth: 1, step: 500 },
  { title: "Brick", variant: "Picket", unit: "piece", price: 11, stock: 12000, weekly: 3000, growth: 1, step: 500 },
  { title: "Binding Wire", variant: "22 gauge", unit: "piece", price: 180, stock: 60, weekly: 12, growth: 1, step: 1 },
];

const HISTORY_WEEKS = 12;
const CANCEL_RATE = 0.08;

const customers = [
  ["Rahman Builders", "01711-234567"],
  ["Karim Construction", "01819-345678"],
  ["Hasan Enterprise", "01912-456789"],
  ["Mollah Developers", "01615-567890"],
  ["Nur Traders", "01556-678901"],
  ["Alam & Sons", "01713-789012"],
  ["Mr. Jalal (house)", "01822-890123"],
  ["Mrs. Rokeya (house)", "01933-901234"],
  ["Sikder Housing", "01744-112233"],
  ["Bhuiyan Contractors", "01855-223344"],
];


let randomState = 20261019;
function random() {
  randomState = (randomState + 0x6d2b79f5) | 0;
  let t = Math.imul(randomState ^ (randomState >>> 15), 1 | randomState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const between = (min, max) => min + random() * (max - min);
const pick = (list) => list[Math.floor(random() * list.length)];
const roundToStep = (value, step) => Math.max(step, Math.round(value / step) * step);

// Shuffle and group sale lines into orders of 1–3 items
function groupIntoOrders(lines) {
  const shuffled = [...lines].sort(() => random() - 0.5);
  const orders = [];
  let current = [];
  let size = 1 + Math.floor(random() * 3);

  for (const line of shuffled) {
    const duplicate = current.some((l) => l.product.id === line.product.id);
    if (current.length === size || duplicate) {
      orders.push(current);
      current = [];
      size = 1 + Math.floor(random() * 3);
    }
    current.push(line);
  }
  if (current.length) orders.push(current);
  return orders;
}

// A time during shop hours 
function timeInWeek(weekStart, maxTime = Infinity) {
  const day = Math.floor(random() * 7);
  const minutes = 3 * 60 + Math.floor(random() * 10 * 60);
  const time = weekStart.getTime() + day * 86_400_000 + minutes * 60_000;
  return new Date(Math.min(time, maxTime));
}

async function createOrder({ lines, status, createdAt, createdById }) {
  const [customerName, customerPhone] = pick(customers);
  const items = lines.map(({ product, quantity }) => ({
    productId: product.id,
    quantity,
    unitPrice: product.price,
  }));
  const total = items.reduce((sum, i) => sum + Number(i.unitPrice) * i.quantity, 0);

  await prisma.order.create({
    data: {
      customerName,
      customerPhone,
      status,
      createdAt,
      createdById,
      total: Math.round(total * 100) / 100,
      items: { create: items },
    },
  });
}

async function main() {
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();

  const admin = await prisma.user.create({
    data: {
      name: "Shop Admin",
      email: ADMIN.email,
      passwordHash: await bcrypt.hash(ADMIN.password, 10),
      role: "ADMIN",
    },
  });
  const manager = await prisma.user.create({
    data: {
      name: "Shop Manager",
      email: MANAGER.email,
      passwordHash: await bcrypt.hash(MANAGER.password, 10),
      role: "MANAGER",
    },
  });
  const staff = [admin.id, manager.id];

  const created = [];
  for (const { weekly, growth, step, ...data } of products) {
    const product = await prisma.product.create({ data });
    created.push({ product, weekly, growth, step });
  }

  // Past orders: 12 full weeks before the current week.
  const now = new Date();
  const thisWeek = startOfWeek(now);
  let orderCount = 0;

  for (let w = 0; w < HISTORY_WEEKS; w++) {
    const weekStart = new Date(thisWeek.getTime() - (HISTORY_WEEKS - w) * WEEK_MS);
    const lines = [];

    for (const { product, weekly, growth, step } of created) {
      const trend = 1 + (growth - 1) * (w / (HISTORY_WEEKS - 1));
      let remaining = weekly * trend * between(0.7, 1.3);


      const parts = 2 + Math.floor(random() * 3);
      for (let i = 0; i < parts && remaining >= step / 2; i++) {
        const share = i === parts - 1 ? remaining : remaining * between(0.2, 0.5);
        const quantity = roundToStep(share, step);
        lines.push({ product, quantity });
        remaining -= quantity;
      }
    }

    for (const orderLines of groupIntoOrders(lines)) {
      await createOrder({
        lines: orderLines,
        status: random() < CANCEL_RATE ? "CANCELLED" : "DELIVERED",
        createdAt: timeInWeek(weekStart),
        createdById: pick(staff),
      });
      orderCount++;
    }
  }

  // A few orders this week, so the status buttons have something to work on.
  const byName = (title, variant) => created.find((c) => c.product.title === title && c.product.variant === variant).product;
  const openOrders = [
    { status: "PENDING", lines: [{ product: byName("Cement", "Shah 50kg"), quantity: 50 }, { product: byName("Sand", "Sylhet (coarse)"), quantity: 200 }] },
    { status: "PENDING", lines: [{ product: byName("BSRM Rod", "12mm"), quantity: 1.5 }] },
    { status: "CONFIRMED", lines: [{ product: byName("Brick", "1st class"), quantity: 3000 }, { product: byName("Stone Chips", "3/4 inch"), quantity: 100 }] },
  ];
  for (const order of openOrders) {
    await createOrder({
      ...order,
      createdAt: timeInWeek(thisWeek, now.getTime()),
      createdById: pick(staff),
    });
    orderCount++;

    // A confirmed order has already taken its items out of stock, same as the status route does.
    if (order.status === "CONFIRMED") {
      for (const { product, quantity } of order.lines) {
        await prisma.product.update({
          where: { id: product.id },
          data: { stock: { decrement: quantity } },
        });
      }
    }
  }

  console.log(`Seeded 2 users, ${created.length} products and ${orderCount} orders.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
