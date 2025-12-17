import { Router } from "express";
import { handleAssistantQuery } from "./assistant/handlers";

const router = Router();

// Mounted at /assistant -> POST /assistant/query
router.post("/query", handleAssistantQuery);

export default router;
