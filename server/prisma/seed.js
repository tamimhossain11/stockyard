// Resets the database to demo data. Safe to re-run: it deletes everything first.
// Run from the server folder: node prisma/seed.js
import bcrypt from "bcryptjs";
import prisma from "../src/db.js";

// Demo logins (these go in the README).
const ADMIN = { email: "admin@stockyard.demo", password: "Admin@1234" };
const MANAGER = { email: "manager@stockyard.demo", password: "Manager@1234" };

// Prices in BDT, per unit. TODO: replace with the real prices and stock from the shop.
const products = [
  { title: "BSRM Rod", variant: "10mm", unit: "ton", price: 96000, stock: 4.5 },
  { title: "BSRM Rod", variant: "12mm", unit: "ton", price: 95000, stock: 6 },
  { title: "BSRM Rod", variant: "16mm", unit: "ton", price: 94500, stock: 3 },
  { title: "Cement", variant: "Shah 50kg", unit: "bag", price: 540, stock: 320 },
  { title: "Cement", variant: "Bashundhara 50kg", unit: "bag", price: 530, stock: 250 },
  { title: "Cement", variant: "Seven Rings 50kg", unit: "bag", price: 550, stock: 180 },
  { title: "Sand", variant: "Sylhet (coarse)", unit: "cft", price: 55, stock: 2400 },
  { title: "Sand", variant: "Local (fine)", unit: "cft", price: 22, stock: 3500 },
  { title: "Stone Chips", variant: "3/4 inch", unit: "cft", price: 210, stock: 1200 },
  { title: "Brick Chips", variant: "1st class", unit: "cft", price: 120, stock: 900 },
  { title: "Brick", variant: "1st class", unit: "piece", price: 14, stock: 25000 },
  { title: "Brick", variant: "Picket", unit: "piece", price: 11, stock: 12000 },
  { title: "Binding Wire", variant: "22 gauge", unit: "piece", price: 180, stock: 60 },
];

async function main() {
  // Children before parents, or the foreign keys block the delete.
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();

  await prisma.user.create({
    data: {
      name: "Shop Admin",
      email: ADMIN.email,
      passwordHash: await bcrypt.hash(ADMIN.password, 10),
      role: "ADMIN",
    },
  });
  await prisma.user.create({
    data: {
      name: "Shop Manager",
      email: MANAGER.email,
      passwordHash: await bcrypt.hash(MANAGER.password, 10),
      role: "MANAGER",
    },
  });

  await prisma.product.createMany({ data: products });

  console.log(`Seeded 2 users and ${products.length} products.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
