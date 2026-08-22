import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Container, SectionHeading } from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Icon from "../../components/ui/Icon";
import Button from "../../components/ui/Button";
import ProductCard from "../../components/products/ProductCard";
import WriteReviewForm from "../../components/products/WriteReviewForm";
import EmptyState from "../../components/ui/EmptyState";
import Skeleton from "../../components/ui/Skeleton";
import { fetchFarmer } from "../../services/farmersApi";
import { fetchProducts } from "../../services/productsApi";
import * as reviewsApi from "../../services/reviewsApi";
import { useFavorites } from "../../hooks/useFavorites";
import type { Farmer, Product } from "../../types";

export default function FarmerProfile() {
  const { id } = useParams();
  const [farmer, setFarmer] = useState<Farmer | null | undefined>(undefined);
  const [farmerProducts, setFarmerProducts] = useState<Product[]>([]);
  const { isFarmerFav, toggleFarmer } = useFavorites();

  useEffect(() => {
    if (!id) return;
    fetchFarmer(id)
      .then((f) => {
        setFarmer(f);
        if (f.farmId) {
          fetchProducts({ farmId: f.farmId, limit: 60 })
            .then(({ products }) => setFarmerProducts(products))
            .catch(() => setFarmerProducts([]));
        }
      })
      .catch(() => setFarmer(null));
  }, [id]);

  if (farmer === undefined) {
    return (
      <Container className="py-stack-lg">
        <Skeleton className="h-64 w-full" />
      </Container>
    );
  }

  if (!farmer) {
    return (
      <Container className="py-16">
        <EmptyState
          icon="person_off"
          title="Farmer not found"
          action={
            <Link to="/farms">
              <Button variant="outline">Browse Farms</Button>
            </Link>
          }
        />
      </Container>
    );
  }

  const fav = isFarmerFav(farmer.id);

  return (
    <Container className="py-stack-lg">
      <div className="rounded-xl overflow-hidden bg-surface-container-low border border-surface-variant mb-10 ambient-shadow">
        <div className="h-32 md:h-40 bg-gradient-to-r from-primary to-primary-container" />
        <div className="px-6 md:px-10 pb-8">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12 mb-4">
            <div className="w-28 h-28 rounded-full border-4 border-surface-bright overflow-hidden shrink-0 bg-surface-container">
              {farmer.photo && <img src={farmer.photo} alt={farmer.name} className="w-full h-full object-cover" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display text-headline-lg-mobile md:text-headline-lg text-on-surface">{farmer.name}</h1>
                {farmer.verified && (
                  <Badge variant="gold" icon={<Icon name="verified" size={14} />}>
                    Verified
                  </Badge>
                )}
              </div>
              <p className="text-body-md text-on-surface-variant flex items-center gap-1 mt-1">
                <Icon name="location_on" size={16} /> {farmer.location}
              </p>
            </div>
            <button
              onClick={() => toggleFarmer(farmer.id)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-surface-variant hover:border-primary text-label-md font-semibold h-fit"
            >
              <Icon name="favorite" filled={fav} className={fav ? "text-error" : "text-on-surface-variant"} size={18} />
              {fav ? "Following" : "Follow"}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 max-w-md mb-6">
            <StatBox value={`${farmer.experienceYears}`} label="Years Farming" />
            <StatBox value={farmer.rating.toFixed(1)} label="Rating" />
            <StatBox value={`${farmer.reviewCount}`} label="Reviews" />
          </div>

          <h2 className="font-display text-headline-sm text-on-surface mb-2">Farm Story</h2>
          <p className="text-body-lg text-on-surface-variant mb-4">{farmer.story}</p>

          {farmer.farmId && (
            <Link
              to={`/farms/${farmer.farmId}`}
              className="inline-flex items-center gap-2 text-label-md font-semibold text-primary hover:underline mb-6"
            >
              <Icon name="storefront" size={18} />
              Visit {farmer.farmName}
              <Icon name="arrow_forward" size={16} />
            </Link>
          )}

          <div className="max-w-lg mt-2">
            <WriteReviewForm onSubmit={(rating, comment) => reviewsApi.addFarmerReview(farmer.id, rating, comment || undefined)} />
          </div>
        </div>
      </div>

      <SectionHeading title={`Products by ${farmer.name}`} />
      {farmerProducts.length === 0 ? (
        <EmptyState icon="inventory_2" title="No products listed right now" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-gutter">
          {farmerProducts.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </Container>
  );
}

function StatBox({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center p-3 rounded-lg bg-surface-bright border border-surface-variant">
      <p className="font-display text-headline-sm text-primary">{value}</p>
      <p className="text-label-sm text-on-surface-variant">{label}</p>
    </div>
  );
}
