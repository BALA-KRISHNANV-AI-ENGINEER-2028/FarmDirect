import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Container } from "../../components/ui/Card";
import Icon from "../../components/ui/Icon";
import Badge from "../../components/ui/Badge";
import RevenueChart from "../../components/charts/RevenueChart";
import OrdersChart from "../../components/charts/OrdersChart";
import {
  fetchFarmerAnalytics,
  type AnalyticsPeriod,
  type FarmerAnalyticsData,
} from "../../services/farmerAnalyticsApi";
import { formatINR } from "../../utils/format";

const PERIOD_OPTIONS: { key: AnalyticsPeriod; label: string }[] = [
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "90d", label: "Last 90 days" },
  { key: "year", label: "This year" },
];

export default function FarmerAnalytics() {
  const [period, setPeriod] = useState<AnalyticsPeriod>("30d");
  const [data, setData] = useState<FarmerAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeChartTab, setActiveChartTab] = useState<"revenue" | "orders">("revenue");

  const loadAnalytics = async (selectedPeriod: AnalyticsPeriod = period) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchFarmerAnalytics(selectedPeriod);
      setData(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics(period);
  }, [period]);

  const handlePeriodChange = (newPeriod: AnalyticsPeriod) => {
    setPeriod(newPeriod);
  };

  if (loading && !data) {
    return (
      <Container className="py-stack-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-headline-lg-mobile md:text-headline-lg text-on-surface mb-1">Analytics</h1>
            <p className="text-body-md text-on-surface-variant">Understand your farm's performance and make data-driven decisions.</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-28 rounded-xl bg-surface-container animate-pulse" />
          ))}
        </div>
        <div className="h-72 rounded-xl bg-surface-container animate-pulse mb-8" />
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="h-64 rounded-xl bg-surface-container animate-pulse" />
          <div className="h-64 rounded-xl bg-surface-container animate-pulse" />
        </div>
      </Container>
    );
  }

  if (error || !data) {
    return (
      <Container className="py-stack-lg">
        <h1 className="font-display text-headline-lg-mobile md:text-headline-lg text-on-surface mb-2">Analytics</h1>
        <div className="rounded-xl border border-error/20 bg-error/5 p-8 text-center max-w-lg mx-auto my-12">
          <Icon name="error_outline" size={40} className="text-error mx-auto mb-3" />
          <p className="text-headline-sm text-on-surface font-display mb-2">Could not retrieve analytics data</p>
          <p className="text-body-md text-on-surface-variant mb-6">{error || "The server could not process the request."}</p>
          <button
            onClick={() => loadAnalytics(period)}
            className="px-5 py-2.5 bg-primary text-on-primary rounded-lg text-label-md font-medium hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
          >
            <Icon name="refresh" size={18} />
            Try Again
          </button>
        </div>
      </Container>
    );
  }

  const { summary, inventorySummary, topProducts, orderStatusDistribution, categoryPerformance, recentOrders } = data;
  const isZeroState = summary.totalOrders === 0 && summary.totalRevenue === 0;

  const maxProductRevenue = Math.max(1, ...topProducts.map((p) => p.revenue));
  const revenueChartData = data.revenueTrend.map((t) => ({
    day: t.date.length > 5 ? t.date.slice(5) : t.date,
    revenue: t.revenue,
  }));
  const ordersChartData = data.ordersTrend.map((t) => ({
    day: t.date.length > 5 ? t.date.slice(5) : t.date,
    orders: t.orders,
  }));

  const formatTrendBadge = (pct: number) => {
    if (pct === 0) return null;
    const isPositive = pct > 0;
    return (
      <span className={`inline-flex items-center gap-0.5 text-label-xs font-semibold px-1.5 py-0.5 rounded ${
        isPositive ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400" : "text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400"
      }`}>
        <Icon name={isPositive ? "arrow_upward" : "arrow_downward"} size={12} />
        {Math.abs(pct)}%
      </span>
    );
  };

  return (
    <Container className="py-stack-lg">
      {/* Header & Period Filter */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-headline-lg-mobile md:text-headline-lg text-on-surface mb-1">Analytics</h1>
          <p className="text-body-md text-on-surface-variant">
            Understand your farm's performance and make data-driven decisions.
          </p>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex flex-wrap items-center gap-2 bg-surface-container-low p-1.5 rounded-xl border border-surface-variant self-start lg:self-auto">
          {PERIOD_OPTIONS.map((opt) => {
            const active = period === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => handlePeriodChange(opt.key)}
                className={`px-3 py-1.5 rounded-lg text-label-sm font-medium transition-all ${
                  active
                    ? "bg-surface-bright text-primary font-semibold shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
          <button
            onClick={() => loadAnalytics(period)}
            title="Refresh analytics data"
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors ml-1"
          >
            <Icon name="refresh" size={16} />
          </button>
        </div>
      </div>

      {/* Empty State Banner if completely no sales */}
      {isZeroState && (
        <div className="mb-8 rounded-xl border border-primary/20 bg-primary/5 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Icon name="info" className="text-primary mt-1 shrink-0" size={24} />
            <div>
              <h2 className="text-title-md font-semibold text-on-surface">Not enough sales data yet</h2>
              <p className="text-body-sm text-on-surface-variant">
                Analytics will appear as customers browse and purchase your farm produce. Review your active listings or stock levels.
              </p>
            </div>
          </div>
          <Link
            to="/farmer/products/new"
            className="px-4 py-2 bg-primary text-on-primary rounded-lg text-label-md font-medium hover:bg-primary/90 transition-colors whitespace-nowrap self-start sm:self-auto"
          >
            Add Products
          </Link>
        </div>
      )}

      {/* 6 Summary Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {/* 1. Revenue */}
        <div className="bg-surface-bright rounded-xl border border-surface-variant p-4 flex flex-col justify-between hover:border-outline/40 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-label-sm font-medium text-on-surface-variant">Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Icon name="account_balance_wallet" size={18} />
            </div>
          </div>
          <div>
            <p className="text-title-lg font-bold text-on-surface">{formatINR(summary.totalRevenue)}</p>
            <div className="flex items-center gap-1.5 mt-1">
              {formatTrendBadge(summary.revenueGrowth)}
              <span className="text-label-xs text-on-surface-variant truncate">vs previous period</span>
            </div>
          </div>
        </div>

        {/* 2. Orders */}
        <div className="bg-surface-bright rounded-xl border border-surface-variant p-4 flex flex-col justify-between hover:border-outline/40 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-label-sm font-medium text-on-surface-variant">Orders</span>
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Icon name="receipt_long" size={18} />
            </div>
          </div>
          <div>
            <p className="text-title-lg font-bold text-on-surface">{summary.totalOrders}</p>
            <div className="flex items-center gap-1.5 mt-1">
              {formatTrendBadge(summary.ordersGrowth)}
              <span className="text-label-xs text-on-surface-variant truncate">{summary.completedOrders} completed</span>
            </div>
          </div>
        </div>

        {/* 3. Average Order Value */}
        <div className="bg-surface-bright rounded-xl border border-surface-variant p-4 flex flex-col justify-between hover:border-outline/40 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-label-sm font-medium text-on-surface-variant">Avg Order Value</span>
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Icon name="payments" size={18} />
            </div>
          </div>
          <div>
            <p className="text-title-lg font-bold text-on-surface">{formatINR(summary.averageOrderValue)}</p>
            <span className="text-label-xs text-on-surface-variant">per completed order</span>
          </div>
        </div>

        {/* 4. Customers */}
        <div className="bg-surface-bright rounded-xl border border-surface-variant p-4 flex flex-col justify-between hover:border-outline/40 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-label-sm font-medium text-on-surface-variant">Customers</span>
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Icon name="group" size={18} />
            </div>
          </div>
          <div>
            <p className="text-title-lg font-bold text-on-surface">{summary.totalCustomers}</p>
            <span className="text-label-xs text-on-surface-variant">
              {data.customerSummary.repeatRate}% repeat rate
            </span>
          </div>
        </div>

        {/* 5. Products */}
        <div className="bg-surface-bright rounded-xl border border-surface-variant p-4 flex flex-col justify-between hover:border-outline/40 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-label-sm font-medium text-on-surface-variant">Products</span>
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Icon name="eco" size={18} />
            </div>
          </div>
          <div>
            <p className="text-title-lg font-bold text-on-surface">{summary.activeProducts}</p>
            <span className="text-label-xs text-on-surface-variant">{summary.totalProducts} listed total</span>
          </div>
        </div>

        {/* 6. Low Stock */}
        <div className="bg-surface-bright rounded-xl border border-surface-variant p-4 flex flex-col justify-between hover:border-outline/40 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-label-sm font-medium text-on-surface-variant">Stock Alerts</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              summary.lowStockProducts > 0 ? "bg-amber-500/10 text-amber-600" : "bg-primary/10 text-primary"
            }`}>
              <Icon name={summary.lowStockProducts > 0 ? "warning" : "check_circle"} size={18} />
            </div>
          </div>
          <div>
            <p className={`text-title-lg font-bold ${summary.lowStockProducts > 0 ? "text-amber-700 dark:text-amber-400" : "text-on-surface"}`}>
              {summary.lowStockProducts}
            </p>
            <span className="text-label-xs text-on-surface-variant">
              {inventorySummary.outOfStock > 0 ? `${inventorySummary.outOfStock} out of stock` : "require attention"}
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Charts Section (Revenue & Orders) */}
      <div className="bg-surface-bright rounded-xl border border-surface-variant p-6 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="font-display text-title-lg text-on-surface">Performance Trends</h2>
            <p className="text-body-sm text-on-surface-variant">
              {activeChartTab === "revenue" ? "Daily gross revenue over time" : "Daily order volume over time"}
            </p>
          </div>

          <div className="inline-flex rounded-lg bg-surface-container p-1 border border-outline-variant self-start sm:self-auto">
            <button
              onClick={() => setActiveChartTab("revenue")}
              className={`px-3 py-1.5 text-label-sm font-medium rounded-md transition-all ${
                activeChartTab === "revenue"
                  ? "bg-surface-bright text-primary font-semibold shadow-xs"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Revenue
            </button>
            <button
              onClick={() => setActiveChartTab("orders")}
              className={`px-3 py-1.5 text-label-sm font-medium rounded-md transition-all ${
                activeChartTab === "orders"
                  ? "bg-surface-bright text-primary font-semibold shadow-xs"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Orders
            </button>
          </div>
        </div>

        {activeChartTab === "revenue" ? (
          revenueChartData.length > 0 ? (
            <RevenueChart data={revenueChartData} />
          ) : (
            <div className="py-16 text-center text-on-surface-variant text-body-md">
              No revenue trend data recorded for {data.period.label.toLowerCase()}.
            </div>
          )
        ) : ordersChartData.length > 0 ? (
          <OrdersChart data={ordersChartData} />
        ) : (
          <div className="py-16 text-center text-on-surface-variant text-body-md">
            No orders trend data recorded for {data.period.label.toLowerCase()}.
          </div>
        )}
      </div>

      {/* Top Products & Order Status Distribution */}
      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        {/* Top Selling Products */}
        <div className="bg-surface-bright rounded-xl border border-surface-variant p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-title-lg text-on-surface">Top-Selling Products</h2>
              <Link to="/farmer/products" className="text-label-sm text-primary hover:underline">
                View All
              </Link>
            </div>

            {topProducts.length > 0 ? (
              <div className="space-y-4">
                {topProducts.map((p) => {
                  const sharePct = Math.round((p.revenue / maxProductRevenue) * 100);
                  return (
                    <div key={p.id || p.name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-body-sm">
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-semibold text-on-surface truncate">{p.name}</span>
                          {p.category && (
                            <span className="text-label-xs text-on-surface-variant bg-surface-container px-2 py-0.5 rounded">
                              {p.category}
                            </span>
                          )}
                        </div>
                        <span className="font-semibold text-on-surface whitespace-nowrap">{formatINR(p.revenue)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-surface-container overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(5, sharePct)}%` }}
                        />
                      </div>
                      <p className="text-label-xs text-on-surface-variant">{p.unitsSold} units sold</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-10 text-center text-on-surface-variant text-body-md">
                No product sales recorded in this period.
              </div>
            )}
          </div>
        </div>

        {/* Order Status Distribution */}
        <div className="bg-surface-bright rounded-xl border border-surface-variant p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-title-lg text-on-surface">Order Status Breakdown</h2>
              <span className="text-label-sm text-on-surface-variant">{summary.totalOrders} total orders</span>
            </div>

            <div className="space-y-4">
              {orderStatusDistribution.map((item) => {
                const getStatusColor = (status: string) => {
                  switch (status) {
                    case "DELIVERED":
                      return "bg-emerald-600";
                    case "PROCESSING":
                      return "bg-blue-600";
                    case "PENDING":
                      return "bg-amber-500";
                    case "CANCELLED":
                      return "bg-rose-500";
                    default:
                      return "bg-primary";
                  }
                };

                return (
                  <div key={item.status} className="space-y-1.5">
                    <div className="flex items-center justify-between text-body-sm">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${getStatusColor(item.status)}`} />
                        <span className="font-medium text-on-surface">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-on-surface-variant text-label-xs">({item.percentage}%)</span>
                        <span className="font-semibold text-on-surface">{item.count}</span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-surface-container overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${getStatusColor(item.status)}`}
                        style={{ width: `${Math.max(item.count > 0 ? 4 : 0, item.percentage)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-surface-variant flex items-center justify-between text-label-sm text-on-surface-variant">
            <span>Fulfilled rate: {summary.totalOrders > 0 ? Math.round((summary.completedOrders / summary.totalOrders) * 100) : 0}%</span>
            <Link to="/farmer/orders" className="text-primary hover:underline">
              Manage Orders →
            </Link>
          </div>
        </div>
      </div>

      {/* Inventory Health & Category Performance */}
      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        {/* Inventory Health Monitor */}
        <div className="bg-surface-bright rounded-xl border border-surface-variant p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-title-lg text-on-surface">Inventory Health</h2>
            <Link to="/farmer/inventory" className="text-label-sm text-primary hover:underline">
              Inventory Table
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-3 border border-emerald-200 dark:border-emerald-900 text-center">
              <span className="text-label-xs text-emerald-800 dark:text-emerald-300 font-medium">Healthy Stock</span>
              <p className="text-title-md font-bold text-emerald-900 dark:text-emerald-100">{inventorySummary.healthyStock}</p>
            </div>
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-3 border border-amber-200 dark:border-amber-900 text-center">
              <span className="text-label-xs text-amber-800 dark:text-amber-300 font-medium">Low Stock</span>
              <p className="text-title-md font-bold text-amber-900 dark:text-amber-100">{inventorySummary.lowStock}</p>
            </div>
            <div className="rounded-lg bg-rose-50 dark:bg-rose-950/30 p-3 border border-rose-200 dark:border-rose-900 text-center">
              <span className="text-label-xs text-rose-800 dark:text-rose-300 font-medium">Out of Stock</span>
              <p className="text-title-md font-bold text-rose-900 dark:text-rose-100">{inventorySummary.outOfStock}</p>
            </div>
          </div>

          {inventorySummary.itemsRequiringAttention.length > 0 ? (
            <div className="space-y-2">
              <p className="text-label-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
                Items Requiring Restock
              </p>
              <div className="divide-y divide-surface-variant border border-surface-variant rounded-lg overflow-hidden">
                {inventorySummary.itemsRequiringAttention.map((item) => (
                  <div key={item.id} className="p-2.5 bg-surface-container-low flex items-center justify-between text-body-sm">
                    <div>
                      <p className="font-medium text-on-surface">{item.name}</p>
                      <p className="text-label-xs text-on-surface-variant">Threshold: {item.threshold} {item.unit}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-label-xs font-medium ${
                        item.stock === 0 ? "bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200" : "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200"
                      }`}>
                        {item.stock} {item.unit}
                      </span>
                      <Link
                        to="/farmer/inventory"
                        className="text-primary hover:text-primary/80"
                        title="Adjust stock"
                      >
                        <Icon name="edit" size={16} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-on-surface-variant text-body-sm bg-surface-container-low rounded-lg">
              <Icon name="verified" size={24} className="text-emerald-600 mx-auto mb-1" />
              All products maintain healthy stock buffers.
            </div>
          )}
        </div>

        {/* Category Performance */}
        <div className="bg-surface-bright rounded-xl border border-surface-variant p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-title-lg text-on-surface">Category Performance</h2>
            <span className="text-label-sm text-on-surface-variant">{categoryPerformance.length} categories</span>
          </div>

          {categoryPerformance.length > 0 ? (
            <div className="space-y-3">
              {categoryPerformance.map((cat) => (
                <div key={cat.category} className="p-3 rounded-lg bg-surface-container-low border border-surface-variant flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <Icon name="category" size={16} />
                    </div>
                    <div>
                      <p className="font-semibold text-on-surface text-body-sm">{cat.category}</p>
                      <p className="text-label-xs text-on-surface-variant">
                        {cat.productsCount} listed • {cat.unitsSold} units sold
                      </p>
                    </div>
                  </div>
                  <p className="font-semibold text-on-surface text-body-md">{formatINR(cat.revenue)}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center text-on-surface-variant text-body-md">
              No category metrics recorded.
            </div>
          )}
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="bg-surface-bright rounded-xl border border-surface-variant p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-display text-title-lg text-on-surface">Recent Store Orders</h2>
            <p className="text-body-sm text-on-surface-variant">Latest direct customer transactions for your farm products</p>
          </div>
          <Link to="/farmer/orders" className="text-label-sm text-primary hover:underline">
            View All Orders →
          </Link>
        </div>

        {recentOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-surface-variant text-label-sm font-semibold text-on-surface-variant">
                  <th className="py-3 px-3">Order Number</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Customer</th>
                  <th className="py-3 px-3">Items</th>
                  <th className="py-3 px-3 text-right">Amount</th>
                  <th className="py-3 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-variant text-body-sm">
                {recentOrders.map((ro) => (
                  <tr key={ro.id} className="hover:bg-surface-container-low transition-colors">
                    <td className="py-3 px-3 font-semibold text-on-surface">{ro.orderNumber}</td>
                    <td className="py-3 px-3 text-on-surface-variant">{ro.date || "Today"}</td>
                    <td className="py-3 px-3 text-on-surface">{ro.customerName}</td>
                    <td className="py-3 px-3 text-on-surface-variant">{ro.itemsCount} item(s)</td>
                    <td className="py-3 px-3 text-right font-semibold text-on-surface">{formatINR(ro.amount)}</td>
                    <td className="py-3 px-3 text-right">
                      <Badge variant={ro.status === "DELIVERED" ? "primary" : ro.status === "CANCELLED" ? "error" : "gold"}>
                        {ro.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-on-surface-variant text-body-md">
            No customer orders recorded yet for {data.period.label.toLowerCase()}.
          </div>
        )}
      </div>
    </Container>
  );
}
