-- AlterTable
ALTER TABLE "coupons" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "coupons_storeId_createdAt_idx" ON "coupons"("storeId", "createdAt");
