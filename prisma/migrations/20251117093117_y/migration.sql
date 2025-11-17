-- CreateTable
CREATE TABLE "stores" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "wooBaseUrl" TEXT NOT NULL,
    "wooKey" TEXT NOT NULL,
    "wooSecret" TEXT NOT NULL,
    "webhookSecret" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" SERIAL NOT NULL,
    "storeId" TEXT NOT NULL,
    "wooId" TEXT,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" TIMESTAMP(3),

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" SERIAL NOT NULL,
    "storeId" TEXT NOT NULL,
    "wooId" TEXT,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "status" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_categories" (
    "id" SERIAL NOT NULL,
    "storeId" TEXT NOT NULL,
    "wooId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "parentId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_category_links" (
    "productId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,

    CONSTRAINT "product_category_links_pkey" PRIMARY KEY ("productId","categoryId")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" SERIAL NOT NULL,
    "storeId" TEXT NOT NULL,
    "wooId" TEXT,
    "customerId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT,
    "currency" TEXT,
    "total" DOUBLE PRECISION NOT NULL,
    "subtotal" DOUBLE PRECISION,
    "discountTotal" DOUBLE PRECISION,
    "shippingTotal" DOUBLE PRECISION,
    "taxTotal" DOUBLE PRECISION,
    "paymentMethod" TEXT,
    "shippingCountry" TEXT,
    "shippingCity" TEXT,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "productId" INTEGER,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION,
    "lineSubtotal" DOUBLE PRECISION,
    "lineTotal" DOUBLE PRECISION,
    "taxTotal" DOUBLE PRECISION,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupons" (
    "id" SERIAL NOT NULL,
    "storeId" TEXT NOT NULL,
    "wooId" TEXT,
    "code" TEXT NOT NULL,
    "discountType" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "dateExpires" TIMESTAMP(3),
    "usageLimit" INTEGER,
    "usageCount" INTEGER,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_coupons" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "couponId" INTEGER NOT NULL,
    "discountApplied" DOUBLE PRECISION NOT NULL,
    "revenueImpact" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "order_coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" SERIAL NOT NULL,
    "storeId" TEXT NOT NULL,
    "wooId" TEXT,
    "customerId" INTEGER NOT NULL,
    "productId" INTEGER,
    "status" TEXT NOT NULL,
    "billingInterval" INTEGER NOT NULL,
    "billingPeriod" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "nextPaymentAt" TIMESTAMP(3),
    "recurringAmount" DOUBLE PRECISION,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" SERIAL NOT NULL,
    "storeId" TEXT NOT NULL,
    "wooId" TEXT,
    "orderId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reconciliations" (
    "id" SERIAL NOT NULL,
    "storeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "wooOrders" INTEGER NOT NULL,
    "wooRevenue" DOUBLE PRECISION NOT NULL,
    "dbOrders" INTEGER NOT NULL,
    "dbRevenue" DOUBLE PRECISION NOT NULL,
    "diffRevenue" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reconciliations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_attributions" (
    "orderId" INTEGER NOT NULL,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmTerm" TEXT,
    "utmContent" TEXT,

    CONSTRAINT "order_attributions_pkey" PRIMARY KEY ("orderId")
);

-- CreateTable
CREATE TABLE "customer_acquisition" (
    "customerId" INTEGER NOT NULL,
    "storeId" TEXT NOT NULL,
    "firstOrderId" INTEGER NOT NULL,
    "firstOrderDate" TIMESTAMP(3) NOT NULL,
    "firstUtmSource" TEXT,
    "firstUtmMedium" TEXT,
    "firstUtmCampaign" TEXT,

    CONSTRAINT "customer_acquisition_pkey" PRIMARY KEY ("customerId")
);

