import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Container } from "../../components/ui/Card";
import Icon from "../../components/ui/Icon";
import Badge from "../../components/ui/Badge";
import {
  fetchFarmerAIInsights,
  refreshFarmerAIInsights,
  type AIInsightItem,
} from "../../services/farmerAIInsightsApi";

const typeLabels: Record<string, { label: string; badge: "gold" | "primary" | "outline" | "error" | "neutral" }> = {
  demand: { label: "Demand Forecast", badge: "primary" },
  price: { label: "Price Recommendation", badge: "gold" },
  inventory: { label: "Inventory Alert", badge: "gold" },
  sales: { label: "Sales Opportunity", badge: "primary" },
};

export default function FarmerAIInsights() {
  const [insights, setInsights] = useState<AIInsightItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInsights = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchFarmerAIInsights();
      setInsights(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load AI insights");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      const freshData = await refreshFarmerAIInsights();
      setInsights(freshData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to refresh insights");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadInsights();
  }, []);

  return (
    <Container className="py-stack-lg">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Icon name="auto_awesome" size={24} className="text-primary" />
          </div>
          <div>
            <h1 className="font-display text-headline-lg-mobile md:text-headline-lg text-on-surface">FarmDirect AI</h1>
            <p className="text-body-md text-on-surface-variant">Real-time intelligence grounded in your inventory and sales data.</p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading || refreshing}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-on-primary text-label-md font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 self-start sm:self-auto"
        >
          <Icon name="refresh" size={18} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Analyzing Farm Data..." : "Refresh Insights"}
        </button>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 gap-gutter mt-6">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-48 rounded-xl bg-surface-container animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-error/20 bg-error/5 p-6 text-center max-w-lg mx-auto my-8">
          <Icon name="error_outline" size={32} className="text-error mx-auto mb-2" />
          <p className="text-body-md text-on-surface mb-4">{error}</p>
          <button
            onClick={loadInsights}
            className="px-4 py-2 bg-primary text-on-primary rounded-lg text-label-md font-medium hover:bg-primary/90 transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : insights.length === 0 ? (
        <div className="bg-surface-bright rounded-xl border border-surface-variant p-8 text-center my-6">
          <Icon name="psychology" size={36} className="text-on-surface-variant mx-auto mb-3" />
          <p className="text-body-lg text-on-surface font-medium mb-1">No insights generated yet</p>
          <p className="text-body-md text-on-surface-variant mb-4">Click below to generate new actionable recommendations.</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-primary text-on-primary rounded-lg text-label-md font-medium hover:bg-primary/90 transition-colors"
          >
            Generate AI Insights
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-gutter mt-6">
          {insights.map((insight) => {
            const badgeMeta = typeLabels[insight.type] || { label: "Farm Insight", badge: "primary" };
            return (
              <div
                key={insight.id}
                className="bg-surface-bright rounded-xl border border-surface-variant p-6 flex flex-col justify-between hover:border-primary/40 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant={badgeMeta.badge} icon={<Icon name={insight.icon || "auto_awesome"} size={14} />}>
                      {badgeMeta.label}
                    </Badge>
                    {insight.impact && (
                      <span className="text-label-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                        {insight.impact}
                      </span>
                    )}
                  </div>
                  <h2 className="font-display text-headline-sm text-on-surface mb-2">{insight.title}</h2>
                  <p className="text-body-md text-on-surface-variant mb-4">{insight.message}</p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-surface-variant mt-2">
                  <span className="text-label-xs text-on-surface-variant">
                    {insight.generatedAt ? new Date(insight.generatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Live"}
                  </span>
                  {insight.action ? (
                    <Link
                      to={insight.action.link}
                      className="inline-flex items-center gap-1 text-label-md font-medium text-primary hover:underline"
                    >
                      {insight.action.label}
                      <Icon name="arrow_forward" size={14} />
                    </Link>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-10 bg-surface-container-low rounded-xl border border-outline-variant p-6 flex items-start gap-4">
        <Icon name="info" className="text-primary mt-0.5 shrink-0" size={20} />
        <p className="text-body-md text-on-surface-variant">
          FarmDirect AI combines marketplace demand trends, weather observations, local crop inventory, and historical sales patterns to generate tactical advice.
        </p>
      </div>
    </Container>
  );
}
