import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Container, SectionHeading } from "../../components/ui/Card";
import Icon from "../../components/ui/Icon";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Skeleton from "../../components/ui/Skeleton";
import StatusStepper from "../../components/orders/StatusStepper";
import ProductCard from "../../components/products/ProductCard";
import FarmCard from "../../components/farms/FarmCard";
import { useFavorites } from "../../hooks/useFavorites";
import { fetchMyOrders } from "../../services/ordersApi";
import { fetchFavoriteProductDetails } from "../../services/favoritesApi";
import { fetchProducts } from "../../services/productsApi";
import { fetchFarms } from "../../services/farmsApi";
import { formatDate, formatINR } from "../../utils/format";
import type { Farm, Order, Product } from "../../types";

const statusLabel: Record<string, string> = {
  PENDING: "Order Placed",
  CONFIRMED: "Order Confirmed",
  PREPARING: "Farmer Preparing",
  READY_FOR_PICKUP: "Ready for Pickup",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export default function CustomerDashboard() {
  const { products: favProductIds, farms: favFarmIds } = useFavorites();

  const [orders, setOrders] = useState<Order[]>([]);
  const [favProducts, setFavProducts] = useState<Product[]>([]);
  const [recommended, setRecommended] = useState<Product[]>([]);
  const [nearbyFarms, setNearbyFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchMyOrders().catch(() => []),
      fetchProducts({ sort: "rating", limit: 3 }).then((r) => r.products).catch(() => []),
      fetchFarms({ limit: 2 }).then((r) => r.farms).catch(() => []),
    ]).then(([o, rec, farms]) => {
      setOrders(o);
      setRecommended(rec);
      setNearbyFarms(farms);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    fetchFavoriteProductDetails(favProductIds.slice(0, 3))
      .then(setFavProducts)
      .catch(() => setFavProducts([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favProductIds.join(",")]);

  const activeOrder = orders.find((o) => o.status !== "DELIVERED" && o.status !== "CANCELLED");
  const recentOrders = orders.slice(0, 3);
  const totalSpend = orders.reduce((sum, o) => sum + o.total, 0);

  if (loading) {
    return (
      <Container className="py-stack-lg">
        <Skeleton className="h-8 w-64 mb-8" />
        <div className="grid sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-stack-lg">
      <h1 className="font-display text-headline-lg-mobile md:text-headline-lg text-on-surface mb-1">Welcome back.</h1>
      <p className="text-body-md text-on-surface-variant mb-8">Here's what's happening with your FarmDirect orders.</p>

      <div className="grid sm:grid-cols-3 gap-4 mb-10">
        <div className="bg-surface-bright rounded-xl border border-surface-variant p-5">
          <Icon name="receipt_long" className="text-primary mb-2" size={22} />
          <p className="font-display text-headline-md text-on-surface">{orders.length}</p>
          <p className="text-label-sm text-on-surface-variant">Total Orders</p>
        </div>
        <div className="bg-surface-bright rounded-xl border border-surface-variant p-5">
          <Icon name="payments" className="text-primary mb-2" size={22} />
          <p className="font-display text-headline-md text-on-surface">{formatINR(totalSpend)}</p>
          <p className="text-label-sm text-on-surface-variant">Total Spent</p>
        </div>
        <div className="bg-surface-bright rounded-xl border border-surface-variant p-5">
          <Icon name="favorite" className="text-primary mb-2" size={22} />
          <p className="font-display text-headline-md text-on-surface">{favProductIds.length + favFarmIds.length}</p>
          <p className="text-label-sm text-on-surface-variant">Favorites Saved</p>
        </div>
      </div>

      {activeOrder && (
        <div className="mb-12">
          <SectionHeading title="Active Delivery" action={{ label: "Track Order", href: `/orders/${activeOrder.id}` }} />
          <div className="bg-surface-bright rounded-xl border border-surface-variant p-6 md:p-8 grid md:grid-cols-[1fr_auto] gap-6">
            <StatusStepper status={activeOrder.status} />
            <div className="md:border-l border-surface-variant md:pl-6 flex flex-col justify-center">
              <p className="text-label-sm text-on-surface-variant mb-1">Order #{activeOrder.orderNumber}</p>
              <p className="font-semibold text-on-surface mb-3">
                {activeOrder.estimatedDelivery ? formatDate(activeOrder.estimatedDelivery) : statusLabel[activeOrder.status]}
              </p>
              <Link to={`/orders/${activeOrder.id}`}>
                <Button size="sm" variant="outline">View Details</Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {recentOrders.length > 0 && (
        <div className="mb-12">
          <SectionHeading title="Recent Orders" action={{ label: "View All", href: "/customer/orders" }} />
          <div className="space-y-3">
            {recentOrders.map((o) => (
              <Link
                key={o.id}
                to={`/orders/${o.id}`}
                className="flex items-center justify-between p-4 bg-surface-bright rounded-xl border border-surface-variant hover:border-primary-fixed-dim"
              >
                <div>
                  <p className="font-semibold text-on-surface">#{o.orderNumber}</p>
                  <p className="text-label-sm text-on-surface-variant">{formatDate(o.date)}</p>
                </div>
                <Badge variant="outline">{statusLabel[o.status]}</Badge>
                <span className="font-semibold text-on-surface">{formatINR(o.total)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {favProducts.length > 0 && (
        <div className="mb-12">
          <SectionHeading title="Your Favorites" action={{ label: "View All", href: "/favorites" }} />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-gutter">
            {favProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}

      {recommended.length > 0 && (
        <div className="mb-12">
          <SectionHeading title="Recommended for You" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-gutter">
            {recommended.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}

      {nearbyFarms.length > 0 && (
        <div>
          <SectionHeading title="Farms Near You" action={{ label: "View All", href: "/farms" }} />
          <div className="grid sm:grid-cols-2 gap-gutter">
            {nearbyFarms.map((f) => (
              <FarmCard key={f.id} farm={f} />
            ))}
          </div>
        </div>
      )}
    </Container>
  );
}
