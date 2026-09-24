import type { Request, Response } from "express";
import { getFarmerAnalytics } from "../services/farmerAnalytics.service";

export async function getAnalyticsHandler(req: Request, res: Response): Promise<void> {
  const farmerId = req.user!.id;
  const period = typeof req.query.period === "string" ? req.query.period : undefined;
  const analytics = await getFarmerAnalytics(farmerId, period);
  res.json({ success: true, data: analytics });
}
