import { useEffect, useState } from "react";
import { Container, SectionHeading } from "../../components/ui/Card";
import Icon from "../../components/ui/Icon";
import Badge from "../../components/ui/Badge";
import Skeleton from "../../components/ui/Skeleton";
import { fetchInventory, adjustInventory } from "../../services/inventoryApi";
import { formatDate } from "../../utils/format";
import type { InventoryItem } from "../../types";

export default function FarmerInventory() {
  const [inventory, setInventory] = useState<InventoryItem[] | null>(null);
  const [adjusting, setAdjusting] = useState<string | null>(null);

  const load = () => {
    fetchInventory()
      .then(setInventory)
      .catch(() => setInventory([]));
  };

  useEffect(load, []);

  const handleAdjust = async (productId: string, change: number) => {
    setAdjusting(productId);
    try {
      await adjustInventory(productId, change, change > 0 ? "harvest" : "adjustment");
      load();
    } catch {
      // no-op — a failed adjustment (e.g. would go negative) just leaves stock unchanged
    } finally {
      setAdjusting(null);
    }
  };

  if (inventory === null) {
    return (
      <Container className="py-stack-lg">
        <Skeleton className="h-8 w-48 mb-8" />
        <Skeleton className="h-64 w-full" />
      </Container>
    );
  }

  const inStock = inventory.filter((i) => i.status === "In Stock");
  const lowStock = inventory.filter((i) => i.status === "Low Stock");
  const outOfStock = inventory.filter((i) => i.status === "Out of Stock");
  const sorted = [...inventory].sort(
    (a, b) => new Date(b.harvestDate || 0).getTime() - new Date(a.harvestDate || 0).getTime()
  );

  return (
    <Container className="py-stack-lg">
      <h1 className="font-display text-headline-lg-mobile md:text-headline-lg text-on-surface mb-8">Inventory</h1>

      <div className="grid sm:grid-cols-3 gap-4 mb-10">
        <div className="bg-surface-bright rounded-xl border border-surface-variant p-5 text-center">
          <p className="font-display text-headline-md text-primary">{inStock.length}</p>
          <p className="text-label-sm text-on-surface-variant">In Stock</p>
        </div>
        <div className="bg-surface-bright rounded-xl border border-surface-variant p-5 text-center">
          <p className="font-display text-headline-md text-on-tertiary-fixed-variant">{lowStock.length}</p>
          <p className="text-label-sm text-on-surface-variant">Low Stock</p>
        </div>
        <div className="bg-surface-bright rounded-xl border border-surface-variant p-5 text-center">
          <p className="font-display text-headline-md text-error">{outOfStock.length}</p>
          <p className="text-label-sm text-on-surface-variant">Out of Stock</p>
        </div>
      </div>

      <SectionHeading title="Current Stock" />
      {sorted.length === 0 ? (
        <p className="text-body-md text-on-surface-variant">No products yet — add one from Product Management.</p>
      ) : (
        <div className="bg-surface-bright rounded-xl border border-surface-variant overflow-hidden mb-10">
          <div className="hidden md:grid grid-cols-[auto_1fr_100px_140px_1fr_auto] gap-4 px-5 py-3 bg-surface-container-low text-label-sm font-semibold text-on-surface-variant uppercase">
            <span></span>
            <span>Product</span>
            <span>Stock</span>
            <span>Status</span>
            <span>Last Movement</span>
            <span>Adjust</span>
          </div>
          <div className="divide-y divide-surface-variant">
            {sorted.map((item) => (
              <div key={item.productId} className="grid grid-cols-[auto_1fr] md:grid-cols-[auto_1fr_100px_140px_1fr_auto] gap-4 px-5 py-4 items-center">
                <img src={item.image} alt={item.name} className="w-12 h-12 rounded-lg object-cover" />
                <div className="min-w-0">
                  <p className="font-semibold text-on-surface truncate">{item.name}</p>
                  <p className="text-label-sm text-on-surface-variant">
                    {item.harvestDate ? `Harvested ${formatDate(item.harvestDate)}` : "No harvest date"}
                  </p>
                </div>
                <span className="hidden md:block text-body-md text-on-surface">
                  {item.stock} {item.unit}
                </span>
                <div className="hidden md:block">
                  <Badge variant={item.status === "In Stock" ? "primary" : item.status === "Low Stock" ? "gold" : "error"}>
                    {item.status}
                  </Badge>
                </div>
                <span className="hidden md:flex items-center gap-1 text-label-sm text-on-surface-variant">
                  <Icon name="swap_vert" size={14} />
                  {item.lastMovement}
                </span>
                <div className="flex items-center gap-1 col-span-2 md:col-span-1">
                  <button
                    onClick={() => handleAdjust(item.productId, 10)}
                    disabled={adjusting === item.productId}
                    className="w-8 h-8 rounded-lg border border-surface-variant flex items-center justify-center text-primary hover:border-primary disabled:opacity-50"
                    aria-label="Add 10 to stock (harvest)"
                    title="Harvest +10"
                  >
                    <Icon name="add" size={16} />
                  </button>
                  <button
                    onClick={() => handleAdjust(item.productId, -10)}
                    disabled={adjusting === item.productId || item.stock < 10}
                    className="w-8 h-8 rounded-lg border border-surface-variant flex items-center justify-center text-on-surface-variant hover:border-error hover:text-error disabled:opacity-50"
                    aria-label="Remove 10 from stock (adjustment)"
                    title="Adjust -10"
                  >
                    <Icon name="remove" size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Container>
  );
}
