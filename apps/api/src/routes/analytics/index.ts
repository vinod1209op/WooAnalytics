import { Router } from "express";
import { registerAovRoute } from "./aov";
import { registerCumulativeRoute } from "./cumulative";
import { registerRollingRoute } from "./rolling";
import { registerTopProductsRoute } from "./products-top";
import { registerRefundsDiscountsRoute } from "./refunds-discounts";
import { registerShippingTaxRoute } from "./shipping-tax";
import { registerNewVsReturningRoute } from "./new-vs-returning";
import { registerRetentionCohortsRoute } from "./retention-cohorts";

export function createAnalyticsRouter() {
  const router = Router();

  registerAovRoute(router);
  registerCumulativeRoute(router);
  registerRollingRoute(router);
  registerTopProductsRoute(router);
  registerRefundsDiscountsRoute(router);
  registerShippingTaxRoute(router);
  registerNewVsReturningRoute(router);
  registerRetentionCohortsRoute(router);

  return router;
}

export default createAnalyticsRouter;
