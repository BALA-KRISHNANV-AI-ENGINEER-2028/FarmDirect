import { useEffect, useState } from "react";
import { Container, SectionHeading } from "../../components/ui/Card";
import Icon from "../../components/ui/Icon";
import StatCard from "../../components/ui/StatCard";
import RevenueChart from "../../components/charts/RevenueChart";
import { fetchFarmerAnalytics, type FarmerAnalyticsData } from "../../services/farmerAnalyticsApi";
import { formatINR } from "../../utils/format";

export default function FarmerAnalytics() {
  const [data, setData] = useState<FarmerAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchFarmerAnalytics();
      setData(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  if (loading) {
    return (
      <Container className="py-stack-lg">
        <h1 className="font-display text-headline-lg-mobile md:text-headline-lg text-on-surface mb-2">Analytics</h1>
        <p className="text-label-sm text-on-surface-variant mb-8">Loading real-time farm performance and order metrics...</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-28 rounded-xl bg-surface-container animate-pulse" />
          ))}
        </div>
        <div className="h-72 rounded-xl bg-surface-container animate-pulse mb-10" />
      </Container>
    );
  }

  if (error || !data) {
    return (
      <Container className="py-stack-lg">
        <h1 className="font-display text-headline-lg-mobile md:text-headline-lg text-on-surface mb-2">Analytics</h1>
        <div className="rounded-xl border border-error/20 bg-error/5 p-6 text-center max-w-lg mx-auto">
          <Icon name="error_outline" size={32} className="text-error mx-auto mb-2" />
          <p className="text-body-md text-on-surface mb-4">{error || "Could not retrieve analytics data."}</p>
          <button
            onClick={loadAnalytics}
            className="px-4 py-2 bg-primary text-on-primary rounded-lg text-label-md font-medium hover:bg-primary/90 transition-colors"
          >
            Try Again
          </button>
        </div>
      </Container>
    );
  }

  const maxRevenue = Math.max(1, ...data.bestSellers.map((b) => b.revenue));
  const chartData = data.revenueTrend.map((t) => ({
    day: t.date.length > 5 ? t.date.slice(5) : t.date,
    revenue: t.revenue,
  }));

  const formatTrend = (pct: number) => (pct >= 0 ? `+${pct.toFixed(1)}%` : `${pct.toFixed(1)}%`);

  return (
    <Container className="py-stack-lg">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-headline-lg-mobile md:text-headline-lg text-on-surface mb-1">Analytics</h1>
          <p className="text-label-sm text-on-surface-variant">Live store performance, customer trends, and product metrics.</p>
        </div>
        <button
          onClick={loadAnalytics}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-outline/20 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors text-label-sm self-start sm:self-auto"
        >
          <Icon name="refresh" size={16} />
          Refresh
        </button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatCard
          label="Revenue (30d)"
          value={formatINR(data.revenue30d)}
          icon="account_balance_wallet"
          trend={formatTrend(data.revenueTrendPercent)}
        />
        <StatCard
          label="Orders (30d)"
          value={String(data.orders30d)}
          icon="receipt_long"
          trend={formatTrend(data.ordersTrendPercent)}
        />
        <StatCard
          label="Products Sold"
          value={`${data.productsSold} units`}
          icon="eco"
          trend={formatTrend(data.productsSoldTrendPercent)}
        />
        <StatCard
          label="New Customers"
          value={String(data.newCustomers)}
          icon="group"
          trend={formatTrend(data.newCustomersTrendPercent)}
        />
      </div>

      <div className="bg-surface-bright rounded-xl border border-surface-variant p-6 mb-10">
        <SectionHeading title="Sales Trends (Daily Revenue)" />
        {chartData.length > 0 ? (
          <RevenueChart data={chartData} />
        ) : (
          <p className="text-body-md text-on-surface-variant py-8 text-center">No sales trend points available yet.</p>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-gutter">
        <div className="bg-surface-bright rounded-xl border border-surface-variant p-6">
          <h2 className="font-display text-headline-sm text-on-surface mb-5">Best-Selling Products</h2>
          {data.bestSellers.length > 0 ? (
            <div className="space-y-4">
              {data.bestSellers.map((b) => (
                <div key={b.name}>
                  <div className="flex justify-between mb-1">
                    <span className="text-label-md font-semibold text-on-surface">{b.name}</span>
                    <span className="text-label-md text-on-surface-variant">{formatINR(b.revenue)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-container-high overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (b.revenue / maxRevenue) * 100)}%` }}
                    />
                  </div>
                  <p className="text-label-sm text-on-surface-variant mt-1">{b.unitsSold} units sold</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-body-md text-on-surface-variant">No sales records recorded yet.</p>
          )}
        </div>

        <div className="bg-surface-bright rounded-xl border border-surface-variant p-6">
          <h2 className="font-display text-headline-sm text-on-surface mb-5">Product Performance</h2>
          <div className="space-y-3">
            {[
              {
                label: "Repeat Purchase Rate",
                value: `${data.performance.repeatPurchaseRate.toFixed(1)}%`,
              },
              {
                label: "Average Order Value",
                value: formatINR(data.performance.averageOrderValue),
              },
              {
                label: "Customer Growth Rate",
                value: `${data.performance.customerGrowthRate >= 0 ? "+" : ""}${data.performance.customerGrowthRate.toFixed(1)}% MoM`,
              },
              {
                label: "Average Rating",
                value: `${data.performance.averageRating.toFixed(1)} / 5.0`,
              },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between py-2 border-b border-surface-variant last:border-0">
                <span className="text-body-md text-on-surface-variant flex items-center gap-2">
                  <Icon name="insights" size={16} className="text-primary" />
                  {row.label}
                </span>
                <span className="font-semibold text-on-surface">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Container>
  );
}
