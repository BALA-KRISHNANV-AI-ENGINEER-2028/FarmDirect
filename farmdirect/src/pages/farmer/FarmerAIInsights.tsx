import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Container } from "../../components/ui/Card";
import Icon from "../../components/ui/Icon";
import Badge from "../../components/ui/Badge";
import {
  fetchFarmerAIInsights,
  refreshFarmerAIInsights,
  type AIInsightItem,
  type FarmerAIInsightsData,
} from "../../services/farmerAIInsightsApi";
import type { AnalyticsPeriod } from "../../services/farmerAnalyticsApi";

const PERIOD_OPTIONS: { key: AnalyticsPeriod; label: string }[] = [
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "90d", label: "Last 90 days" },
  { key: "year", label: "This year" },
];

const TYPE_CONFIG: Record<string, { label: string; badge: "primary" | "gold" | "outline" | "error" | "neutral" }> = {
  growth: { label: "Growth", badge: "primary" },
  sales: { label: "Sales Trend", badge: "primary" },
  inventory: { label: "Inventory Alert", badge: "gold" },
  demand: { label: "Market Demand", badge: "primary" },
  price: { label: "Pricing Strategy", badge: "gold" },
  customers: { label: "Customer Retention", badge: "neutral" },
  opportunity: { label: "Opportunity", badge: "primary" },
  risk: { label: "Risk Mitigation", badge: "error" },
};

