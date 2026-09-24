import { computeFarmerAnalytics, type FarmerAnalyticsSummary } from "../models/analytics.model";

export async function getFarmerAnalytics(farmerId: string, period?: string): Promise<FarmerAnalyticsSummary> {
  return computeFarmerAnalytics(farmerId, period);
}
