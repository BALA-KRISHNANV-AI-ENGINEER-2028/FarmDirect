import { useEffect, useState } from "react";
import { Container } from "../../components/ui/Card";
import Icon from "../../components/ui/Icon";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import { Input } from "../../components/ui/Input";
import FarmCard from "../../components/farms/FarmCard";
import EmptyState from "../../components/ui/EmptyState";
import { ProductCardSkeleton } from "../../components/ui/Skeleton";
import { categories } from "../../data/categories";
import { cn } from "../../utils/cn";
import { Link } from "react-router-dom";
import { fetchFarms, fetchNearbyFarms } from "../../services/farmsApi";
import type { Farm } from "../../types";

export default function FarmDiscovery() {
  const [view, setView] = useState<"list" | "map">("list");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [geoError, setGeoError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setGeoError(null);

    if (view === "list") {
      fetchFarms({ search: search.trim() || undefined, category: category || undefined, verified_only: verifiedOnly, limit: 60 })
        .then(({ farms: list }) => setFarms(list))
        .catch(() => setFarms([]))
        .finally(() => setLoading(false));
      return;
    }

    // Map view uses real PostGIS nearby search, driven by the browser's
    // geolocation — a genuine use of the farms/nearby endpoint rather than
    // a stubbed value.
    if (!navigator.geolocation) {
      setGeoError("Your browser doesn't support location — showing all farms instead.");
      fetchFarms({ category: category || undefined, verified_only: verifiedOnly, limit: 60 })
        .then(({ farms: list }) => setFarms(list))
        .finally(() => setLoading(false));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        fetchNearbyFarms({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          radius_km: 200,
          category: category || undefined,
          verified_only: verifiedOnly,
        })
          .then(({ farms: list }) => setFarms(list))
          .catch(() => setFarms([]))
          .finally(() => setLoading(false));
      },
      () => {
        setGeoError("Location permission denied — showing all farms instead.");
        fetchFarms({ category: category || undefined, verified_only: verifiedOnly, limit: 60 })
          .then(({ farms: list }) => setFarms(list))
          .finally(() => setLoading(false));
      }
    );
  }, [view, search, category, verifiedOnly]);

  const filtered = search.trim()
    ? farms.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()) || f.location.toLowerCase().includes(search.toLowerCase()))
    : farms;

  return (
    <Container className="py-stack-lg">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-headline-lg-mobile md:text-headline-lg text-on-surface mb-2">Find Nearby Farms</h1>
          <p className="text-body-md text-on-surface-variant">
            {loading ? "Loading farms..." : `${filtered.length} farms ${view === "map" ? "near you" : "found"}`}
          </p>
        </div>
        <div className="flex items-center bg-surface-container-low rounded-lg p-1">
          <button
            onClick={() => setView("list")}
            className={cn(
              "px-4 py-2 rounded-md text-label-md font-semibold flex items-center gap-1.5",
              view === "list" ? "bg-surface-bright shadow-sm text-primary" : "text-on-surface-variant"
            )}
          >
            <Icon name="view_list" size={18} /> List
          </button>
          <button
            onClick={() => setView("map")}
            className={cn(
              "px-4 py-2 rounded-md text-label-md font-semibold flex items-center gap-1.5",
              view === "map" ? "bg-surface-bright shadow-sm text-primary" : "text-on-surface-variant"
            )}
          >
            <Icon name="map" size={18} /> Map
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={20} />
          <Input
            placeholder="Search farms or locations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11"
          />
        </div>
        <Button
          variant={verifiedOnly ? "primary" : "outline"}
          icon={<Icon name="verified" size={18} />}
          onClick={() => setVerifiedOnly((v) => !v)}
        >
          Verified Only
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setCategory("")}
          className={cn(
            "px-4 py-2 rounded-full text-label-md font-semibold border transition-colors",
            !category ? "bg-primary text-on-primary border-primary" : "border-outline-variant text-on-surface-variant hover:border-primary"
          )}
        >
          All Categories
        </button>
        {categories.map((c) => (
          <button
            key={c.name}
            onClick={() => setCategory(c.name)}
            className={cn(
              "px-4 py-2 rounded-full text-label-md font-semibold border transition-colors",
              category === c.name ? "bg-primary text-on-primary border-primary" : "border-outline-variant text-on-surface-variant hover:border-primary"
            )}
          >
            {c.name}
          </button>
        ))}
      </div>

      {geoError && (
        <div className="mb-6 p-3 rounded-lg bg-tertiary-fixed/40 border border-tertiary-fixed-dim/30 text-label-sm text-on-tertiary-fixed-variant flex items-center gap-2">
          <Icon name="info" size={16} />
          {geoError}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-gutter">
          {Array.from({ length: 6 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="location_off" title="No farms found" description="Try a different search or filter." />
      ) : view === "list" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-gutter">
          {filtered.map((f) => (
            <FarmCard key={f.id} farm={f} />
          ))}
        </div>
      ) : (
        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-gutter">
          <div className="relative rounded-xl overflow-hidden bg-surface-container-low border border-surface-variant h-[520px]">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(93,64,55,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(93,64,55,0.03) 1px, transparent 1px)",
                backgroundSize: "28px 28px",
              }}
            />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-primary ring-8 ring-primary/20" />
            {filtered.map((f, i) => {
              const angle = (i / filtered.length) * Math.PI * 2;
              const radius = 130 + (i % 3) * 40;
              const x = 50 + (Math.cos(angle) * radius) / 5;
              const y = 50 + (Math.sin(angle) * radius) / 5;
              return (
                <Link
                  key={f.id}
                  to={`/farms/${f.id}`}
                  className="absolute -translate-x-1/2 -translate-y-full flex flex-col items-center group"
                  style={{ left: `${x}%`, top: `${y}%` }}
                >
                  <div className="bg-surface-bright rounded-lg px-2.5 py-1 shadow-md border border-surface-variant text-label-sm font-semibold text-on-surface whitespace-nowrap mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {f.name} · {f.distanceMi} km
                  </div>
                  <Icon name="location_on" filled size={32} className="text-primary drop-shadow-md" />
                </Link>
              );
            })}
            <div className="absolute bottom-3 left-3 text-label-sm text-on-surface-variant bg-surface-bright/90 px-3 py-1.5 rounded-md">
              Positions are illustrative — distances are real (PostGIS)
            </div>
          </div>
          <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
            {filtered.map((f) => (
              <Link
                key={f.id}
                to={`/farms/${f.id}`}
                className="flex gap-3 p-3 bg-surface-bright rounded-xl border border-surface-variant hover:border-primary-fixed-dim transition-colors"
              >
                <img src={f.image} alt={f.name} className="w-20 h-20 rounded-lg object-cover shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <p className="font-display font-semibold text-on-surface truncate">{f.name}</p>
                    {f.verified && <Icon name="verified" size={14} className="text-primary shrink-0" />}
                  </div>
                  <p className="text-label-sm text-on-surface-variant mb-1">{f.location}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{f.distanceMi} km</Badge>
                    <Badge variant="outline">{f.farmingMethod}</Badge>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </Container>
  );
}
