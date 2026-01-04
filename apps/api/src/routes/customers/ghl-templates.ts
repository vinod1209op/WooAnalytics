import { Router, Request, Response } from "express";
import { listEmailTemplates } from "../../lib/ghl";

export function registerGhlEmailTemplatesRoute(router: Router) {
  router.get("/ghl-email-templates", async (req: Request, res: Response) => {
    try {
      if (!process.env.GHL_PIT) {
        return res.status(400).json({ error: "GHL_PIT is not configured" });
      }

      const locationId =
        typeof req.query?.locationId === "string" && req.query.locationId.trim()
          ? req.query.locationId.trim()
          : process.env.GHL_LOCATION_ID;
      if (!locationId) {
        return res.status(400).json({ error: "GHL_LOCATION_ID is required" });
      }

      const limit = Number(req.query?.limit) || 3;
      const debug =
        typeof req.query?.debug === "string" && req.query.debug === "1";
      const result = await listEmailTemplates({ locationId, limit, debug });

      return res.json(result);
    } catch (err: any) {
      console.error("GET /customers/ghl-email-templates error:", err);
      return res.status(500).json({ error: err?.message ?? "Internal error" });
    }
  });
}
