import express from "express";
import { serve } from "inngest/express";
import type { VercelRequest, VercelResponse } from "@vercel/node";

import { inngest } from "../src/inngest/client";
import { functions } from "../src/inngest/functions";

// Create an Express app for this one function
const app = express();

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Mount Inngest at the root of this function
app.use(
  serve({
    client: inngest,
    functions,
  })
);

// Export a Vercel serverless function handler
export default function handler(req: VercelRequest, res: VercelResponse) {
  // Express apps are just (req, res) handlers
  return app(req as any, res as any);
}
