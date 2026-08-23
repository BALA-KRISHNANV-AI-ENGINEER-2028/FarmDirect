import { api } from "./apiClient";
import type { Order, OrderItem, OrderStatus } from "../types";

interface ApiOrderItem {
  productId: string;
  name: string;
  image: string | null;
  unit: string;
  price: number;
  quantity: number;
  farmId: string;
  farmName: string;
}

interface ApiOrder {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  deliveryMethod: string | null;
  paymentMethod: string | null;
  deliveryAddress: {
    fullName?: string | null;
    phone?: string | null;
    addressLine: string;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
  } | null;
  estimatedDeliveryAt: string | null;
  placedAt: string;
  items: ApiOrderItem[];
  statusHistory?: { status: string; note: string | null; at: string }[];
  kanbanStatus?: string;
}

function toOrderItem(dto: ApiOrderItem): OrderItem {
  return {
    productId: dto.productId,
    name: dto.name,
    image: dto.image ?? "",
    quantity: dto.quantity,
    unit: dto.unit,
    price: dto.price,
    farmId: dto.farmId,
    farmName: dto.farmName,
  };
}

function toOrder(dto: ApiOrder): Order {
  const addr = dto.deliveryAddress;
  const deliveryAddress = addr
    ? [addr.addressLine, addr.city, addr.state, addr.postalCode].filter(Boolean).join(", ")
    : "";
  return {
    id: dto.id,
    orderNumber: dto.orderNumber,
    date: dto.placedAt,
    status: dto.status as OrderStatus,
    items: dto.items.map(toOrderItem),
    total: dto.total,
    deliveryAddress,
    estimatedDelivery: dto.estimatedDeliveryAt ?? "",
    farmerOrderStatus: dto.kanbanStatus as Order["farmerOrderStatus"],
  };
}

export async function fetchMyOrders(): Promise<Order[]> {
  const res = await api.get<{ data: ApiOrder[] }>("/orders");
  return res.data.map(toOrder);
}

export async function fetchOrder(id: string): Promise<Order> {
  const res = await api.get<{ order: ApiOrder }>(`/orders/${id}`);
  return toOrder(res.order);
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

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const res = await api.post<{ order: ApiOrder }>("/orders", input);
  return toOrder(res.order);
}

export async function fetchFarmerOrders(): Promise<Order[]> {
  const res = await api.get<{ data: ApiOrder[] }>("/farmer/orders");
  return res.data.map(toOrder);
}

export async function updateOrderStatus(orderId: string, status: OrderStatus, note?: string): Promise<Order> {
  const res = await api.put<{ order: ApiOrder }>(`/orders/${orderId}/status`, { status, note });
  return toOrder(res.order);
}
