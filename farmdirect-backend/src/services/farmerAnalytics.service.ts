import { computeFarmerAnalytics, type FarmerAnalyticsSummary } from "../models/analytics.model";

export async function getFarmerAnalytics(farmerId: string): Promise<FarmerAnalyticsSummary> {
  return computeFarmerAnalytics(farmerId);
}