-- CreateTable
CREATE TABLE "daily_summaries" (
    "id" SERIAL NOT NULL,
    "storeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "ordersCount" INTEGER NOT NULL,
    "revenue" DOUBLE PRECISION NOT NULL,
    "units" INTEGER NOT NULL,
    "uniqueCustomers" INTEGER NOT NULL,
    "aov" DOUBLE PRECISION NOT NULL,
    "refundsAmount" DOUBLE PRECISION,
    "netRevenue" DOUBLE PRECISION,

    CONSTRAINT "daily_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_scores" (
    "customerId" INTEGER NOT NULL,
    "storeId" TEXT NOT NULL,
    "lastOrderAt" TIMESTAMP(3),
    "frequency" INTEGER,
    "monetary" DOUBLE PRECISION,
    "recencyDays" INTEGER,
    "rfmScore" INTEGER,
    "segment" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_scores_pkey" PRIMARY KEY ("customerId")
);

-- CreateTable
CREATE TABLE "cohort_monthly" (
    "id" SERIAL NOT NULL,
    "storeId" TEXT NOT NULL,
    "cohortMonth" DATE NOT NULL,
    "periodMonth" INTEGER NOT NULL,
    "customersInCohort" INTEGER NOT NULL,
    "activeCustomers" INTEGER NOT NULL,
    "retentionRate" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "cohort_monthly_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stores_wooBaseUrl_key" ON "stores"("wooBaseUrl");

-- CreateIndex
CREATE INDEX "customers_storeId_email_idx" ON "customers"("storeId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "customers_store_email_uq" ON "customers"("storeId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "customers_store_wooid_uq" ON "customers"("storeId", "wooId");

-- CreateIndex
CREATE INDEX "products_storeId_name_idx" ON "products"("storeId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "products_store_sku_uq" ON "products"("storeId", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "products_store_wooid_uq" ON "products"("storeId", "wooId");

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_store_name_uq" ON "product_categories"("storeId", "name");

-- CreateIndex
CREATE INDEX "orders_storeId_createdAt_idx" ON "orders"("storeId", "createdAt");

-- CreateIndex
CREATE INDEX "orders_storeId_status_idx" ON "orders"("storeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "orders_store_wooid_uq" ON "orders"("storeId", "wooId");

-- CreateIndex
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");

-- CreateIndex
CREATE INDEX "order_items_productId_idx" ON "order_items"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_store_code_uq" ON "coupons"("storeId", "code");

-- CreateIndex
CREATE INDEX "order_coupons_orderId_idx" ON "order_coupons"("orderId");

-- CreateIndex
CREATE INDEX "order_coupons_couponId_idx" ON "order_coupons"("couponId");

-- CreateIndex
CREATE INDEX "subscriptions_storeId_status_idx" ON "subscriptions"("storeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_store_wooid_uq" ON "subscriptions"("storeId", "wooId");

-- CreateIndex
CREATE INDEX "refunds_storeId_createdAt_idx" ON "refunds"("storeId", "createdAt");

-- CreateIndex
CREATE INDEX "reconciliations_storeId_date_idx" ON "reconciliations"("storeId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "reconciliations_store_date_uq" ON "reconciliations"("storeId", "date");

-- CreateIndex
CREATE INDEX "customer_acquisition_storeId_firstOrderDate_idx" ON "customer_acquisition"("storeId", "firstOrderDate");

-- CreateIndex
CREATE INDEX "daily_summaries_storeId_date_idx" ON "daily_summaries"("storeId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_summary_store_date_uq" ON "daily_summaries"("storeId", "date");

-- CreateIndex
CREATE INDEX "customer_scores_storeId_segment_idx" ON "customer_scores"("storeId", "segment");

-- CreateIndex
CREATE INDEX "cohort_monthly_storeId_cohortMonth_idx" ON "cohort_monthly"("storeId", "cohortMonth");

-- CreateIndex
CREATE UNIQUE INDEX "cohort_store_cohort_period_uq" ON "cohort_monthly"("storeId", "cohortMonth", "periodMonth");

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_category_links" ADD CONSTRAINT "product_category_links_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_category_links" ADD CONSTRAINT "product_category_links_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "product_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_coupons" ADD CONSTRAINT "order_coupons_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_coupons" ADD CONSTRAINT "order_coupons_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "coupons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliations" ADD CONSTRAINT "reconciliations_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_attributions" ADD CONSTRAINT "order_attributions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_acquisition" ADD CONSTRAINT "customer_acquisition_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_acquisition" ADD CONSTRAINT "customer_acquisition_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_acquisition" ADD CONSTRAINT "customer_acquisition_firstOrderId_fkey" FOREIGN KEY ("firstOrderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_summaries" ADD CONSTRAINT "daily_summaries_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_scores" ADD CONSTRAINT "customer_scores_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_scores" ADD CONSTRAINT "customer_scores_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cohort_monthly" ADD CONSTRAINT "cohort_monthly_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
