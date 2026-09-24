import { api } from "./apiClient";
import type { AnalyticsPeriod } from "./farmerAnalyticsApi";

export interface AIInsightItem {
  id: string;
  type: "growth" | "inventory" | "sales" | "demand" | "price" | "risk" | "opportunity" | "customers";
  title: string;
  message?: string;
  explanation: string;
  evidence: string[];
  recommendation: string;
  confidence: "high" | "medium";
  icon: string;
  action?: {
    label: string;
    link: string;
  };
  impact?: string;
  generatedAt: string;
}

export interface FarmerAIInsightsData {
  summary: string;
  insights: AIInsightItem[];
  generatedAt: string;
  periodLabel: string;
}

export async function fetchFarmerAIInsights(period: AnalyticsPeriod = "30d"): Promise<FarmerAIInsightsData> {
  const res = await api.get<{ data: FarmerAIInsightsData | AIInsightItem[] }>(`/farmer/ai-insights?period=${period}`);
  const data = res.data;
  if (Array.isArray(data)) {
    return {
      summary: "AI insights generated from verified farm analytics and inventory data.",
      insights: data,
      generatedAt: new Date().toISOString(),
      periodLabel: "Last 30 days",
    };
  }
  return data;
}

export async function refreshFarmerAIInsights(period: AnalyticsPeriod = "30d"): Promise<FarmerAIInsightsData> {
  const res = await api.post<{ data: FarmerAIInsightsData | AIInsightItem[] }>(`/farmer/ai-insights/refresh?period=${period}`);
  const data = res.data;
  if (Array.isArray(data)) {
    return {
      summary: "AI insights refreshed from verified farm analytics and inventory data.",
      insights: data,
      generatedAt: new Date().toISOString(),
      periodLabel: "Last 30 days",
    };
  }
  return data;
}
