import { useEffect, useState } from "react";
import { Container } from "../../components/ui/Card";
import Icon from "../../components/ui/Icon";
import Badge from "../../components/ui/Badge";
import Skeleton from "../../components/ui/Skeleton";
import Button from "../../components/ui/Button";
import { fetchFarmerOrders, updateOrderStatus } from "../../services/ordersApi";
import { formatINR, formatDate } from "../../utils/format";
import { cn } from "../../utils/cn";
import type { FarmerOrderStatus, Order, OrderStatus } from "../../types";
import { useToast } from "../../components/ui/Toast";
import { getErrorMessage } from "../../services/apiClient";

const columns: { label: FarmerOrderStatus; statuses: OrderStatus[] }[] = [
  { label: "New", statuses: ["PENDING", "CONFIRMED"] },
  { label: "Preparing", statuses: ["PREPARING"] },
  { label: "Ready for Pickup", statuses: ["READY_FOR_PICKUP"] },
  { label: "Completed", statuses: ["OUT_FOR_DELIVERY", "DELIVERED"] },
];

const statusFlow: { current: OrderStatus; next: OrderStatus; label: string }[] = [
  { current: "PENDING", next: "CONFIRMED", label: "Accept & Confirm" },
  { current: "CONFIRMED", next: "PREPARING", label: "Start Preparing" },
  { current: "PREPARING", next: "READY_FOR_PICKUP", label: "Mark Ready" },
  { current: "READY_FOR_PICKUP", next: "OUT_FOR_DELIVERY", label: "Dispatch / Out for Delivery" },
  { current: "OUT_FOR_DELIVERY", next: "DELIVERED", label: "Mark Delivered" },
];

