import { Router } from "express";
import { registerInactiveRoute } from "./inactive";
import { registerLastOrderRoute } from "./last-order";
import { registerCustomerProfileRoute } from "./profile";
import { registerWinbackRoute } from "./winback";
import { registerRfmIdleRoute } from "./rfm-idle";
import { registerGhlCustomersRoute } from "./ghl";
import { registerGhlIdleCustomersRoute } from "./ghl-idle";
import { registerGhlActionsRoute } from "./ghl-actions";

const router = Router();

registerInactiveRoute(router);
registerLastOrderRoute(router);
registerCustomerProfileRoute(router);
registerWinbackRoute(router);
registerRfmIdleRoute(router);
registerGhlCustomersRoute(router);
registerGhlIdleCustomersRoute(router);
registerGhlActionsRoute(router);

export default router;
