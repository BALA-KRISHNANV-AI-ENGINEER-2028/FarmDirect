import { withTransaction } from "../config/database";
import { clearCart, listCartItemsByCustomerId } from "../models/cartItem.model";
import { findAddressById } from "../models/address.model";
import { insertInventoryMovement } from "../models/inventoryMovement.model";
import {
  farmerHasItemOnOrder,
  findOrderById,
  insertOrder,
  insertOrderItem,
  listOrderItemsByOrderId,
  listOrdersByCustomerId,
  listOrdersForFarmer,
  updateOrderStatus as updateOrderStatusModel,
  type OrderItemRow,
  type OrderRow,
} from "../models/order.model";
import { insertOrderStatusEvent, listOrderStatusEvents } from "../models/orderStatusEvent.model";
import { applyStockChange } from "../models/product.model";
import { HttpError } from "../utils/httpError";
import type { Pagination } from "../utils/pagination";

const DELIVERY_FEES: Record<string, number> = { standard: 25, express: 60 };
const DELIVERY_WINDOW_HOURS: Record<string, number> = { standard: 24, express: 4 };

// Canonical lifecycle — decision #2. CANCELLED is reachable from any
// non-terminal status, not a linear step, so it's handled separately below
// rather than living in this sequence.
const STATUS_SEQUENCE = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
] as const;

const TERMINAL_STATUSES = new Set(["DELIVERED", "CANCELLED"]);

function getAllowedNextStatuses(current: string): string[] {
  if (TERMINAL_STATUSES.has(current)) return [];
  const idx = STATUS_SEQUENCE.indexOf(current as (typeof STATUS_SEQUENCE)[number]);
  const next: string[] = ["CANCELLED"];
  if (idx >= 0 && idx < STATUS_SEQUENCE.length - 1) next.unshift(STATUS_SEQUENCE[idx + 1]);
  return next;
}

/**
 * Read-side mapping for the farmer kanban view (FarmerOrders.tsx) — a view
 * over the one canonical status, not a second stored field, per decision #2.
 */
const KANBAN_LABELS: Record<string, string> = {
  PENDING: "New",
  CONFIRMED: "Accepted",
  PREPARING: "Preparing",
  READY_FOR_PICKUP: "Ready for Pickup",
  OUT_FOR_DELIVERY: "Completed",
  DELIVERED: "Completed",
  CANCELLED: "Cancelled",
};

function toOrderSummary(order: OrderRow, items: OrderItemRow[]) {
  return {
    id: order.id,
    orderNumber: order.order_number,
    status: order.status,
    subtotal: Number(order.subtotal),
    deliveryFee: Number(order.delivery_fee),
    total: Number(order.total),
    deliveryMethod: order.delivery_method,
    paymentMethod: order.payment_method,
    // Was stored since Phase F but never actually surfaced in the API
    // response until Phase H integration needed it for the order tracking
    // page — a genuine gap, fixed here rather than worked around client-side.
    deliveryAddress: order.delivery_address_snapshot,
    estimatedDeliveryAt: order.estimated_delivery_at,
    placedAt: order.placed_at,
    items: items.map((i) => ({
      productId: i.product_id,
      name: i.name_snapshot,
      image: i.product_image,
      unit: i.unit_snapshot,
      price: Number(i.price_snapshot),
      quantity: i.quantity,
      farmId: i.farm_id,
      farmName: i.farm_name,
    })),
  };
}

export interface CreateOrderInput {
  addressId?: string;
  address?: {
    fullName?: string;
    phone?: string;
    addressLine: string;
    city?: string;
    state?: string;
    postalCode?: string;
  };
  deliveryMethod: "standard" | "express";
  paymentMethod: "upi" | "card" | "cod";
}

