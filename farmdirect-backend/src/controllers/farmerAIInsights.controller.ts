import type { Request, Response } from "express";
import { getFarmerAIInsights } from "../services/farmerAIInsights.service";

export async function getAIInsightsHandler(req: Request, res: Response): Promise<void> {
  const farmerId = req.user!.id;
  const insights = await getFarmerAIInsights(farmerId);
  res.json({ data: insights });
}

export async function refreshAIInsightsHandler(req: Request, res: Response): Promise<void> {
  const farmerId = req.user!.id;
  const insights = await getFarmerAIInsights(farmerId);
  res.json({ data: insights });
}
