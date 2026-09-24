import type { Request, Response } from "express";
import { getFarmerAIInsights } from "../services/farmerAIInsights.service";

export async function getAIInsightsHandler(req: Request, res: Response): Promise<void> {
  const farmerId = req.user!.id;
  const period = typeof req.query.period === "string" ? req.query.period : undefined;
  const result = await getFarmerAIInsights(farmerId, period);
  res.json({ success: true, data: result });
}

export async function refreshAIInsightsHandler(req: Request, res: Response): Promise<void> {
  const farmerId = req.user!.id;
  const period = typeof req.query.period === "string" ? req.query.period : undefined;
  const result = await getFarmerAIInsights(farmerId, period);
  res.json({ success: true, data: result });
}