export async function createOrder(customerId: string, input: CreateOrderInput) {
  const cartItems = await listCartItemsByCustomerId(customerId);
  if (cartItems.length === 0) {
    throw HttpError.badRequest("Your cart is empty.");
  }

  // Verify availability before touching anything — a clean 409 listing the
  // specific products, rather than partially processing the order.
  const insufficientItems = cartItems.filter((i) => i.availability === "Out of Stock" || i.stock < i.quantity);
  if (insufficientItems.length > 0) {
    throw HttpError.conflict(
      "Some items in your cart are no longer available in the requested quantity.",
      insufficientItems.map((i) => ({ productId: i.product_id, name: i.product_name, availableStock: i.stock }))
    );
  }

  let deliveryAddressId: string | null = null;
  let addressSnapshot: unknown;

  if (input.addressId) {
    const address = await findAddressById(input.addressId);
    if (!address || address.customer_id !== customerId) {
      throw HttpError.badRequest("Delivery address not found.");
    }
    deliveryAddressId = address.id;
    addressSnapshot = {
      fullName: address.full_name,
      phone: address.phone,
      addressLine: address.address_line,
      city: address.city,
      state: address.state,
      postalCode: address.postal_code,
    };
  } else if (input.address) {
    addressSnapshot = input.address;
  } else {
    throw HttpError.badRequest("A delivery address is required.");
  }

  const deliveryFee = DELIVERY_FEES[input.deliveryMethod];
  const subtotal = cartItems.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);
  const total = subtotal + deliveryFee;
  const estimatedDeliveryAt = new Date(Date.now() + DELIVERY_WINDOW_HOURS[input.deliveryMethod] * 60 * 60 * 1000);

  const orderId = await withTransaction(async (client) => {
    const order = await insertOrder(
      {
        customerId,
        deliveryAddressId,
        deliveryAddressSnapshot: addressSnapshot,
        deliveryMethod: input.deliveryMethod,
        paymentMethod: input.paymentMethod,
        subtotal,
        deliveryFee,
        total,
        estimatedDeliveryAt,
      },
      client
    );

    for (const item of cartItems) {
      await insertOrderItem(
        {
          orderId: order.id,
          productId: item.product_id,
          farmId: item.farm_id,
          nameSnapshot: item.product_name,
          unitSnapshot: item.unit,
          priceSnapshot: Number(item.price),
          quantity: item.quantity,
        },
        client
      );

      // Guarded the same way as the farmer-facing inventory adjustment
      // (WHERE stock + change >= 0) — belt-and-suspenders against a race
      // between the availability check above and this transaction.
      const stockResult = await applyStockChange(item.product_id, -item.quantity, client);
      if (!stockResult) {
        throw HttpError.conflict(
          `${item.product_name} sold out while your order was being placed. Please update your cart and try again.`
        );
      }
      await insertInventoryMovement(
        { productId: item.product_id, change: -item.quantity, reason: "sale", orderId: order.id },
        client
      );
    }

    await insertOrderStatusEvent({ orderId: order.id, status: "PENDING" }, client);
    await clearCart(customerId, client);

    return order.id;
  });

  return getOrderDetail(orderId, { id: customerId, role: "customer" });
}

export async function getOrderDetail(orderId: string, requester: { id: string; role: "customer" | "farmer" }) {
  const order = await findOrderById(orderId);
  if (!order) throw HttpError.notFound("Order not found");

  if (requester.role === "customer" && order.customer_id !== requester.id) {
    throw HttpError.forbidden("You don't have permission to view this order.");
  }
  if (requester.role === "farmer") {
    const hasItem = await farmerHasItemOnOrder(orderId, requester.id);
    if (!hasItem) throw HttpError.forbidden("You don't have permission to view this order.");
  }

  const [items, statusEvents] = await Promise.all([
    listOrderItemsByOrderId(orderId),
    listOrderStatusEvents(orderId),
  ]);

  return {
    ...toOrderSummary(order, items),
    statusHistory: statusEvents.map((e) => ({ status: e.status, note: e.note, at: e.created_at })),
  };
}

export async function listMyOrders(customerId: string, pagination: Pagination) {
  const { rows, total } = await listOrdersByCustomerId(customerId, pagination.limit, pagination.offset);
  const withItems = await Promise.all(
    rows.map(async (order) => toOrderSummary(order, await listOrderItemsByOrderId(order.id)))
  );
  return { data: withItems, total };
}

/** Backs GET /api/farmer/orders — kanban-shaped: canonical status + its read-only label. */
export async function listFarmerOrders(farmerId: string, pagination: Pagination) {
  const { rows, total } = await listOrdersForFarmer(farmerId, pagination.limit, pagination.offset);
  const withItems = await Promise.all(
    rows.map(async (order) => {
      const allItems = await listOrderItemsByOrderId(order.id);
      // Only this farmer's line items — a shared order shouldn't show
      // another farmer's products on this farmer's kanban card.
      const myItems = allItems.filter((i) => i.farmer_id === farmerId);
      return { ...toOrderSummary(order, myItems), kanbanStatus: KANBAN_LABELS[order.status] ?? order.status };
    })
  );
  return { data: withItems, total };
}

export async function updateOrderStatus(farmerId: string, orderId: string, newStatus: string, note?: string) {
  const order = await findOrderById(orderId);
  if (!order) throw HttpError.notFound("Order not found");

  const hasItem = await farmerHasItemOnOrder(orderId, farmerId);
  if (!hasItem) throw HttpError.forbidden("You don't have permission to update this order.");

  const allowed = getAllowedNextStatuses(order.status);
  if (!allowed.includes(newStatus)) {
    throw HttpError.conflict(
      `Cannot move an order from ${order.status} to ${newStatus}.` +
        (allowed.length ? ` Allowed next: ${allowed.join(", ")}.` : " This order is already in a final state.")
    );
  }

  await withTransaction(async (client) => {
    await updateOrderStatusModel(orderId, newStatus, client);
    await insertOrderStatusEvent({ orderId, status: newStatus, note }, client);

    if (newStatus === "CANCELLED") {
      // Restock every item on the order, not just this farmer's — the
      // canonical status is order-wide (decision #2), so cancellation
      // cancels the whole order, and every reserved unit goes back to stock.
      const items = await listOrderItemsByOrderId(orderId, client);
      for (const item of items) {
        await applyStockChange(item.product_id, item.quantity, client);
        await insertInventoryMovement(
          {
            productId: item.product_id,
            change: item.quantity,
            reason: "order_cancelled",
            orderId,
            note: "Order cancelled — stock restored",
          },
          client
        );
      }
    }
  });

  return getOrderDetail(orderId, { id: farmerId, role: "farmer" });
}
