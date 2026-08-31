import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Container } from "../../components/ui/Card";
import Icon from "../../components/ui/Icon";
import { Input, Select } from "../../components/ui/Input";
import ProductCard from "../../components/products/ProductCard";
import { ProductCardSkeleton } from "../../components/ui/Skeleton";
import EmptyState from "../../components/ui/EmptyState";
import Button from "../../components/ui/Button";
import { categories } from "../../data/categories";
import { cn } from "../../utils/cn";
import { fetchProducts, type ProductListParams } from "../../services/productsApi";
import type { Product } from "../../types";

const sortOptions: { value: ProductListParams["sort"] | ""; label: string }[] = [
  { value: "", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "rating", label: "Top Rated" },
];

export default function Marketplace() {
  const [params, setParams] = useSearchParams();
  const searchParam = params.get("search") || "";
  const activeCategory = params.get("category") || "";
  const sortParam = (params.get("sort") as ProductListParams["sort"]) || "";

  const [search, setSearch] = useState(searchParam);
  const [sort, setSort] = useState<ProductListParams["sort"] | "">(sortParam);
  const [showFilters, setShowFilters] = useState(false);
  const [freshToday, setFreshToday] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Sync state from URL search params when params change (e.g. back/forward navigation)
  useEffect(() => {
    setSearch(searchParam);
    setSort(sortParam);
  }, [searchParam, sortParam]);

  // Debounced search + URL sync + API fetch effect
  useEffect(() => {
    setLoading(true);
    const timeout = setTimeout(() => {
      // Synchronize search and sort back to URL searchParams without reloading
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        if (search.trim()) next.set("search", search.trim());
        else next.delete("search");
        if (sort) next.set("sort", sort);
        else next.delete("sort");
        return next;
      }, { replace: true });

      fetchProducts({
        search: search.trim() || undefined,
        category: activeCategory || undefined,
        sort: sort || undefined,
        limit: 60,
      })
        .then(({ products: list, total: t }) => {
          setProducts(freshToday ? list.filter((p) => p.harvestedToday) : list);
          setTotal(t);
        })
        .catch(() => {
          setProducts([]);
          setTotal(0);
        })
        .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(timeout);
  }, [search, activeCategory, sort, freshToday, setParams]);

  const handleClearSearch = () => {
    setSearch("");
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("search");
      return next;
    });
  };

  const handleClearAllFilters = () => {
    setSearch("");
    setSort("");
    setFreshToday(false);
    setParams({});
  };

  return (
    <Container className="py-stack-lg">
      <div className="mb-6">
        <h1 className="font-display text-headline-lg-mobile md:text-headline-lg text-on-surface mb-2">Marketplace</h1>
        <p className="text-body-md text-on-surface-variant">
          {loading ? "Loading products..." : `${total} fresh product${total !== 1 ? "s" : ""} from local farms`}
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={20} />
          <Input
            placeholder="Search products, farms, or categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11 pr-10"
          />
          {search && (
            <button
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface p-1"
              aria-label="Clear search"
            >
              <Icon name="close" size={18} />
            </button>
          )}
        </div>
        <Select value={sort} onChange={(e) => setSort(e.target.value as ProductListParams["sort"] | "")} className="md:w-56">
          {sortOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        <Button variant="outline" className="md:hidden" onClick={() => setShowFilters((s) => !s)} icon={<Icon name="tune" size={18} />}>
          Filters
        </Button>
      </div>

      <div className={cn("flex flex-wrap gap-2 mb-8", !showFilters && "hidden md:flex")}>
        <button
          onClick={() => setParams((p) => { p.delete("category"); return p; })}
          className={cn(
            "px-4 py-2 rounded-full text-label-md font-semibold border transition-colors",
            !activeCategory ? "bg-primary text-on-primary border-primary" : "border-outline-variant text-on-surface-variant hover:border-primary"
          )}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c.name}
            onClick={() => setParams((p) => { p.set("category", c.name); return p; })}
            className={cn(
              "px-4 py-2 rounded-full text-label-md font-semibold border transition-colors flex items-center gap-1.5",
              activeCategory === c.name
                ? "bg-primary text-on-primary border-primary"
                : "border-outline-variant text-on-surface-variant hover:border-primary"
            )}
          >
            <Icon name={c.icon} size={16} />
            {c.name}
          </button>
        ))}
        <button
          onClick={() => setFreshToday((f) => !f)}
          className={cn(
            "px-4 py-2 rounded-full text-label-md font-semibold border transition-colors flex items-center gap-1.5",
            freshToday ? "bg-tertiary-fixed border-tertiary-fixed text-on-tertiary-fixed-variant" : "border-outline-variant text-on-surface-variant hover:border-primary"
          )}
        >
          <Icon name="local_florist" size={16} />
          Harvested Today
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-gutter">
          {Array.from({ length: 6 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          icon="search_off"
          title="No products found"
          description="Try adjusting your search or filters to find what you're looking for."
          action={
            <Button variant="outline" onClick={handleClearAllFilters}>
              Clear Filters
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-gutter">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </Container>
  );
}
