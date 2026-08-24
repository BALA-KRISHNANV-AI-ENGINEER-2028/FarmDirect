import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Container } from "../../components/ui/Card";
import Icon from "../../components/ui/Icon";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import EmptyState from "../../components/ui/EmptyState";
import Skeleton from "../../components/ui/Skeleton";
import { fetchMyFarms } from "../../services/farmsApi";
import { fetchProducts, deleteProduct } from "../../services/productsApi";
import { formatINR } from "../../utils/format";
import type { Product } from "../../types";
import { useToast } from "../../components/ui/Toast";
import { getErrorMessage } from "../../services/apiClient";

export default function FarmerProducts() {
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<Product[] | null>(null);
  const { showToast } = useToast();

  const load = () => {
    fetchMyFarms()
      .then((farms) => Promise.all(farms.map((f) => fetchProducts({ farmId: f.id, limit: 100 }))))
      .then((results) => setProducts(results.flatMap((r) => r.products)))
      .catch(() => setProducts([]));
  };

  useEffect(load, []);

  const filtered = (products ?? []).filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  const handleDelete = async (id: string) => {
    try {
      await deleteProduct(id);
      setProducts((prev) => (prev ? prev.filter((p) => p.id !== id) : prev));
      showToast("Product deleted successfully", "info");
    } catch (err) {
      showToast(getErrorMessage(err), "error");
    }
  };

  if (products === null) {
    return (
      <Container className="py-stack-lg">
        <Skeleton className="h-8 w-64 mb-8" />
        <Skeleton className="h-96 w-full" />
      </Container>
    );
  }

  return (
    <Container className="py-stack-lg">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <h1 className="font-display text-headline-lg-mobile md:text-headline-lg text-on-surface">Product Management</h1>
        <Link to="/farmer/products/new">
          <Button icon={<Icon name="add" size={18} />}>Add Product</Button>
        </Link>
      </div>

      <div className="relative mb-6 max-w-sm">
        <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={20} />
        <Input placeholder="Search your products..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-11" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="eco"
          title="No products found"
          description="Add your first product to start selling on FarmDirect."
          action={
            <Link to="/farmer/products/new">
              <Button>Add Product</Button>
            </Link>
          }
        />
      ) : (
        <div className="bg-surface-bright rounded-xl border border-surface-variant overflow-hidden">
          <div className="hidden md:grid grid-cols-[auto_1fr_120px_120px_140px_100px] gap-4 px-5 py-3 bg-surface-container-low text-label-sm font-semibold text-on-surface-variant uppercase">
            <span></span>
            <span>Product</span>
            <span>Price</span>
            <span>Stock</span>
            <span>Status</span>
            <span>Actions</span>
          </div>
          <div className="divide-y divide-surface-variant">
            {filtered.map((p) => (
              <div key={p.id} className="grid grid-cols-[auto_1fr] md:grid-cols-[auto_1fr_120px_120px_140px_100px] gap-4 px-5 py-4 items-center">
                <img src={p.images[0]} alt={p.name} className="w-12 h-12 rounded-lg object-cover" />
                <div className="min-w-0">
                  <p className="font-semibold text-on-surface truncate">{p.name}</p>
                  <p className="text-label-sm text-on-surface-variant md:hidden">
                    {formatINR(p.price)}/{p.unit} · {p.stock} in stock
                  </p>
                </div>
                <span className="hidden md:block text-body-md text-on-surface">
                  {formatINR(p.price)}/{p.unit}
                </span>
                <span className="hidden md:block text-body-md text-on-surface">{p.stock} {p.unit}</span>
                <div className="hidden md:block">
                  <Badge variant={p.availability === "In Stock" ? "primary" : p.availability === "Low Stock" ? "gold" : "error"}>
                    {p.availability}
                  </Badge>
                </div>
                <div className="flex gap-2 col-span-2 md:col-span-1">
                  <Link
                    to={`/farmer/products/${p.id}/edit`}
                    className="p-2 rounded-lg hover:bg-surface-container-low text-on-surface-variant hover:text-primary"
                    aria-label="Edit"
                  >
                    <Icon name="edit" size={18} />
                  </Link>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="p-2 rounded-lg hover:bg-surface-container-low text-on-surface-variant hover:text-error"
                    aria-label="Delete"
                  >
                    <Icon name="delete" size={18} />
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
