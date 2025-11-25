import { Router, Request, Response } from "express";
import { prisma } from "../../prisma";
import { round2, ymd } from "./utils";

export function registerRetentionCohortsRoute(router: Router) {
  router.get("/retention/cohorts", async (req: Request, res: Response) => {
    try {
      const { storeId } = req.query as { storeId?: string };

      if (!storeId) {
        return res.status(400).json({ error: "Missing storeId" });
      }

      const rows = await prisma.cohortMonthly.findMany({
        where: { storeId },
        orderBy: [{ cohortMonth: "asc" }, { periodMonth: "asc" }],
      });

      const cohortsMap = new Map<
        string,
        {
          cohortMonth: string;
          customersInCohort: number;
          periods: { periodMonth: number; activeCustomers: number; retentionRate: number }[];
        }
      >();

      for (const row of rows) {
        const cohortKey = ymd(row.cohortMonth);
        const existing =
          cohortsMap.get(cohortKey) ??
          {
            cohortMonth: cohortKey,
            customersInCohort: row.customersInCohort,
            periods: [],
          };

        existing.customersInCohort = row.customersInCohort;
        existing.periods.push({
          periodMonth: row.periodMonth,
          activeCustomers: row.activeCustomers,
          retentionRate: round2(row.retentionRate),
        });

        cohortsMap.set(cohortKey, existing);
      }

      const cohorts = Array.from(cohortsMap.values());

      return res.json({ cohorts });
    } catch (err: any) {
      console.error("GET /analytics/retention/cohorts error:", err);
      return res
        .status(500)
        .json({ error: err?.message ?? "Internal server error" });
    }
  });
}
