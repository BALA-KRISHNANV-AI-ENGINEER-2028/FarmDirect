import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Container, SectionHeading } from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Icon from "../../components/ui/Icon";
import Rating from "../../components/ui/Rating";
import Button from "../../components/ui/Button";
import ProductCard from "../../components/products/ProductCard";
import WriteReviewForm from "../../components/products/WriteReviewForm";
import EmptyState from "../../components/ui/EmptyState";
import Skeleton from "../../components/ui/Skeleton";
import { useGeolocation } from "../../hooks/useGeolocation";
import FarmMapPreview from "../../components/maps/FarmMapPreview";
import { fetchFarm } from "../../services/farmsApi";
import { fetchFarmer } from "../../services/farmersApi";
import { fetchProducts } from "../../services/productsApi";
import * as reviewsApi from "../../services/reviewsApi";
import { useFavorites } from "../../hooks/useFavorites";
import type { Farm, Farmer, Product } from "../../types";

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function FarmDetail() {
  const { id } = useParams();
  const [farm, setFarm] = useState<Farm | null | undefined>(undefined);
  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [farmProducts, setFarmProducts] = useState<Product[]>([]);
  const { isFarmFav, toggleFarm } = useFavorites();
  const geo = useGeolocation();

  useEffect(() => {
    if (!id) return;
    fetchFarm(id)
      .then((f) => {
        setFarm(f);
        fetchFarmer(f.farmerId).then(setFarmer).catch(() => setFarmer(null));
      })
      .catch(() => setFarm(null));
    fetchProducts({ farmId: id, limit: 60 })
      .then(({ products }) => setFarmProducts(products))
      .catch(() => setFarmProducts([]));
  }, [id]);

  useEffect(() => {
    if (navigator.geolocation) {
      geo.request();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (farm === undefined) {
    return (
      <Container className="py-stack-lg">
        <Skeleton className="h-72 w-full mb-8" />
        <Skeleton className="h-6 w-1/3 mb-4" />
        <Skeleton className="h-24 w-full" />
      </Container>
    );
  }

  if (!farm) {
    return (
      <Container className="py-16">
        <EmptyState
          icon="location_off"
          title="Farm not found"
          action={
            <Link to="/farms">
              <Button variant="outline">Back to Farms</Button>
            </Link>
          }
        />
      </Container>
    );
  }

  const fav = isFarmFav(farm.id);
  const showDistance =
    geo.position &&
    farm.lat !== 0 &&
    farm.lng !== 0 &&
    !(farm.lat === 20.5937 && farm.lng === 78.9629);

  return (
    <div>
      <div className="relative h-72 md:h-96 w-full">
        {farm.image && <img src={farm.image} alt={farm.name} className="w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <Container className="absolute bottom-0 left-0 right-0 pb-6 text-on-primary">
          <div className="flex items-center gap-2 mb-2">
            {farm.verified && (
              <Badge variant="gold" icon={<Icon name="verified" size={14} />}>
                Verified Farmer
              </Badge>
            )}
            <Badge variant="outline" className="bg-surface-bright/20 text-on-primary border-on-primary/30">
              {farm.farmingMethod}
            </Badge>
          </div>
          <h1 className="font-display text-headline-lg-mobile md:text-headline-lg">{farm.name}</h1>
        </Container>
      </div>

      <Container className="py-stack-lg">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4 flex-wrap">
            <Rating value={farm.rating} count={farm.reviewCount} />
            <span className="text-body-md text-on-surface-variant flex items-center gap-1">
              <Icon name="location_on" size={18} /> {farm.location}
            </span>
            {showDistance && geo.position && (
              <span className="text-body-md text-primary font-semibold flex items-center gap-1">
                <Icon name="navigation" size={18} />
                {getDistanceKm(geo.position.lat, geo.position.lng, farm.lat, farm.lng).toFixed(1)} km away
              </span>
            )}
          </div>
          <button
            onClick={() => toggleFarm(farm.id)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-surface-variant hover:border-primary text-label-md font-semibold"
          >
            <Icon name="favorite" filled={fav} className={fav ? "text-error" : "text-on-surface-variant"} size={18} />
            {fav ? "Saved" : "Save Farm"}
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-gutter mb-12">
          <div className="md:col-span-2">
            <h2 className="font-display text-headline-md text-on-surface mb-3">About the Farm</h2>
            <p className="text-body-lg text-on-surface-variant mb-6">{farm.description}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
              <StatBox icon="crop" label="Farm Size" value={`${farm.sizeAcres} acres`} />
              <StatBox icon="eco" label="Method" value={farm.farmingMethod} />
              <StatBox icon="calendar_today" label="Years Active" value={`${farm.yearsActive} yrs`} />
            </div>

            <h2 className="font-display text-headline-md text-on-surface mb-3">Farm Gallery</h2>
            {farm.gallery.length === 0 ? (
              <p className="text-body-md text-on-surface-variant mb-8">No gallery photos yet.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
                {farm.gallery.map((img) => (
                  <img key={img} src={img} alt="" className="rounded-lg h-32 w-full object-cover" />
                ))}
              </div>
            )}

            <h2 className="font-display text-headline-md text-on-surface mb-3">Reviews ({farm.reviewCount})</h2>
            <div className="max-w-lg">
              <WriteReviewForm onSubmit={(rating, comment) => reviewsApi.addFarmReview(farm.id, rating, comment || undefined)} />
            </div>
          </div>

          <div className="space-y-6">
            {farmer && (
              <div>
                <h2 className="font-display text-headline-md text-on-surface mb-3">Farmer</h2>
                <Link
                  to={`/farmers/${farmer.id}`}
                  className="flex items-center gap-3 p-4 rounded-xl bg-surface-bright border border-surface-variant hover:border-primary-fixed-dim transition-colors animate-fade-in"
                >
                  <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-primary-fixed shrink-0 bg-surface-container">
                    {farmer.photo && <img src={farmer.photo} alt={farmer.name} className="w-full h-full object-cover" />}
                  </div>
                  <div>
                    <p className="font-semibold text-on-surface flex items-center gap-1">
                      {farmer.name}
                      {farmer.verified && <Icon name="verified" size={14} className="text-primary" />}
                    </p>
                    <p className="text-label-sm text-on-surface-variant">{farmer.experienceYears} years farming</p>
                  </div>
                  <Icon name="chevron_right" className="ml-auto text-outline" />
                </Link>
              </div>
            )}

            {farm.lat !== 0 && farm.lng !== 0 && (
              <div>
                <h2 className="font-display text-headline-md text-on-surface mb-3">Farm Location</h2>
                <div className="p-4 rounded-xl bg-surface-bright border border-surface-variant space-y-4">
                  <FarmMapPreview lat={farm.lat} lng={farm.lng} farmName={farm.name} height={200} />
                  <div>
                    <p className="text-label-md font-semibold text-on-surface mb-1 flex items-center gap-1">
                      <Icon name="location_on" size={16} className="text-primary" />
                      Address
                    </p>
                    <p className="text-body-md text-on-surface-variant">{farm.location}</p>
                  </div>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${farm.lat},${farm.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border border-surface-variant hover:border-primary text-label-md font-semibold text-on-surface hover:text-primary transition-colors"
                  >
                    <Icon name="directions" size={18} />
                    Get Directions
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        <SectionHeading title="Available Products" />
        {farmProducts.length === 0 ? (
          <EmptyState icon="inventory_2" title="No products available right now" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-gutter">
            {farmProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </Container>
    </div>
  );
}

function StatBox({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="p-3 rounded-lg bg-surface-container-low text-center">
      <Icon name={icon} size={20} className="text-primary mx-auto mb-1" />
      <p className="text-label-md font-semibold text-on-surface">{value}</p>
      <p className="text-label-sm text-on-surface-variant">{label}</p>
    </div>
  );
}
