import { GoogleGenAI } from "@google/genai";
import { computeFarmerAnalytics, type FarmerAnalyticsSummary } from "../models/analytics.model";

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

export interface FarmerAIInsightsResult {
  summary: string;
  insights: AIInsightItem[];
  generatedAt: string;
  periodLabel: string;
}

let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

function mapInsightIcon(type: string): string {
  switch (type) {
    case "growth":
      return "trending_up";
    case "inventory":
      return "inventory_2";
    case "sales":
      return "receipt_long";
    case "demand":
      return "insights";
    case "price":
      return "sell";
    case "risk":
      return "warning";
    case "opportunity":
      return "lightbulb";
    case "customers":
      return "group";
    default:
      return "auto_awesome";
  }
}

function getDefaultActionForType(type: string): { label: string; link: string } {
  switch (type) {
    case "inventory":
      return { label: "Manage Inventory", link: "/farmer/inventory" };
    case "price":
    case "growth":
      return { label: "Review Products", link: "/farmer/products" };
    case "orders":
    case "sales":
      return { label: "View Orders", link: "/farmer/orders" };
    case "customers":
      return { label: "Open Analytics", link: "/farmer/analytics" };
    default:
      return { label: "View Analytics", link: "/farmer/analytics" };
  }
}

export async function getFarmerAIInsights(
  farmerId: string,
  periodParam: string = "30d"
): Promise<FarmerAIInsightsResult> {
  const analytics: FarmerAnalyticsSummary = await computeFarmerAnalytics(farmerId, periodParam);
  const now = new Date().toISOString();
  const periodLabel = analytics.period.label;

  // Prepare structured factual payload to send to Gemini
  const structuredMetrics = {
    period: periodLabel,
    revenue: {
      current: analytics.summary.totalRevenue,
      growthPercent: analytics.summary.revenueGrowth,
      averageOrderValue: analytics.summary.averageOrderValue,
    },
    orders: {
      total: analytics.summary.totalOrders,
      completed: analytics.summary.completedOrders,
      processing: analytics.summary.processingOrders,
      pending: analytics.summary.pendingOrders,
      cancelled: analytics.summary.cancelledOrders,
      growthPercent: analytics.summary.ordersGrowth,
    },
    customers: {
      total: analytics.customerSummary.total,
      new: analytics.customerSummary.new,
      repeat: analytics.customerSummary.repeat,
      repeatRatePercent: analytics.customerSummary.repeatRate,
    },
    topProducts: analytics.topProducts.map((p) => ({
      name: p.name,
      unitsSold: p.unitsSold,
      revenue: p.revenue,
      category: p.category,
    })),
    inventory: {
      healthyStock: analytics.inventorySummary.healthyStock,
      lowStock: analytics.inventorySummary.lowStock,
      outOfStock: analytics.inventorySummary.outOfStock,
      totalUnits: analytics.inventorySummary.totalStockUnits,
      itemsNeedingAttention: analytics.inventorySummary.itemsRequiringAttention.map((i) => ({
        name: i.name,
        stock: i.stock,
        unit: i.unit,
        threshold: i.threshold,
        status: i.status,
      })),
    },
    categories: analytics.categoryPerformance.map((c) => ({
      category: c.category,
      revenue: c.revenue,
      unitsSold: c.unitsSold,
      productsCount: c.productsCount,
    })),
  };

  const ai = getAIClient();
  if (ai) {
    try {
      const prompt = `You are FarmDirect's agricultural marketplace business intelligence assistant.
You analyze ONLY the supplied verified farmer metrics.
Never invent numbers or claim events occurred unless directly supported by the data.
Never fabricate customer behavior, weather information, or crop disease.
Distinguish clearly: FACT from INTERPRETATION from RECOMMENDATION.
Keep recommendations practical, concise, and actionable for a farmer.

Supplied Verified Metrics:
${JSON.stringify(structuredMetrics, null, 2)}

Respond with valid JSON adhering strictly to this schema:
{
  "summary": "concise 2-3 sentence overview of this farmer's performance during this period",
  "insights": [
    {
      "title": "Clear concise headline",
      "type": "growth" | "inventory" | "sales" | "demand" | "price" | "risk" | "opportunity" | "customers",
      "explanation": "2-3 sentences explaining the trend or observation",
      "evidence": [
        "Factual metric 1 from supplied data",
        "Factual metric 2 from supplied data"
      ],
      "recommendation": "Concrete tactical action step for the farmer",
      "confidence": "high" | "medium",
      "impact": "e.g. +18% Revenue or Critical Priority or Operational",
      "actionLabel": "Button action label",
      "actionLink": "/farmer/inventory" or "/farmer/products" or "/farmer/orders" or "/farmer/analytics"
    }
  ]
}
Generate between 3 and 5 insights.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.3,
        },
      });

      const text = response.text;
      if (text) {
        const parsed = JSON.parse(text) as {
          summary?: string;
          insights?: Array<{
            title: string;
            type: "growth" | "inventory" | "sales" | "demand" | "price" | "risk" | "opportunity" | "customers";
            explanation: string;
            evidence: string[];
            recommendation: string;
            confidence?: "high" | "medium";
            impact?: string;
            actionLabel?: string;
            actionLink?: string;
          }>;
        };

        if (parsed.insights && Array.isArray(parsed.insights) && parsed.insights.length > 0) {
          const mappedInsights: AIInsightItem[] = parsed.insights.map((item, idx) => ({
            id: `ai-${idx + 1}-${Date.now()}`,
            type: item.type || "opportunity",
            title: item.title,
            message: item.explanation, // backwards compat
            explanation: item.explanation,
            evidence: Array.isArray(item.evidence) ? item.evidence : [],
            recommendation: item.recommendation,
            confidence: item.confidence === "medium" ? "medium" : "high",
            icon: mapInsightIcon(item.type),
            impact: item.impact,
            action: item.actionLabel && item.actionLink ? {
              label: item.actionLabel,
              link: item.actionLink,
            } : getDefaultActionForType(item.type),
            generatedAt: now,
          }));

          return {
            summary: parsed.summary || `Analysis complete for ${periodLabel} based on verified orders, inventory, and revenue.`,
            insights: mappedInsights,
            generatedAt: now,
            periodLabel,
          };
        }
      }
    } catch {
      // Fallback cleanly to data-grounded deterministic heuristics below
    }
  }

  // Factual, data-grounded heuristic fallback
  const insights: AIInsightItem[] = [];
  const { summary, inventorySummary, topProducts, customerSummary } = analytics;

  // 1. Inventory Insight
  if (inventorySummary.itemsRequiringAttention.length > 0) {
    const attentionList = inventorySummary.itemsRequiringAttention;
    const names = attentionList.map((i) => `${i.name} (${i.stock} ${i.unit})`).join(", ");
    insights.push({
      id: "ai-inv-1",
      type: "inventory",
      title: "Inventory Restock Alert",
      explanation: `${attentionList.length} product(s) are below safety threshold or out of stock. Prompt replenishment avoids lost customer sales.`,
      evidence: [
        `Low / Out-of-stock items: ${names}`,
        `Current healthy products: ${inventorySummary.healthyStock}`,
      ],
      recommendation: "Review current stock counts and schedule upcoming harvest quantities.",
      confidence: "high",
      icon: "inventory_2",
      impact: "High Priority",
      action: { label: "Manage Inventory", link: "/farmer/inventory" },
      generatedAt: now,
    });
  } else {
    insights.push({
      id: "ai-inv-ok",
      type: "inventory",
      title: "Optimal Inventory Reserves",
      explanation: `All active catalogue items maintain sufficient stock above configured thresholds for regular fulfillment.`,
      evidence: [
        `Total active inventory: ${inventorySummary.totalStockUnits} units`,
        `Healthy products ratio: 100% (${inventorySummary.healthyStock}/${inventorySummary.healthyStock})`,
      ],
      recommendation: "Maintain routine cycle logging on newly harvested batches.",
      confidence: "high",
      icon: "inventory_2",
      impact: "Stable",
      action: { label: "View Inventory", link: "/farmer/inventory" },
      generatedAt: now,
    });
  }

  // 2. Revenue / Sales Growth Insight
  if (summary.totalRevenue > 0) {
    insights.push({
      id: "ai-rev-1",
      type: summary.revenueGrowth >= 0 ? "growth" : "sales",
      title: summary.revenueGrowth >= 0 ? "Revenue Expansion" : "Sales Velocity Overview",
      explanation: `Total revenue reached ₹${summary.totalRevenue.toLocaleString("en-IN")} across ${summary.totalOrders} order(s) during ${periodLabel}.`,
      evidence: [
        `Revenue: ₹${summary.totalRevenue.toLocaleString("en-IN")}`,
        `Growth vs previous period: ${summary.revenueGrowth >= 0 ? "+" : ""}${summary.revenueGrowth}%`,
        `Average Order Value: ₹${summary.averageOrderValue}`,
      ],
      recommendation: "Keep high-demand listings prominently available during peak weekend purchase windows.",
      confidence: "high",
      icon: "trending_up",
      impact: `${summary.revenueGrowth >= 0 ? "+" : ""}${summary.revenueGrowth}% Growth`,
      action: { label: "View Analytics", link: "/farmer/analytics" },
      generatedAt: now,
    });
  }

  // 3. Top Product Driver Insight
  if (topProducts.length > 0) {
    const leader = topProducts[0];
    insights.push({
      id: "ai-prod-1",
      type: "demand",
      title: `Core Demand Driver: ${leader.name}`,
      explanation: `${leader.name} generated ₹${leader.revenue.toLocaleString("en-IN")} with ${leader.unitsSold} units ordered, leading your catalogue performance.`,
      evidence: [
        `${leader.name}: ${leader.unitsSold} units sold`,
        `Category: ${leader.category || "Produce"}`,
        `Total revenue contribution: ₹${leader.revenue.toLocaleString("en-IN")}`,
      ],
      recommendation: "Ensure sufficient crop acreage is allocated for next cycle's demand.",
      confidence: "high",
      icon: "insights",
      impact: "Top Seller",
      action: { label: "Product Catalogue", link: "/farmer/products" },
      generatedAt: now,
    });
  }

  // 4. Customer Retention Insight
  if (customerSummary.total > 0) {
    insights.push({
      id: "ai-cust-1",
      type: "customers",
      title: "Customer Loyalty & Repeat Ordering",
      explanation: `Your farm served ${customerSummary.total} unique buyer(s) with a repeat order rate of ${customerSummary.repeatRate}%.`,
      evidence: [
        `Repeat buyers: ${customerSummary.repeat} (${customerSummary.repeatRate}%)`,
        `New buyers this period: ${customerSummary.new}`,
      ],
      recommendation: "Maintain consistent quality standards to convert first-time buyers into recurring weekly subscribers.",
      confidence: "medium",
      icon: "group",
      impact: "Retention",
      action: { label: "View Orders", link: "/farmer/orders" },
      generatedAt: now,
    });
  }

  return {
    summary: `Verified marketplace analysis for ${periodLabel}. Real sales and inventory metrics reflect active farm operations.`,
    insights,
    generatedAt: now,
    periodLabel,
  };
}
