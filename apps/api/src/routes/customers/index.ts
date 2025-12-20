import { Router } from "express";
import { registerInactiveRoute } from "./inactive";
import { registerLastOrderRoute } from "./last-order";
import { registerWinbackRoute } from "./winback";
import { registerRfmIdleRoute } from "./rfm-idle";

const router = Router();

registerInactiveRoute(router);
registerLastOrderRoute(router);
registerWinbackRoute(router);
registerRfmIdleRoute(router);

export default router;
