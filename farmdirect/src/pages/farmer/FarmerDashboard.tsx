import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Container, SectionHeading } from "../../components/ui/Card";
import StatCard from "../../components/ui/StatCard";
import Icon from "../../components/ui/Icon";
import Badge from "../../components/ui/Badge";
import Skeleton from "../../components/ui/Skeleton";
import RevenueChart from "../../components/charts/RevenueChart";
import { fetchInventory } from "../../services/inventoryApi";
import { fetchFarmerOrders } from "../../services/ordersApi";
import { fetchFarmerAnalytics, type FarmerAnalyticsData } from "../../services/farmerAnalyticsApi";
import { fetchFarmerAIInsights, type AIInsightItem } from "../../services/farmerAIInsightsApi";
import { formatINR } from "../../utils/format";
import type { InventoryItem, Order } from "../../types";

export default function FarmerDashboard() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [analytics, setAnalytics] = useState<FarmerAnalyticsData | null>(null);
  const [insights, setInsights] = useState<AIInsightItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchInventory().catch(() => []),
      fetchFarmerOrders().catch(() => []),
      fetchFarmerAnalytics().catch(() => null),
      fetchFarmerAIInsights().catch(() => []),
    ]).then(([inv, ord, ana, ins]) => {
      setInventory(inv);
      setOrders(ord);
      setAnalytics(ana);
      setInsights(ins);
      setLoading(false);
    });
  }, []);

  const lowStock = inventory.filter((i) => i.status === "Low Stock" || i.status === "Out of Stock");
  const recentOrders = orders.slice(0, 4);
  const totalRevenue = analytics?.revenue30d ?? orders.reduce((sum, o) => sum + o.total, 0);

  const chartData = analytics?.revenueTrend?.map((t) => ({
    day: t.date.length > 5 ? t.date.slice(5) : t.date,
    revenue: t.revenue,
  })) ?? [];

  return (
    <Container className="py-stack-lg">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-headline-lg-mobile md:text-headline-lg text-on-surface">Farmer Dashboard</h1>
          <p className="text-body-md text-on-surface-variant">Live overview of your harvest, orders, and sales performance.</p>
        </div>
        <Link
          to="/farmer/products/new"
          className="inline-flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-lg font-semibold text-label-md hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Icon name="add" size={18} />
          Add Product
        </Link>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <StatCard
            label="Orders (30d)"
            value={`${analytics?.orders30d ?? orders.length}`}
            icon="receipt_long"
            trend={analytics ? `+${analytics.ordersTrendPercent}%` : undefined}
          />
          <StatCard
            label="Revenue (30d)"
            value={formatINR(totalRevenue)}
            icon="account_balance_wallet"
            trend={analytics ? `+${analytics.revenueTrendPercent}%` : undefined}
          />
          <StatCard
            label="Active Products"
            value={`${inventory.length}`}
            icon="eco"
          />
          <StatCard
            label="Low Stock Items"
            value={`${lowStock.length}`}
            icon="warning"
          />
        </div>
      )}

      {lowStock.length > 0 && (
        <div className="mb-10 p-4 rounded-xl bg-error-container/30 border border-error/30 flex items-start gap-3">
          <Icon name="warning" className="text-error mt-0.5 shrink-0" size={20} />
          <div>
            <p className="font-semibold text-on-error-container">Inventory Alerts</p>
            <p className="text-body-md text-on-error-container/90">
              {lowStock.map((i) => i.name).join(", ")} {lowStock.length > 1 ? "are" : "is"} running low. Check your{" "}
              <Link to="/farmer/inventory" className="underline font-semibold hover:text-primary">
                inventory
              </Link>
              .
            </p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_360px] gap-gutter mb-10">
        <div className="bg-surface-bright rounded-xl border border-surface-variant p-6">
          <div className="flex items-center justify-between mb-4">
            <SectionHeading title="Revenue Trends" />
            <Link to="/farmer/analytics" className="text-label-sm font-semibold text-primary hover:underline">
              Detailed Analytics →
            </Link>
          </div>
          {chartData.length > 0 ? (
            <RevenueChart data={chartData} />
          ) : (
            <p className="text-body-md text-on-surface-variant py-10 text-center">No revenue data points available yet.</p>
          )}
        </div>

        <div className="bg-surface-bright rounded-xl border border-surface-variant p-6">
          <h2 className="font-display text-headline-sm text-on-surface mb-4">Current Harvests</h2>
          {inventory.length === 0 ? (
            <p className="text-body-md text-on-surface-variant">No products yet.</p>
          ) : (
            <div className="space-y-3">
              {inventory.slice(0, 6).map((item) => (
                <div key={item.productId} className="flex items-center gap-3">
                  <img src={item.image} alt={item.name} className="w-11 h-11 rounded-lg object-cover bg-surface-container" />
                  <div className="flex-1 min-w-0">
                    <p className="text-label-md font-semibold text-on-surface truncate">{item.name}</p>
                    <p className="text-label-sm text-on-surface-variant">
                      {item.stock} {item.unit} available
                    </p>
                  </div>
                  <Badge variant={item.status === "In Stock" ? "primary" : item.status === "Low Stock" ? "gold" : "error"}>
                    {item.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mb-10">
        <SectionHeading title="FarmDirect AI Insights" action={{ label: "View All", href: "/farmer/ai-insights" }} />
        <div className="grid sm:grid-cols-2 gap-4">
          {(insights.length > 0 ? insights.slice(0, 2) : []).map((insight) => (
            <div key={insight.id} className="flex gap-4 p-5 bg-surface-container-low rounded-xl border border-outline-variant hover:border-primary/30 transition-colors">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Icon name={insight.icon || "auto_awesome"} size={20} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="font-semibold text-on-surface truncate">{insight.title}</p>
                  {insight.impact && (
                    <span className="text-label-xs font-semibold text-primary shrink-0">{insight.impact}</span>
                  )}
                </div>
                <p className="text-body-md text-on-surface-variant line-clamp-2">{insight.message}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <SectionHeading title="Recent Orders" action={{ label: "View All", href: "/farmer/orders" }} />
        {recentOrders.length === 0 ? (
          <p className="text-body-md text-on-surface-variant">No orders yet.</p>
        ) : (
          <div className="bg-surface-bright rounded-xl border border-surface-variant divide-y divide-surface-variant">
            {recentOrders.map((o) => (
              <div key={o.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-semibold text-on-surface">#{o.orderNumber}</p>
                  <p className="text-label-sm text-on-surface-variant">
                    {o.items.length} item{o.items.length > 1 ? "s" : ""}
                  </p>
                </div>
                <Badge variant="outline">{o.farmerOrderStatus}</Badge>
                <span className="font-semibold text-on-surface">{formatINR(o.total)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Container>
  );
}
