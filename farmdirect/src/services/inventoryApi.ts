import { api } from "./apiClient";
import type { InventoryItem } from "../types";

interface ApiInventoryItem {
  productId: string;
  name: string;
  image: string | null;
  farmId: string;
  farmName: string;
  stock: number;
  unit: string;
  status: string;
  harvestDate: string | null;
  lastMovement: { change: number; reason: string; note: string | null; at: string } | null;
}

function formatMovement(m: ApiInventoryItem["lastMovement"]): string {
  if (!m) return "No movements yet";
  const sign = m.change > 0 ? "+" : "";
  const reasonLabel: Record<string, string> = {
    harvest: "harvested",
    sale: "sold",
    adjustment: "adjusted",
    order_cancelled: "restocked (order cancelled)",
  };
  return `${sign}${m.change} ${reasonLabel[m.reason] ?? m.reason}`;
}

function toInventoryItem(dto: ApiInventoryItem): InventoryItem {
  return {
    productId: dto.productId,
    name: dto.name,
    image: dto.image ?? "",
    stock: dto.stock,
    unit: dto.unit,
    status: dto.status as InventoryItem["status"],
    harvestDate: dto.harvestDate ?? "",
    lastMovement: formatMovement(dto.lastMovement),
  };
}

export async function fetchInventory(): Promise<InventoryItem[]> {
  const res = await api.get<{ data: ApiInventoryItem[] }>("/inventory");
  return res.data.map(toInventoryItem);
}

export async function adjustInventory(
  productId: string,
  change: number,
  reason: "harvest" | "sale" | "adjustment" | "order_cancelled",
  note?: string
): Promise<{ stock: number; availability: string }> {
  const res = await api.post<{ data: { productId: string; stock: number; availability: string } }>(
    `/inventory/${productId}/adjust`,
    { change, reason, note }
  );
  return res.data;
}
