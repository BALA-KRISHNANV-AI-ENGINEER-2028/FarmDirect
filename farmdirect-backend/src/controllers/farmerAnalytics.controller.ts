import type { Request, Response } from "express";
import { getFarmerAnalytics } from "../services/farmerAnalytics.service";

export async function getAnalyticsHandler(req: Request, res: Response): Promise<void> {
  const farmerId = req.user!.id;
  const analytics = await getFarmerAnalytics(farmerId);
  res.json({ data: analytics });
}
