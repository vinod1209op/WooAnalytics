import { Router } from "express";
import { registerInactiveRoute } from "./inactive";
import { registerLastOrderRoute } from "./last-order";
import { registerWinbackRoute } from "./winback";

const router = Router();

registerInactiveRoute(router);
registerLastOrderRoute(router);
registerWinbackRoute(router);

export default router;
