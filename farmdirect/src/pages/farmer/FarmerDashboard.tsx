import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Container, SectionHeading } from "../../components/ui/Card";
import StatCard from "../../components/ui/StatCard";
import Icon from "../../components/ui/Icon";
import Badge from "../../components/ui/Badge";
import Skeleton from "../../components/ui/Skeleton";
import RevenueChart from "../../components/charts/RevenueChart";
import { revenueTrend, aiInsights } from "../../data/orders";
import { fetchInventory } from "../../services/inventoryApi";
import { fetchFarmerOrders } from "../../services/ordersApi";
import { formatINR } from "../../utils/format";
import type { InventoryItem, Order } from "../../types";

export default function FarmerDashboard() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchInventory().catch(() => []), fetchFarmerOrders().catch(() => [])]).then(([inv, ord]) => {
      setInventory(inv);
      setOrders(ord);
      setLoading(false);
    });
  }, []);

  const lowStock = inventory.filter((i) => i.status === "Low Stock" || i.status === "Out of Stock");
  const recentOrders = orders.slice(0, 4);
  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);

  return (
    <Container className="py-stack-lg">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-headline-lg-mobile md:text-headline-lg text-on-surface">Farmer Dashboard</h1>
          <p className="text-body-md text-on-surface-variant">Here's your farm at a glance.</p>
        </div>
        <Link to="/farmer/products/new" className="inline-flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-lg font-semibold text-label-md hover:bg-primary-container">
          <Icon name="add" size={18} />
          Add Product
        </Link>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <StatCard label="Orders (all time)" value={`${orders.length}`} icon="receipt_long" />
          <StatCard label="Revenue (all time)" value={formatINR(totalRevenue)} icon="account_balance_wallet" />
          <StatCard label="Active Products" value={`${inventory.length}`} icon="eco" />
          <StatCard label="Low Stock Items" value={`${lowStock.length}`} icon="warning" />
        </div>
      )}

      {lowStock.length > 0 && (
        <div className="mb-10 p-4 rounded-xl bg-error-container/40 border border-error/20 flex items-start gap-3">
          <Icon name="warning" className="text-error mt-0.5" size={20} />
          <div>
            <p className="font-semibold text-on-error-container">Inventory Alerts</p>
            <p className="text-body-md text-on-error-container/90">
              {lowStock.map((i) => i.name).join(", ")} {lowStock.length > 1 ? "are" : "is"} running low. Check your{" "}
              <Link to="/farmer/inventory" className="underline font-semibold">inventory</Link>.
            </p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_360px] gap-gutter mb-10">
        <div className="bg-surface-bright rounded-xl border border-surface-variant p-6">
          <SectionHeading title="Revenue Trends" />
          <p className="text-label-sm text-on-surface-variant -mt-4 mb-4">Demo data — analytics aren't part of the backend yet.</p>
          <RevenueChart data={revenueTrend} />
        </div>
        <div className="bg-surface-bright rounded-xl border border-surface-variant p-6">
          <h2 className="font-display text-headline-sm text-on-surface mb-4">Current Harvests</h2>
          {inventory.length === 0 ? (
            <p className="text-body-md text-on-surface-variant">No products yet.</p>
          ) : (
            <div className="space-y-3">
              {inventory.slice(0, 6).map((item) => (
                <div key={item.productId} className="flex items-center gap-3">
                  <img src={item.image} alt={item.name} className="w-11 h-11 rounded-lg object-cover" />
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
        <p className="text-label-sm text-on-surface-variant -mt-4 mb-4">Preview experience — not yet backed by a live AI service.</p>
        <div className="grid sm:grid-cols-2 gap-4">
          {aiInsights.slice(0, 2).map((insight) => (
            <div key={insight.id} className="flex gap-4 p-5 bg-surface-container-low rounded-xl border border-outline-variant">
              <div className="w-10 h-10 rounded-full bg-tertiary-fixed flex items-center justify-center shrink-0">
                <Icon name={insight.icon} size={20} className="text-on-tertiary-fixed-variant" />
              </div>
              <div>
                <p className="font-semibold text-on-surface mb-1">{insight.title}</p>
                <p className="text-body-md text-on-surface-variant">{insight.message}</p>
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
