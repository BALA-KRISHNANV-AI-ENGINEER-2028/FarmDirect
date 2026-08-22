import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Container } from "../../components/ui/Card";
import Icon from "../../components/ui/Icon";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import Skeleton from "../../components/ui/Skeleton";
import { fetchMyOrders } from "../../services/ordersApi";
import { formatDate, formatINR } from "../../utils/format";
import type { Order, OrderStatus } from "../../types";

const statusVariant: Record<OrderStatus, "primary" | "gold" | "neutral" | "error"> = {
  PENDING: "gold",
  CONFIRMED: "gold",
  PREPARING: "gold",
  READY_FOR_PICKUP: "gold",
  OUT_FOR_DELIVERY: "primary",
  DELIVERED: "neutral",
  CANCELLED: "error",
};

const statusLabel: Record<OrderStatus, string> = {
  PENDING: "Order Placed",
  CONFIRMED: "Order Confirmed",
  PREPARING: "Farmer Preparing",
  READY_FOR_PICKUP: "Ready for Pickup",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export default function Orders() {
  const [orders, setOrders] = useState<Order[] | null>(null);

  useEffect(() => {
    fetchMyOrders()
      .then(setOrders)
      .catch(() => setOrders([]));
  }, []);

  if (orders === null) {
    return (
      <Container className="py-stack-lg">
        <Skeleton className="h-8 w-48 mb-8" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </Container>
    );
  }

  const active = orders.filter((o) => o.status !== "DELIVERED" && o.status !== "CANCELLED");
  const past = orders.filter((o) => o.status === "DELIVERED" || o.status === "CANCELLED");

  return (
    <Container className="py-stack-lg">
      <h1 className="font-display text-headline-lg-mobile md:text-headline-lg text-on-surface mb-8">Your Orders</h1>

      {orders.length === 0 ? (
        <EmptyState
          icon="receipt_long"
          title="No orders yet"
          description="Your order history will appear here once you place your first order."
          action={
            <Link to="/marketplace">
              <Button>Start Shopping</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-10">
          {active.length > 0 && (
            <div>
              <h2 className="font-display text-headline-sm text-on-surface mb-4">Current Orders</h2>
              <div className="space-y-3">
                {active.map((o) => (
                  <OrderCard key={o.id} order={o} />
                ))}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h2 className="font-display text-headline-sm text-on-surface mb-4">Previous Orders</h2>
              <div className="space-y-3">
                {past.map((o) => (
                  <OrderCard key={o.id} order={o} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Container>
  );
}

function OrderCard({ order }: { order: Order }) {
  return (
    <Link
      to={`/orders/${order.id}`}
      className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 bg-surface-bright rounded-xl border border-surface-variant hover:border-primary-fixed-dim transition-colors"
    >
      <div className="flex -space-x-3 shrink-0">
        {order.items.slice(0, 3).map((item) => (
          <img
            key={item.productId}
            src={item.image}
            alt={item.name}
            className="w-14 h-14 rounded-lg object-cover border-2 border-surface-bright"
          />
        ))}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <p className="font-semibold text-on-surface">Order #{order.orderNumber}</p>
          <Badge variant={statusVariant[order.status]}>{statusLabel[order.status]}</Badge>
        </div>
        <p className="text-label-sm text-on-surface-variant">
          {order.items.length} item{order.items.length > 1 ? "s" : ""} · Placed {formatDate(order.date)}
        </p>
      </div>
      <div className="flex items-center gap-4">
        <span className="font-semibold text-on-surface">{formatINR(order.total)}</span>
        <Icon name="chevron_right" className="text-outline" />
      </div>
    </Link>
  );
}
