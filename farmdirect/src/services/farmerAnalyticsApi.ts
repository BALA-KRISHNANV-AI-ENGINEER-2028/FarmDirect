import { api } from "./apiClient";

export interface RevenueTrendPoint {
  date: string;
  revenue: number;
  orders: number;
}

export interface BestSellerProduct {
  id: string;
  name: string;
  unitsSold: number;
  revenue: number;
}

export interface FarmerAnalyticsData {
  revenue30d: number;
  revenueTrendPercent: number;
  orders30d: number;
  ordersTrendPercent: number;
  productsSold: number;
  productsSoldTrendPercent: number;
  newCustomers: number;
  newCustomersTrendPercent: number;
  revenueTrend: RevenueTrendPoint[];
  bestSellers: BestSellerProduct[];
  performance: {
    repeatPurchaseRate: number;
    averageOrderValue: number;
    customerGrowthRate: number;
    averageRating: number;
  };
}

export async function fetchFarmerAnalytics(): Promise<FarmerAnalyticsData> {
  const res = await api.get<{ data: FarmerAnalyticsData }>("/farmer/analytics");
  return res.data;
}
