import { Router, Request } from "express";
import { registerQuizSyncRoute } from "./quiz-sync";

const router = Router();

function requireCronAuth(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    throw new Error("CRON_SECRET is not configured");
  }
  const authHeader = req.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
  if (!token || token !== secret) {
    throw new Error("Invalid CRON secret");
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

registerQuizSyncRoute(router, { requireCronAuth, sleep });

export default router;
