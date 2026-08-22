import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Container } from "../../components/ui/Card";
import Icon from "../../components/ui/Icon";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import Skeleton from "../../components/ui/Skeleton";
import StatusStepper from "../../components/orders/StatusStepper";
import { fetchOrder } from "../../services/ordersApi";
import { formatDate, formatINR } from "../../utils/format";
import type { Order } from "../../types";

export default function OrderTracking() {
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null | undefined>(undefined);

  useEffect(() => {
    if (!id) return;
    fetchOrder(id)
      .then(setOrder)
      .catch(() => setOrder(null));
  }, [id]);

  if (order === undefined) {
    return (
      <Container className="py-stack-lg">
        <Skeleton className="h-8 w-48 mb-8" />
        <Skeleton className="h-64 w-full" />
      </Container>
    );
  }

  if (!order) {
    return (
      <Container className="py-16">
        <EmptyState
          icon="receipt_long"
          title="Order not found"
          action={
            <Link to="/orders">
              <Button variant="outline">Back to Orders</Button>
            </Link>
          }
        />
      </Container>
    );
  }

  return (
    <Container className="py-stack-lg">
      <nav className="text-label-sm text-on-surface-variant mb-6 flex items-center gap-1.5">
        <Link to="/orders" className="hover:text-primary">Orders</Link>
        <Icon name="chevron_right" size={14} />
        <span className="text-on-surface">#{order.orderNumber}</span>
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-headline-lg-mobile md:text-headline-lg text-on-surface">Order #{order.orderNumber}</h1>
          <p className="text-body-md text-on-surface-variant">Placed on {formatDate(order.date)}</p>
        </div>
        {order.estimatedDelivery && (
          <div className="bg-primary-container/15 text-primary px-4 py-2 rounded-lg text-label-md font-semibold flex items-center gap-2">
            <Icon name="schedule" size={18} />
            Est. delivery {formatDate(order.estimatedDelivery)}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-[1fr_360px] gap-gutter items-start">
        <div className="bg-surface-bright rounded-xl border border-surface-variant p-6 md:p-8">
          <h2 className="font-display text-headline-sm text-on-surface mb-6">Delivery Status</h2>
          <StatusStepper status={order.status} />
        </div>

        <div className="space-y-6">
          <div className="bg-surface-bright rounded-xl border border-surface-variant p-5">
            <h2 className="font-display text-headline-sm text-on-surface mb-4">Order Contents</h2>
            <div className="space-y-3 mb-4">
              {order.items.map((item) => (
                <div key={item.productId} className="flex items-center gap-3">
                  <img src={item.image} alt={item.name} className="w-12 h-12 rounded-lg object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="text-label-md font-semibold text-on-surface truncate">{item.name}</p>
                    <p className="text-label-sm text-on-surface-variant">
                      {item.quantity} {item.unit} · {item.farmName}
                    </p>
                  </div>
                  <span className="text-label-md font-semibold text-on-surface">{formatINR(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between font-semibold text-on-surface pt-4 border-t border-surface-variant">
              <span>Total</span>
              <span>{formatINR(order.total)}</span>
            </div>
          </div>

          {order.deliveryAddress && (
            <div className="bg-surface-bright rounded-xl border border-surface-variant p-5">
              <h2 className="font-display text-headline-sm text-on-surface mb-3 flex items-center gap-2">
                <Icon name="location_on" size={18} className="text-primary" />
                Delivery Address
              </h2>
              <p className="text-body-md text-on-surface-variant">{order.deliveryAddress}</p>
            </div>
          )}
        </div>
      </div>
    </Container>
  );
}
