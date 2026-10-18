/*
  Warnings:

  - A unique constraint covering the columns `[title,variant]` on the table `products` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE UNIQUE INDEX "products_title_variant_key" ON "products"("title", "variant");
