import { useEffect, useState } from "react";
import { Container } from "../../components/ui/Card";
import Icon from "../../components/ui/Icon";
import Badge from "../../components/ui/Badge";
import Skeleton from "../../components/ui/Skeleton";
import { fetchFarmerOrders, updateOrderStatus } from "../../services/ordersApi";
import { formatINR } from "../../utils/format";
import { cn } from "../../utils/cn";
import type { FarmerOrderStatus, Order, OrderStatus } from "../../types";

const columns: FarmerOrderStatus[] = ["New", "Accepted", "Preparing", "Ready for Pickup", "Completed"];

const nextStatus: Record<OrderStatus, OrderStatus | null> = {
  PENDING: "CONFIRMED",
  CONFIRMED: "PREPARING",
  PREPARING: "READY_FOR_PICKUP",
  READY_FOR_PICKUP: "OUT_FOR_DELIVERY",
  OUT_FOR_DELIVERY: "DELIVERED",
  DELIVERED: null,
  CANCELLED: null,
};

export default function FarmerOrders() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [advancing, setAdvancing] = useState<string | null>(null);

  const load = () => {
    fetchFarmerOrders()
      .then(setOrders)
      .catch(() => setOrders([]));
  };

  useEffect(load, []);

  const advance = async (order: Order) => {
    const next = nextStatus[order.status];
    if (!next) return;
    setAdvancing(order.id);
    try {
      await updateOrderStatus(order.id, next);
      load();
    } catch {
      // no-op — an invalid/rejected transition just leaves the board unchanged
    } finally {
      setAdvancing(null);
    }
  };

  if (orders === null) {
    return (
      <Container className="py-stack-lg">
        <Skeleton className="h-8 w-48 mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-stack-lg">
      <h1 className="font-display text-headline-lg-mobile md:text-headline-lg text-on-surface mb-8">Farmer Orders</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {columns.map((col) => {
          const colOrders = orders.filter((o) => o.farmerOrderStatus === col);
          return (
            <div key={col} className="bg-surface-container-low rounded-xl p-3 min-h-[200px]">
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-label-md font-semibold text-on-surface">{col}</h2>
                <Badge variant="neutral">{colOrders.length}</Badge>
              </div>
              <div className="space-y-3">
                {colOrders.map((o) => (
                  <div key={o.id} className="bg-surface-bright rounded-lg border border-surface-variant p-3">
                    <p className="font-semibold text-on-surface text-label-md mb-1">#{o.orderNumber}</p>
                    <p className="text-label-sm text-on-surface-variant mb-2">
                      {o.items.map((i) => `${i.quantity}${i.unit} ${i.name}`).join(", ")}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-label-md font-semibold text-primary">{formatINR(o.total)}</span>
                      {col !== "Completed" && nextStatus[o.status] && (
                        <button
                          onClick={() => advance(o)}
                          disabled={advancing === o.id}
                          className="flex items-center gap-1 text-label-sm font-semibold text-primary hover:underline disabled:opacity-50"
                        >
                          Advance <Icon name="arrow_forward" size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {colOrders.length === 0 && <p className={cn("text-label-sm text-outline text-center py-6")}>No orders</p>}
              </div>
            </div>
          );
        })}
      </div>
    </Container>
  );
}
