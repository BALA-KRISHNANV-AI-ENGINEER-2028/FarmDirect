import { api } from "./apiClient";

export type AnalyticsPeriod = "7d" | "30d" | "90d" | "year";

export interface RevenueTrendPoint {
  date: string;
  revenue: number;
  orders: number;
}

export interface OrdersTrendPoint {
  date: string;
  orders: number;
}

export interface BestSellerProduct {
  id: string;
  name: string;
  category?: string;
  unitsSold: number;
  revenue: number;
}

export interface PeriodInfo {
  from: string;
  to: string;
  label: string;
  periodKey: AnalyticsPeriod;
}

export interface AnalyticsSummary {
  totalRevenue: number;
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  processingOrders: number;
  cancelledOrders: number;
  averageOrderValue: number;
  totalProducts: number;
  activeProducts: number;
  lowStockProducts: number;
  totalCustomers: number;
  revenueGrowth: number;
  ordersGrowth: number;
}

export interface OrderStatusPoint {
  status: string;
  label: string;
  count: number;
  percentage: number;
}

export interface AttentionItem {
  id: string;
  name: string;
  stock: number;
  unit: string;
  threshold: number;
  status: string;
  farmName?: string;
}

export interface InventorySummary {
  healthyStock: number;
  lowStock: number;
  outOfStock: number;
  totalStockUnits: number;
  itemsRequiringAttention: AttentionItem[];
}

export interface CustomerSummary {
  total: number;
  new: number;
  repeat: number;
  repeatRate: number;
}

export interface CategoryPerformancePoint {
  category: string;
  revenue: number;
  unitsSold: number;
  productsCount: number;
}

export interface RecentOrderPoint {
  id: string;
  orderNumber: string;
  date: string;
  customerName: string;
  amount: number;
  status: string;
  itemsCount: number;
}

export interface FarmerAnalyticsData {
  period: PeriodInfo;
  summary: AnalyticsSummary;
  revenueTrend: RevenueTrendPoint[];
  ordersTrend: OrdersTrendPoint[];
  topProducts: BestSellerProduct[];
  orderStatusDistribution: OrderStatusPoint[];
  inventorySummary: InventorySummary;
  customerSummary: CustomerSummary;
  categoryPerformance: CategoryPerformancePoint[];
  recentOrders: RecentOrderPoint[];

  // Legacy/convenience fields
  revenue30d: number;
  revenueTrendPercent: number;
  orders30d: number;
  ordersTrendPercent: number;
  productsSold: number;
  productsSoldTrendPercent: number;
  newCustomers: number;
  newCustomersTrendPercent: number;
  bestSellers: BestSellerProduct[];
  performance: {
    repeatPurchaseRate: number;
    averageOrderValue: number;
    customerGrowthRate: number;
    averageRating: number;
  };
}

export async function fetchFarmerAnalytics(period: AnalyticsPeriod = "30d"): Promise<FarmerAnalyticsData> {
  const res = await api.get<{ data: FarmerAnalyticsData }>(`/farmer/analytics?period=${period}`);
  return res.data;
}
