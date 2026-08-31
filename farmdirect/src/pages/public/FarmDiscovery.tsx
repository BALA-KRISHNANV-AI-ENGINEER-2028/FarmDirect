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
import { useGeolocation } from "../../hooks/useGeolocation";
import FarmMap from "../../components/maps/FarmMap";

export default function FarmDiscovery() {
  const [view, setView] = useState<"list" | "map">("list");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(50);
  const geo = useGeolocation();

  // Sync geolocation success to userLocation state
  useEffect(() => {
    if (geo.status === "success" && geo.position) {
      setUserLocation({ lat: geo.position.lat, lng: geo.position.lng });
    }
  }, [geo.status, geo.position]);

  // Main data fetching effect
  useEffect(() => {
    setLoading(true);
    setError(null);

    if (userLocation) {
      fetchNearbyFarms({
        lat: userLocation.lat,
        lng: userLocation.lng,
        radius_km: radiusKm,
        category: category || undefined,
        verified_only: verifiedOnly,
      })
        .then(({ farms: list }) => setFarms(list))
        .catch(() => {
          setError("Unable to load nearby farms.");
          setFarms([]);
        })
        .finally(() => setLoading(false));
    } else {
      fetchFarms({
        search: search.trim() || undefined,
        category: category || undefined,
        verified_only: verifiedOnly,
        limit: 60,
      })
        .then(({ farms: list }) => setFarms(list))
        .catch(() => {
          setError("Unable to load farms.");
          setFarms([]);
        })
        .finally(() => setLoading(false));
    }
  }, [userLocation, radiusKm, search, category, verifiedOnly]);

  const handleClearLocation = () => {
    setUserLocation(null);
  };

  const filtered = search.trim()
    ? farms.filter(
        (f) =>
          f.name.toLowerCase().includes(search.toLowerCase()) ||
          f.location.toLowerCase().includes(search.toLowerCase())
      )
    : farms;

  return (
    <Container className="py-stack-lg">
      {/* Title & View Switcher */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-headline-lg-mobile md:text-headline-lg text-on-surface mb-2">Find Nearby Farms</h1>
          <p className="text-body-md text-on-surface-variant">
            {loading ? "Loading farms..." : `${filtered.length} farms ${userLocation ? "near you" : "found"}`}
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

      {/* Geolocation Explanation & Trigger Controls */}
      <div className="mb-6 bg-surface-container-low border border-surface-variant rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <Icon name="location_on" className="text-primary mt-0.5" size={24} />
          <div>
            <p className="font-semibold text-on-surface">Find fresh crops closest to you</p>
            <p className="text-body-sm text-on-surface-variant">
              We request your location to find local farmers and list them by real road distance.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {userLocation ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-label-sm text-on-surface-variant">Search Radius:</span>
                <select
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(Number(e.target.value))}
                  className="bg-surface-bright border border-outline-variant rounded-md px-2 py-1 text-label-sm font-semibold text-on-surface"
                >
                  <option value={10}>10 km</option>
                  <option value={25}>25 km</option>
                  <option value={50}>50 km</option>
                  <option value={100}>100 km</option>
                  <option value={200}>200 km</option>
                </select>
              </div>
              <Button variant="outline" size="sm" onClick={handleClearLocation}>
                Clear Filter
              </Button>
            </>
          ) : (
            <Button
              variant="primary"
              size="sm"
              icon={<Icon name="my_location" size={16} />}
              onClick={geo.request}
              disabled={geo.status === "loading"}
            >
              {geo.status === "loading" ? "Finding location..." : "Use my location"}
            </Button>
          )}
        </div>
      </div>

      {/* Search & Filter Header */}
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

      {/* Category Pills */}
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

      {/* Geolocation feedback (if denied or failing) */}
      {geo.error && (
        <div className="mb-6 p-3 rounded-lg bg-error-container/40 border border-error/20 text-label-sm text-on-error-container flex items-center gap-2">
          <Icon name="info" size={16} />
          <span>{geo.error}</span>
          <button onClick={geo.request} className="ml-auto underline font-semibold hover:text-primary">
            Retry
          </button>
        </div>
      )}

      {/* General error state */}
      {error && (
        <div className="mb-6 p-3 rounded-lg bg-error-container/40 border border-error/20 text-label-sm text-on-error-container flex items-center justify-between">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={() => setUserLocation(userLocation)}>
            Retry
          </Button>
        </div>
      )}

      {/* Loading Skeleton — only shown in LIST view */}
      {loading && view === "list" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-gutter">
          {Array.from({ length: 6 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : view === "list" ? (
        filtered.length === 0 ? (
          <EmptyState
            icon="location_off"
            title={userLocation ? "No nearby farms found" : "No farms found"}
            description={
              userLocation
                ? "No farms found within this search radius. Try expanding the radius."
                : "Try a different search or filter."
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-gutter">
            {filtered.map((f) => (
              <FarmCard key={f.id} farm={f} />
            ))}
          </div>
        )
      ) : (
        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-gutter">
          {/* Map view */}
          <FarmMap
            userLat={userLocation?.lat}
            userLng={userLocation?.lng}
            farms={filtered}
            height={520}
          />
          {/* Map side-panel list */}
          <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-on-surface-variant flex flex-col items-center justify-center h-full">
                <Icon name="location_off" size={48} className="mb-4 opacity-50" />
                <p className="text-body-lg font-semibold">No farms found in this area</p>
                <p className="text-body-md mt-2">Try expanding your search radius or moving the map.</p>
              </div>
            ) : (
              filtered.map((f) => (
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
                      {f.distanceMi > 0 && <Badge variant="outline">{f.distanceMi} km</Badge>}
                      <Badge variant="outline">{f.farmingMethod}</Badge>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </Container>
  );
}
