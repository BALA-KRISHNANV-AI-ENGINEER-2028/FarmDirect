import { api } from "./apiClient";

export interface AIInsightItem {
  id: string;
  type: "demand" | "price" | "inventory" | "sales";
  title: string;
  message: string;
  icon: string;
  action?: {
    label: string;
    link: string;
  };
  impact?: string;
  generatedAt: string;
}

export async function fetchFarmerAIInsights(): Promise<AIInsightItem[]> {
  const res = await api.get<{ data: AIInsightItem[] }>("/farmer/ai-insights");
  return res.data;
}

export async function refreshFarmerAIInsights(): Promise<AIInsightItem[]> {
  const res = await api.post<{ data: AIInsightItem[] }>("/farmer/ai-insights/refresh");
  return res.data;
}
