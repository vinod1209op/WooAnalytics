-- CreateIndex
CREATE INDEX "orders_storeId_customerId_createdAt_idx" ON "orders"("storeId", "customerId", "createdAt");
