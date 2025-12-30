-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "billingEmail" TEXT;

-- CreateIndex
CREATE INDEX "orders_storeId_billingEmail_idx" ON "orders"("storeId", "billingEmail");
