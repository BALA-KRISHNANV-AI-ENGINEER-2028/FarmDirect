import { useEffect, useState } from "react";
import { Container, SectionHeading } from "../../components/ui/Card";
import Icon from "../../components/ui/Icon";
import Badge from "../../components/ui/Badge";
import Skeleton from "../../components/ui/Skeleton";
import Button from "../../components/ui/Button";
import {
  fetchInventory,
  adjustInventory,
  fetchInventoryMovements,
  type InventoryMovement,
} from "../../services/inventoryApi";
import { formatDate } from "../../utils/format";
import type { InventoryItem } from "../../types";
import { useToast } from "../../components/ui/Toast";
import { getErrorMessage } from "../../services/apiClient";

export default function FarmerInventory() {
  const [inventory, setInventory] = useState<InventoryItem[] | null>(null);
  const [adjusting, setAdjusting] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<"ALL" | "In Stock" | "Low Stock" | "Out of Stock">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Custom adjustment modal state
  const [adjustModalItem, setAdjustModalItem] = useState<InventoryItem | null>(null);
  const [adjustType, setAdjustType] = useState<"add" | "remove">("add");
  const [adjustAmount, setAdjustAmount] = useState<number>(5);
  const [adjustReason, setAdjustReason] = useState<"harvest" | "sale" | "adjustment" | "order_cancelled">("harvest");
  const [adjustNote, setAdjustNote] = useState<string>("");
  const [isSubmittingAdjust, setIsSubmittingAdjust] = useState(false);

  // Movement audit log modal state
  const [historyModalItem, setHistoryModalItem] = useState<InventoryItem | null>(null);
  const [movements, setMovements] = useState<InventoryMovement[] | null>(null);
  const [loadingMovements, setLoadingMovements] = useState(false);

  const { showToast } = useToast();

  const load = () => {
    fetchInventory()
      .then(setInventory)
      .catch(() => setInventory([]));
  };

  useEffect(load, []);

  const handleQuickAdjust = async (productId: string, change: number) => {
    setAdjusting(productId);
    try {
      await adjustInventory(productId, change, change > 0 ? "harvest" : "adjustment");
      showToast(`Stock updated (${change > 0 ? `+${change}` : change})`, "success");
      load();
    } catch (err) {
      showToast(getErrorMessage(err), "error");
    } finally {
      setAdjusting(null);
    }
  };

  const handleCustomAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustModalItem || adjustAmount <= 0) return;

    const change = adjustType === "add" ? adjustAmount : -adjustAmount;
    setIsSubmittingAdjust(true);
    try {
      await adjustInventory(adjustModalItem.productId, change, adjustReason, adjustNote || undefined);
      showToast(
        `Adjusted ${adjustModalItem.name}: ${change > 0 ? `+${change}` : change} ${adjustModalItem.unit}`,
        "success"
      );
      setAdjustModalItem(null);
      setAdjustNote("");
      load();
    } catch (err) {
      showToast(getErrorMessage(err), "error");
    } finally {
      setIsSubmittingAdjust(false);
    }
  };

  const openHistoryModal = async (item: InventoryItem) => {
    setHistoryModalItem(item);
    setLoadingMovements(true);
    try {
      const movs = await fetchInventoryMovements(item.productId);
      setMovements(movs);
    } catch {
      setMovements([]);
    } finally {
      setLoadingMovements(false);
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

  const filtered = inventory
    .filter((item) => {
      if (filterStatus !== "ALL" && item.status !== filterStatus) return false;
      if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => new Date(b.harvestDate || 0).getTime() - new Date(a.harvestDate || 0).getTime());

  return (
    <Container className="py-stack-lg">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-headline-lg-mobile md:text-headline-lg text-on-surface">Inventory</h1>
          <p className="text-body-md text-on-surface-variant">Manage stock levels, log harvests, and audit movements.</p>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-outline/20 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors text-label-sm self-start sm:self-auto"
        >
          <Icon name="refresh" size={16} />
          Refresh
        </button>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <button
          onClick={() => setFilterStatus(filterStatus === "In Stock" ? "ALL" : "In Stock")}
          className={`rounded-xl border p-5 text-center transition-all ${
            filterStatus === "In Stock"
              ? "bg-primary/5 border-primary ring-2 ring-primary/20"
              : "bg-surface-bright border-surface-variant hover:border-outline"
          }`}
        >
          <p className="font-display text-headline-md text-primary">{inStock.length}</p>
          <p className="text-label-sm text-on-surface-variant font-medium">In Stock</p>
        </button>

        <button
          onClick={() => setFilterStatus(filterStatus === "Low Stock" ? "ALL" : "Low Stock")}
          className={`rounded-xl border p-5 text-center transition-all ${
            filterStatus === "Low Stock"
              ? "bg-amber-500/5 border-amber-600 ring-2 ring-amber-600/20"
              : "bg-surface-bright border-surface-variant hover:border-outline"
          }`}
        >
          <p className="font-display text-headline-md text-amber-700 dark:text-amber-400">{lowStock.length}</p>
          <p className="text-label-sm text-on-surface-variant font-medium">Low Stock (&lt;10)</p>
        </button>

        <button
          onClick={() => setFilterStatus(filterStatus === "Out of Stock" ? "ALL" : "Out of Stock")}
          className={`rounded-xl border p-5 text-center transition-all ${
            filterStatus === "Out of Stock"
              ? "bg-error/5 border-error ring-2 ring-error/20"
              : "bg-surface-bright border-surface-variant hover:border-outline"
          }`}
        >
          <p className="font-display text-headline-md text-error">{outOfStock.length}</p>
          <p className="text-label-sm text-on-surface-variant font-medium">Out of Stock</p>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <SectionHeading title="Current Stock &amp; Movements" />
        <div className="flex items-center gap-3">
          <div className="relative">
            <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input
              type="text"
              placeholder="Filter products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 rounded-lg border border-surface-variant bg-surface-bright text-body-sm text-on-surface focus:outline-none focus:border-primary w-48 sm:w-64"
            />
          </div>
          {filterStatus !== "ALL" && (
            <button
              onClick={() => setFilterStatus("ALL")}
              className="text-label-xs font-semibold text-primary hover:underline"
            >
              Clear Filter
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-surface-bright rounded-xl border border-surface-variant p-8 text-center mb-10">
          <Icon name="inventory_2" size={36} className="text-on-surface-variant mx-auto mb-2" />
          <p className="text-body-lg text-on-surface font-medium">No matching items found</p>
          <p className="text-body-md text-on-surface-variant mt-1">
            {searchQuery || filterStatus !== "ALL" ? "Try adjusting your filters or search terms." : "Add a product from Product Management."}
          </p>
        </div>
      ) : (
        <div className="bg-surface-bright rounded-xl border border-surface-variant overflow-hidden mb-10">
          <div className="hidden lg:grid grid-cols-[auto_1fr_110px_130px_1fr_auto] gap-4 px-5 py-3 bg-surface-container-low text-label-sm font-semibold text-on-surface-variant uppercase">
            <span></span>
            <span>Product</span>
            <span>Stock</span>
            <span>Status</span>
            <span>Audit / Last Movement</span>
            <span>Actions</span>
          </div>
          <div className="divide-y divide-surface-variant">
            {filtered.map((item) => (
              <div
                key={item.productId}
                className="grid grid-cols-1 lg:grid-cols-[auto_1fr_110px_130px_1fr_auto] gap-4 px-5 py-4 items-center"
              >
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-12 h-12 rounded-lg object-cover bg-surface-container shrink-0"
                />
                <div className="min-w-0">
                  <p className="font-semibold text-on-surface truncate">{item.name}</p>
                  <p className="text-label-sm text-on-surface-variant">
                    {item.harvestDate ? `Harvested ${formatDate(item.harvestDate)}` : "No harvest date recorded"}
                  </p>
                </div>
                <div className="flex lg:block items-center justify-between">
                  <span className="lg:hidden text-label-sm text-on-surface-variant">Stock:</span>
                  <span className="text-body-md font-semibold text-on-surface">
                    {item.stock} {item.unit}
                  </span>
                </div>
                <div className="flex lg:block items-center justify-between">
                  <span className="lg:hidden text-label-sm text-on-surface-variant">Status:</span>
                  <Badge variant={item.status === "In Stock" ? "primary" : item.status === "Low Stock" ? "gold" : "error"}>
                    {item.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between lg:justify-start gap-2">
                  <button
                    onClick={() => openHistoryModal(item)}
                    className="inline-flex items-center gap-1.5 text-label-sm text-primary hover:underline font-medium"
                    title="View movement history"
                  >
                    <Icon name="history" size={16} />
                    {item.lastMovement ? item.lastMovement : "Audit Trail"}
                  </button>
                </div>
                <div className="flex items-center gap-2 justify-end pt-2 lg:pt-0 border-t lg:border-t-0 border-surface-variant">
                  <button
                    onClick={() => {
                      setAdjustModalItem(item);
                      setAdjustType("add");
                      setAdjustAmount(10);
                      setAdjustReason("harvest");
                    }}
                    className="px-2.5 py-1.5 rounded-lg border border-outline/30 hover:border-primary text-label-sm font-medium text-primary hover:bg-primary/5 transition-colors"
                  >
                    Custom Adjust
                  </button>
                  <button
                    onClick={() => handleQuickAdjust(item.productId, 10)}
                    disabled={adjusting === item.productId}
                    className="w-8 h-8 rounded-lg border border-surface-variant flex items-center justify-center text-primary hover:border-primary disabled:opacity-50"
                    aria-label="Add 10 to stock (harvest)"
                    title="Quick harvest +10"
                  >
                    <Icon name="add" size={16} />
                  </button>
                  <button
                    onClick={() => handleQuickAdjust(item.productId, -10)}
                    disabled={adjusting === item.productId || item.stock < 10}
                    className="w-8 h-8 rounded-lg border border-surface-variant flex items-center justify-center text-on-surface-variant hover:border-error hover:text-error disabled:opacity-50"
                    aria-label="Remove 10 from stock (adjustment)"
                    title="Quick adjust -10"
                  >
                    <Icon name="remove" size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Custom Adjustment Modal */}
      {adjustModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface-bright rounded-2xl max-w-md w-full p-6 shadow-2xl border border-surface-variant">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-headline-sm text-on-surface">Adjust Inventory</h3>
              <button
                onClick={() => setAdjustModalItem(null)}
                className="text-on-surface-variant hover:text-on-surface"
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            <p className="text-body-md text-on-surface mb-4">
              <span className="font-semibold">{adjustModalItem.name}</span> — Current stock:{" "}
              <span className="font-semibold text-primary">
                {adjustModalItem.stock} {adjustModalItem.unit}
              </span>
            </p>

            <form onSubmit={handleCustomAdjustSubmit} className="space-y-4">
              <div>
                <label className="block text-label-sm font-semibold text-on-surface mb-1">Adjustment Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAdjustType("add");
                      setAdjustReason("harvest");
                    }}
                    className={`py-2 rounded-lg text-label-md font-medium border text-center transition-colors ${
                      adjustType === "add"
                        ? "bg-primary text-on-primary border-primary"
                        : "border-outline/20 text-on-surface hover:bg-surface-container-low"
                    }`}
                  >
                    + Add (Harvest/Restock)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAdjustType("remove");
                      setAdjustReason("adjustment");
                    }}
                    className={`py-2 rounded-lg text-label-md font-medium border text-center transition-colors ${
                      adjustType === "remove"
                        ? "bg-error text-on-error border-error"
                        : "border-outline/20 text-on-surface hover:bg-surface-container-low"
                    }`}
                  >
                    - Deduct (Loss/Sale)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-label-sm font-semibold text-on-surface mb-1">
                  Quantity ({adjustModalItem.unit})
                </label>
                <input
                  type="number"
                  min="1"
                  max={adjustType === "remove" ? adjustModalItem.stock : 99999}
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(Math.max(1, Number(e.target.value)))}
                  className="w-full px-3 py-2 rounded-lg border border-surface-variant bg-surface-bright text-body-md text-on-surface focus:outline-none focus:border-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-label-sm font-semibold text-on-surface mb-1">Reason</label>
                <select
                  value={adjustReason}
                  onChange={(e) =>
                    setAdjustReason(
                      e.target.value as "harvest" | "sale" | "adjustment" | "order_cancelled"
                    )
                  }
                  className="w-full px-3 py-2 rounded-lg border border-surface-variant bg-surface-bright text-body-md text-on-surface focus:outline-none focus:border-primary"
                >
                  {adjustType === "add" ? (
                    <>
                      <option value="harvest">Fresh Harvest</option>
                      <option value="adjustment">Restock / Inventory Increase</option>
                      <option value="order_cancelled">Customer Order Cancelled</option>
                    </>
                  ) : (
                    <>
                      <option value="adjustment">Spoilage / Loss / Damage</option>
                      <option value="sale">Direct Offline Sale</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-label-sm font-semibold text-on-surface mb-1">
                  Optional Note / Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. Field #3 morning batch, QA inspection"
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-surface-variant bg-surface-bright text-body-md text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAdjustModalItem(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSubmittingAdjust}
                >
                  {isSubmittingAdjust ? "Updating..." : "Save Adjustment"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Movement Audit Log Modal */}
      {historyModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface-bright rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-surface-variant max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <div>
                <h3 className="font-display text-headline-sm text-on-surface">Audit Trail</h3>
                <p className="text-label-sm text-on-surface-variant">{historyModalItem.name}</p>
              </div>
              <button
                onClick={() => setHistoryModalItem(null)}
                className="text-on-surface-variant hover:text-on-surface"
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
              {loadingMovements ? (
                <div className="space-y-3 py-4">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="h-16 rounded-lg bg-surface-container animate-pulse" />
                  ))}
                </div>
              ) : !movements || movements.length === 0 ? (
                <div className="text-center py-8">
                  <Icon name="history_toggle_off" size={36} className="text-on-surface-variant mx-auto mb-2" />
                  <p className="text-body-md text-on-surface font-medium">No recorded movements yet</p>
                  <p className="text-label-sm text-on-surface-variant">
                    Inventory additions, sales, and adjustments will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {movements.map((mov) => (
                    <div
                      key={mov.id}
                      className="p-3.5 rounded-xl bg-surface-container-low border border-surface-variant flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`text-label-sm font-semibold px-2 py-0.5 rounded ${
                              mov.change > 0
                                ? "bg-primary/10 text-primary"
                                : "bg-error/10 text-error"
                            }`}
                          >
                            {mov.change > 0 ? `+${mov.change}` : mov.change} {historyModalItem.unit}
                          </span>
                          <span className="text-label-xs uppercase tracking-wider font-semibold text-on-surface-variant">
                            {mov.reason.replace(/_/g, " ")}
                          </span>
                        </div>
                        {mov.note && <p className="text-body-sm text-on-surface">{mov.note}</p>}
                        {mov.orderId && (
                          <p className="text-label-xs text-primary font-mono mt-0.5">Order #{mov.orderId}</p>
                        )}
                      </div>
                      <span className="text-label-xs text-on-surface-variant shrink-0">
                        {new Date(mov.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-surface-variant flex justify-end shrink-0">
              <Button variant="outline" size="sm" onClick={() => setHistoryModalItem(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </Container>
  );
}
