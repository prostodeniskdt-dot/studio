-- This migration was generated via `prisma migrate diff --from-empty`.
-- It initializes the Postgres schema from scratch.

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'manager', 'bartender');

-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('Whiskey', 'Rum', 'Vodka', 'Gin', 'Tequila', 'Liqueur', 'Wine', 'Beer', 'Syrup', 'Brandy', 'Vermouth', 'Absinthe', 'Bitters', 'Premix', 'Other');

-- CreateEnum
CREATE TYPE "InventorySessionStatus" AS ENUM ('draft', 'in_progress', 'completed');

-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('draft', 'ordered', 'partially_received', 'received', 'cancelled');

-- CreateTable
CREATE TABLE "AuthUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "city" TEXT,
    "establishment" TEXT,
    "phone" TEXT,
    "socialLink" TEXT,
    "isBanned" BOOLEAN NOT NULL DEFAULT false,
    "consents" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bar" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "ownerUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "ProductCategory" NOT NULL,
    "subCategory" TEXT,
    "imageUrl" TEXT,
    "costPerBottle" DOUBLE PRECISION,
    "sellingPricePerPortion" DOUBLE PRECISION,
    "portionVolumeMl" DOUBLE PRECISION,
    "bottleVolumeMl" DOUBLE PRECISION NOT NULL,
    "fullBottleWeightG" DOUBLE PRECISION,
    "emptyBottleWeightG" DOUBLE PRECISION,
    "reorderPointMl" DOUBLE PRECISION,
    "reorderQuantity" DOUBLE PRECISION,
    "defaultSupplierId" TEXT,
    "isPremix" BOOLEAN NOT NULL DEFAULT false,
    "costCalculationMode" TEXT,
    "isInLibrary" BOOLEAN NOT NULL DEFAULT false,
    "createdByUserId" TEXT,
    "barId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PremixIngredient" (
    "id" TEXT NOT NULL,
    "premixId" TEXT NOT NULL,
    "ingredientProductId" TEXT NOT NULL,
    "volumeMl" DOUBLE PRECISION NOT NULL,
    "ratio" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PremixIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "barId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactPerson" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "barId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'draft',
    "orderDate" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "expectedDeliveryDate" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "totalAmount" DOUBLE PRECISION,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderLine" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "costPerItem" DOUBLE PRECISION NOT NULL,
    "receivedQuantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventorySession" (
    "id" TEXT NOT NULL,
    "barId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "InventorySessionStatus" NOT NULL DEFAULT 'draft',
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventorySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryLine" (
    "id" TEXT NOT NULL,
    "inventorySessionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "startStock" DOUBLE PRECISION NOT NULL,
    "purchases" DOUBLE PRECISION NOT NULL,
    "endStock" DOUBLE PRECISION NOT NULL,
    "sales" DOUBLE PRECISION NOT NULL,
    "theoreticalEndStock" DOUBLE PRECISION NOT NULL,
    "differenceVolume" DOUBLE PRECISION NOT NULL,
    "differenceMoney" DOUBLE PRECISION NOT NULL,
    "differencePercent" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuthUser_email_key" ON "AuthUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AuthSession_tokenHash_key" ON "AuthSession"("tokenHash");

-- CreateIndex
CREATE INDEX "AuthSession_userId_idx" ON "AuthSession"("userId");

-- CreateIndex
CREATE INDEX "AuthSession_expiresAt_idx" ON "AuthSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_email_key" ON "UserProfile"("email");

-- CreateIndex
CREATE INDEX "Bar_ownerUserId_idx" ON "Bar"("ownerUserId");

-- CreateIndex
CREATE INDEX "Product_barId_idx" ON "Product"("barId");

-- CreateIndex
CREATE INDEX "Product_defaultSupplierId_idx" ON "Product"("defaultSupplierId");

-- CreateIndex
CREATE INDEX "Product_category_idx" ON "Product"("category");

-- CreateIndex
CREATE INDEX "PremixIngredient_premixId_idx" ON "PremixIngredient"("premixId");

-- CreateIndex
CREATE INDEX "PremixIngredient_ingredientProductId_idx" ON "PremixIngredient"("ingredientProductId");

-- CreateIndex
CREATE UNIQUE INDEX "PremixIngredient_premixId_ingredientProductId_key" ON "PremixIngredient"("premixId", "ingredientProductId");

-- CreateIndex
CREATE INDEX "Supplier_barId_idx" ON "Supplier"("barId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_barId_idx" ON "PurchaseOrder"("barId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_supplierId_idx" ON "PurchaseOrder"("supplierId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_createdByUserId_idx" ON "PurchaseOrder"("createdByUserId");

-- CreateIndex
CREATE INDEX "PurchaseOrderLine_purchaseOrderId_idx" ON "PurchaseOrderLine"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "PurchaseOrderLine_productId_idx" ON "PurchaseOrderLine"("productId");

-- CreateIndex
CREATE INDEX "InventorySession_barId_idx" ON "InventorySession"("barId");

-- CreateIndex
CREATE INDEX "InventorySession_createdByUserId_idx" ON "InventorySession"("createdByUserId");

-- CreateIndex
CREATE INDEX "InventoryLine_inventorySessionId_idx" ON "InventoryLine"("inventorySessionId");

-- CreateIndex
CREATE INDEX "InventoryLine_productId_idx" ON "InventoryLine"("productId");

-- AddForeignKey
ALTER TABLE "AuthUser" ADD CONSTRAINT "AuthUser_id_fkey" FOREIGN KEY ("id") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AuthUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AuthUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bar" ADD CONSTRAINT "Bar_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_defaultSupplierId_fkey" FOREIGN KEY ("defaultSupplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_barId_fkey" FOREIGN KEY ("barId") REFERENCES "Bar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PremixIngredient" ADD CONSTRAINT "PremixIngredient_premixId_fkey" FOREIGN KEY ("premixId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PremixIngredient" ADD CONSTRAINT "PremixIngredient_ingredientProductId_fkey" FOREIGN KEY ("ingredientProductId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_barId_fkey" FOREIGN KEY ("barId") REFERENCES "Bar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_barId_fkey" FOREIGN KEY ("barId") REFERENCES "Bar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventorySession" ADD CONSTRAINT "InventorySession_barId_fkey" FOREIGN KEY ("barId") REFERENCES "Bar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLine" ADD CONSTRAINT "InventoryLine_inventorySessionId_fkey" FOREIGN KEY ("inventorySessionId") REFERENCES "InventorySession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLine" ADD CONSTRAINT "InventoryLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