export default function FarmerOrders() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [advancing, setAdvancing] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"board" | "list">("board");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const { showToast } = useToast();

  const load = () => {
    fetchFarmerOrders()
      .then(setOrders)
      .catch(() => setOrders([]));
  };

  useEffect(load, []);

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    setAdvancing(orderId);
    try {
      await updateOrderStatus(orderId, newStatus);
      showToast(`Order status updated to ${newStatus.replace(/_/g, " ")}`, "success");
      load();
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch (err) {
      showToast(getErrorMessage(err), "error");
    } finally {
      setAdvancing(null);
      setIsCancelling(false);
    }
  };

  const handleCancelOrder = async (order: Order) => {
    if (!window.confirm(`Are you sure you want to cancel order #${order.orderNumber}? Any reserved stock will be returned to inventory.`)) {
      return;
    }
    setIsCancelling(true);
    await handleUpdateStatus(order.id, "CANCELLED");
  };

  if (orders === null) {
    return (
      <Container className="py-stack-lg">
        <Skeleton className="h-8 w-48 mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      </Container>
    );
  }

  const filteredOrders = orders.filter((o) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      o.orderNumber.toLowerCase().includes(q) ||
      (o.deliveryAddress && o.deliveryAddress.toLowerCase().includes(q)) ||
      o.items.some((i) => i.name.toLowerCase().includes(q))
    );
  });

  return (
    <Container className="py-stack-lg">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-headline-lg-mobile md:text-headline-lg text-on-surface">Farmer Orders</h1>
          <p className="text-body-md text-on-surface-variant">
            Track fulfillment, update order progress, and view delivery details.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input
              type="text"
              placeholder="Search by # or item..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 rounded-lg border border-surface-variant bg-surface-bright text-body-sm text-on-surface focus:outline-none focus:border-primary w-48 sm:w-56"
            />
          </div>

          <div className="flex items-center rounded-lg border border-surface-variant p-1 bg-surface-bright">
            <button
              onClick={() => setViewMode("board")}
              className={`px-3 py-1 text-label-sm font-medium rounded ${
                viewMode === "board" ? "bg-primary text-on-primary" : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Board
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1 text-label-sm font-medium rounded ${
                viewMode === "list" ? "bg-primary text-on-primary" : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              List
            </button>
          </div>

          <button
            onClick={load}
            className="p-2 rounded-lg border border-surface-variant text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors"
            title="Refresh orders"
          >
            <Icon name="refresh" size={18} />
          </button>
        </div>
      </div>

      {viewMode === "board" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {columns.map((col) => {
            const colOrders = filteredOrders.filter((o) => col.statuses.includes(o.status));
            return (
              <div key={col.label} className="bg-surface-container-low rounded-xl p-3 min-h-[300px] flex flex-col">
                <div className="flex items-center justify-between mb-3 px-1">
                  <h2 className="text-label-md font-semibold text-on-surface">{col.label}</h2>
                  <Badge variant="neutral">{colOrders.length}</Badge>
                </div>
                <div className="space-y-3 flex-1">
                  {colOrders.map((o) => {
                    const nextStep = statusFlow.find((f) => f.current === o.status);
                    return (
                      <div
                        key={o.id}
                        className="bg-surface-bright rounded-xl border border-surface-variant p-4 hover:border-primary/40 transition-colors shadow-sm cursor-pointer"
                        onClick={() => setSelectedOrder(o)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-on-surface text-label-md">#{o.orderNumber}</span>
                          <span className="text-label-xs text-on-surface-variant">{formatDate(o.date)}</span>
                        </div>
                        <p className="text-label-sm text-on-surface-variant line-clamp-2 mb-3">
                          {o.items.map((i) => `${i.quantity}${i.unit} ${i.name}`).join(", ")}
                        </p>
                        <div className="flex items-center justify-between pt-2 border-t border-surface-variant">
                          <span className="text-label-md font-semibold text-primary">{formatINR(o.total)}</span>
                          {nextStep && o.status !== "CANCELLED" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateStatus(o.id, nextStep.next);
                              }}
                              disabled={advancing === o.id}
                              className="inline-flex items-center gap-1 text-label-sm font-semibold text-primary hover:underline disabled:opacity-50"
                            >
                              {nextStep.label} <Icon name="arrow_forward" size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {colOrders.length === 0 && (
                    <p className={cn("text-label-sm text-on-surface-variant/60 text-center py-10")}>No orders in this stage</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-surface-bright rounded-xl border border-surface-variant overflow-hidden">
          <div className="hidden md:grid grid-cols-[120px_1fr_100px_130px_180px_auto] gap-4 px-5 py-3 bg-surface-container-low text-label-sm font-semibold text-on-surface-variant uppercase">
            <span>Order #</span>
            <span>Items</span>
            <span>Total</span>
            <span>Status</span>
            <span>Next Action</span>
            <span>Details</span>
          </div>
          <div className="divide-y divide-surface-variant">
            {filteredOrders.length === 0 ? (
              <div className="p-8 text-center text-on-surface-variant">No orders found.</div>
            ) : (
              filteredOrders.map((o) => {
                const nextStep = statusFlow.find((f) => f.current === o.status);
                return (
                  <div
                    key={o.id}
                    className="grid grid-cols-1 md:grid-cols-[120px_1fr_100px_130px_180px_auto] gap-4 px-5 py-4 items-center hover:bg-surface-container-low/40 transition-colors"
                  >
                    <div>
                      <p className="font-semibold text-on-surface text-label-md">#{o.orderNumber}</p>
                      <p className="text-label-xs text-on-surface-variant">{formatDate(o.date)}</p>
                    </div>
                    <p className="text-body-sm text-on-surface-variant truncate">
                      {o.items.map((i) => `${i.quantity}${i.unit} ${i.name}`).join(", ")}
                    </p>
                    <span className="font-semibold text-on-surface">{formatINR(o.total)}</span>
                    <div>
                      <Badge
                        variant={
                          o.status === "DELIVERED"
                            ? "primary"
                            : o.status === "CANCELLED"
                            ? "error"
                            : o.status === "OUT_FOR_DELIVERY"
                            ? "gold"
                            : "outline"
                        }
                      >
                        {o.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <div>
                      {nextStep && o.status !== "CANCELLED" ? (
                        <button
                          onClick={() => handleUpdateStatus(o.id, nextStep.next)}
                          disabled={advancing === o.id}
                          className="px-3 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-on-primary text-label-sm font-medium transition-colors"
                        >
                          {nextStep.label}
                        </button>
                      ) : (
                        <span className="text-label-sm text-on-surface-variant">—</span>
                      )}
                    </div>
                    <div>
                      <button
                        onClick={() => setSelectedOrder(o)}
                        className="text-label-sm font-semibold text-primary hover:underline"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface-bright rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-surface-variant max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-surface-variant shrink-0">
              <div>
                <h3 className="font-display text-headline-sm text-on-surface">Order #{selectedOrder.orderNumber}</h3>
                <p className="text-label-sm text-on-surface-variant">Placed on {formatDate(selectedOrder.date)}</p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-on-surface-variant hover:text-on-surface"
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-5 pr-1">
              {/* Status Banner */}
              <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-variant flex items-center justify-between">
                <span className="text-label-sm font-medium text-on-surface">Current Fulfillment Status</span>
                <Badge
                  variant={
                    selectedOrder.status === "DELIVERED"
                      ? "primary"
                      : selectedOrder.status === "CANCELLED"
                      ? "error"
                      : "gold"
                  }
                >
                  {selectedOrder.status.replace(/_/g, " ")}
                </Badge>
              </div>

              {/* Items List */}
              <div>
                <h4 className="text-label-md font-semibold text-on-surface mb-3">Order Items</h4>
                <div className="divide-y divide-surface-variant border border-surface-variant rounded-xl overflow-hidden">
                  {selectedOrder.items.map((item, index) => (
                    <div key={index} className="p-3 flex items-center justify-between gap-3 bg-surface-bright">
                      <div className="flex items-center gap-3">
                        {item.image && (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-10 h-10 rounded-lg object-cover bg-surface-container shrink-0"
                          />
                        )}
                        <div>
                          <p className="text-label-md font-semibold text-on-surface">{item.name}</p>
                          <p className="text-label-sm text-on-surface-variant">
                            {item.quantity} {item.unit} &times; {formatINR(item.price)}
                          </p>
                        </div>
                      </div>
                      <span className="text-label-md font-semibold text-on-surface">
                        {formatINR(item.quantity * item.price)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center pt-3 px-1">
                  <span className="text-body-md font-semibold text-on-surface">Total Order Amount</span>
                  <span className="text-headline-sm text-primary font-bold">{formatINR(selectedOrder.total)}</span>
                </div>
              </div>

              {/* Delivery Details */}
              {selectedOrder.deliveryAddress && (
                <div>
                  <h4 className="text-label-md font-semibold text-on-surface mb-2">Delivery Information</h4>
                  <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-variant text-body-sm text-on-surface">
                    <p className="flex items-start gap-2">
                      <Icon name="location_on" size={16} className="text-primary mt-0.5 shrink-0" />
                      <span>{selectedOrder.deliveryAddress}</span>
                    </p>
                    {selectedOrder.estimatedDelivery && (
                      <p className="flex items-center gap-2 mt-2 text-on-surface-variant">
                        <Icon name="schedule" size={16} className="text-primary shrink-0" />
                        <span>Est. Delivery: {selectedOrder.estimatedDelivery}</span>
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Status Update Actions */}
              {selectedOrder.status !== "DELIVERED" && selectedOrder.status !== "CANCELLED" && (
                <div className="pt-2">
                  <h4 className="text-label-md font-semibold text-on-surface mb-2">Update Stage</h4>
                  <div className="flex flex-wrap gap-2">
                    {statusFlow.map((step) => (
                      <button
                        key={step.next}
                        onClick={() => handleUpdateStatus(selectedOrder.id, step.next)}
                        disabled={advancing === selectedOrder.id}
                        className={`px-3 py-1.5 rounded-lg text-label-sm font-medium border transition-colors ${
                          selectedOrder.status === step.current
                            ? "bg-primary text-on-primary border-primary"
                            : "border-surface-variant text-on-surface hover:bg-surface-container-low"
                        }`}
                      >
                        {step.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-surface-variant flex items-center justify-between shrink-0">
              {selectedOrder.status !== "CANCELLED" && selectedOrder.status !== "DELIVERED" ? (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleCancelOrder(selectedOrder)}
                  disabled={isCancelling || advancing === selectedOrder.id}
                >
                  Cancel Order
                </Button>
              ) : (
                <div />
              )}

              <Button variant="outline" size="sm" onClick={() => setSelectedOrder(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </Container>
  );
}
