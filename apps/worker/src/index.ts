import "dotenv/config";
import express, { type Request, type Response } from "express";
import { serve } from "inngest/express";
import { inngest } from "./inngest/client";
import { functions } from "./inngest/functions";

const app = express();

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.use(
  "/api/inngest",
  serve({
    client: inngest,
    functions,
  })
);

const PORT = Number(process.env.PORT ?? 3333);

app.listen(PORT, () => {
  console.log(`Worker listening on port ${PORT}`);
});
