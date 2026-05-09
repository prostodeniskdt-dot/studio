-- CreateEnum
CREATE TYPE "InventoryStockMode" AS ENUM ('volume_ml', 'pieces');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "externalCode" TEXT,
ADD COLUMN     "barcode" TEXT,
ADD COLUMN     "usesVolumeCalculator" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "InventorySession" ADD COLUMN     "importListHash" TEXT;

-- AlterTable
ALTER TABLE "InventoryLine" ADD COLUMN     "stockMode" "InventoryStockMode" NOT NULL DEFAULT 'volume_ml';

-- CreateIndex
CREATE INDEX "Product_barId_externalCode_idx" ON "Product"("barId", "externalCode");

-- CreateIndex
CREATE INDEX "Product_barId_barcode_idx" ON "Product"("barId", "barcode");

-- CreateIndex
CREATE INDEX "InventorySession_barId_importListHash_idx" ON "InventorySession"("barId", "importListHash");