export default function FarmerAIInsights() {
  const [period, setPeriod] = useState<AnalyticsPeriod>("30d");
  const [data, setData] = useState<FarmerAIInsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInsights = async (selectedPeriod: AnalyticsPeriod = period) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchFarmerAIInsights(selectedPeriod);
      setData(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "AI insights are temporarily unavailable. Your analytics are still available.");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      setError(null);
      const res = await refreshFarmerAIInsights(period);
      setData(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to refresh insights. Your analytics remain available.");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadInsights(period);
  }, [period]);

  const handlePeriodChange = (newPeriod: AnalyticsPeriod) => {
    setPeriod(newPeriod);
  };

  return (
    <Container className="py-stack-lg">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-headline-lg-mobile md:text-headline-lg text-on-surface mb-1">AI Insights</h1>
          <p className="text-body-md text-on-surface-variant">
            Evidence-based recommendations grounded in your FarmDirect sales and inventory data.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto">
          {/* Period selector */}
          <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-xl border border-surface-variant">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => handlePeriodChange(opt.key)}
                className={`px-3 py-1.5 rounded-lg text-label-sm font-medium transition-all ${
                  period === opt.key
                    ? "bg-surface-bright text-primary font-semibold shadow-xs"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Action button */}
          <button
            onClick={handleRefresh}
            disabled={loading || refreshing}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-on-primary text-label-md font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Icon name="auto_awesome" size={18} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Analyzing your farm data..." : "Generate Insights"}
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="space-y-6">
          <div className="h-24 rounded-xl bg-surface-container animate-pulse" />
          <div className="grid md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-64 rounded-xl bg-surface-container animate-pulse" />
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-error/20 bg-error/5 p-8 text-center max-w-lg mx-auto my-12">
          <Icon name="psychology_alt" size={40} className="text-error mx-auto mb-3" />
          <p className="text-headline-sm text-on-surface font-display mb-2">AI insights are temporarily unavailable</p>
          <p className="text-body-md text-on-surface-variant mb-6">
            {error}. Your native store analytics and order management remain fully functional.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => loadInsights(period)}
              className="px-4 py-2 bg-primary text-on-primary rounded-lg text-label-md font-medium hover:bg-primary/90 transition-colors"
            >
              Try Again
            </button>
            <Link
              to="/farmer/analytics"
              className="px-4 py-2 border border-outline/30 text-on-surface rounded-lg text-label-md font-medium hover:bg-surface-container transition-colors"
            >
              Open Analytics
            </Link>
          </div>
        </div>
      ) : !data || data.insights.length === 0 ? (
        <div className="bg-surface-bright rounded-xl border border-surface-variant p-10 text-center my-8 max-w-xl mx-auto">
          <Icon name="psychology" size={44} className="text-on-surface-variant mx-auto mb-3" />
          <h2 className="text-title-lg font-display text-on-surface mb-2">No insights generated yet</h2>
          <p className="text-body-md text-on-surface-variant mb-6">
            Click below to analyze your verified sales, orders, and stock movements for {PERIOD_OPTIONS.find((p) => p.key === period)?.label.toLowerCase()}.
          </p>
          <button
            onClick={handleRefresh}
            className="px-5 py-2.5 bg-primary text-on-primary rounded-lg text-label-md font-medium hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
          >
            <Icon name="auto_awesome" size={18} />
            Generate Insights
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Overall Summary Card */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
                <Icon name="insights" size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-label-xs font-semibold uppercase tracking-wider text-primary">Farm Intelligence Summary</span>
                  <span className="text-label-xs text-on-surface-variant">• {data.periodLabel}</span>
                </div>
                <p className="text-body-md text-on-surface leading-relaxed">{data.summary}</p>
              </div>
            </div>
            <div className="text-label-xs text-on-surface-variant shrink-0 self-start sm:self-center">
              Generated: {data.generatedAt ? new Date(data.generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Just now"}
            </div>
          </div>

          {/* Structured Insight Cards */}
          <div className="grid md:grid-cols-2 gap-6">
            {data.insights.map((insight: AIInsightItem) => {
              const meta = TYPE_CONFIG[insight.type] || { label: "Analysis", badge: "primary" };

              return (
                <div
                  key={insight.id}
                  className="bg-surface-bright rounded-xl border border-surface-variant p-6 flex flex-col justify-between hover:border-primary/40 transition-colors shadow-xs"
                >
                  <div>
                    {/* Card Top: Badges & Impact */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <Badge variant={meta.badge} icon={<Icon name={insight.icon || "auto_awesome"} size={14} />}>
                        {meta.label}
                      </Badge>
                      <div className="flex items-center gap-2">
                        {insight.confidence && (
                          <span className={`text-label-xs px-2 py-0.5 rounded font-medium ${
                            insight.confidence === "high"
                              ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : "bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
                          }`}>
                            {insight.confidence === "high" ? "High Confidence" : "Medium Confidence"}
                          </span>
                        )}
                        {insight.impact && (
                          <span className="text-label-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                            {insight.impact}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Title & Explanation */}
                    <h2 className="font-display text-title-lg text-on-surface mb-2">{insight.title}</h2>
                    <p className="text-body-md text-on-surface-variant mb-4 leading-relaxed">
                      {insight.explanation || insight.message}
                    </p>

                    {/* Evidence Box */}
                    {insight.evidence && insight.evidence.length > 0 && (
                      <div className="bg-surface-container-low rounded-lg p-3.5 mb-4 border border-outline-variant/60">
                        <span className="text-label-xs font-semibold uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5 mb-2">
                          <Icon name="fact_check" size={14} className="text-primary" />
                          Evidence
                        </span>
                        <ul className="space-y-1">
                          {insight.evidence.map((point, idx) => (
                            <li key={idx} className="text-body-sm text-on-surface flex items-start gap-2">
                              <span className="text-primary font-bold">•</span>
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Recommendation Box */}
                    {insight.recommendation && (
                      <div className="bg-surface-container-low rounded-lg p-3.5 mb-4 border border-primary/20">
                        <span className="text-label-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5 mb-1">
                          <Icon name="lightbulb" size={14} />
                          Recommendation
                        </span>
                        <p className="text-body-sm text-on-surface">{insight.recommendation}</p>
                      </div>
                    )}
                  </div>

                  {/* Card Footer: Action button */}
                  {insight.action && (
                    <div className="pt-3 border-t border-surface-variant flex items-center justify-between">
                      <span className="text-label-xs text-on-surface-variant">Actionable next step</span>
                      <Link
                        to={insight.action.link}
                        className="inline-flex items-center gap-1.5 text-label-md font-semibold text-primary hover:text-primary/80 transition-colors"
                      >
                        {insight.action.label}
                        <Icon name="arrow_forward" size={16} />
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Evidence-Grounded Principles Disclaimer */}
          <div className="mt-8 bg-surface-container-low rounded-xl border border-outline-variant p-4 flex items-start gap-3">
            <Icon name="verified_user" className="text-primary mt-0.5 shrink-0" size={18} />
            <p className="text-body-sm text-on-surface-variant">
              FarmDirect AI is strictly grounded in your verified database metrics (actual order transactions, verified inventory counts, and customer purchase frequency). No hypothetical numbers or external market claims are fabricated.
            </p>
          </div>
        </div>
      )}
    </Container>
  );
}
