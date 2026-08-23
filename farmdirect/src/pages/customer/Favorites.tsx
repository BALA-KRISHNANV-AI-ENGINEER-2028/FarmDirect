import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Container } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Icon from "../../components/ui/Icon";
import EmptyState from "../../components/ui/EmptyState";
import Skeleton from "../../components/ui/Skeleton";
import ProductCard from "../../components/products/ProductCard";
import FarmCard from "../../components/farms/FarmCard";
import { useFavorites } from "../../hooks/useFavorites";
import { fetchFavoriteProductDetails, fetchFavorites } from "../../services/favoritesApi";
import { fetchFarm } from "../../services/farmsApi";
import type { ApiFavorites } from "../../services/favoritesApi";
import type { Farm, Product } from "../../types";
import { cn } from "../../utils/cn";

const tabs = ["Products", "Farms", "Farmers"] as const;

export default function Favorites() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("Products");
  const { products: favProductIds, farms: favFarmIds, farmers: favFarmerIds } = useFavorites();

  const [favProducts, setFavProducts] = useState<Product[]>([]);
  const [favFarms, setFavFarms] = useState<Farm[]>([]);
  const [favFarmers, setFavFarmers] = useState<ApiFavorites["farmers"]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchFavoriteProductDetails(favProductIds).catch(() => []),
      Promise.all(favFarmIds.map((id) => fetchFarm(id).catch(() => null))).then((r) => r.filter((f): f is Farm => f !== null)),
    ]).then(([products, farms]) => {
      setFavProducts(products);
      setFavFarms(farms);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favProductIds.join(","), favFarmIds.join(",")]);

  useEffect(() => {
    fetchFavorites()
      .then((f) => setFavFarmers(f.farmers))
      .catch(() => setFavFarmers([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favFarmerIds.join(",")]);

  return (
    <Container className="py-stack-lg">
      <h1 className="font-display text-headline-lg-mobile md:text-headline-lg text-on-surface mb-8">Your Favorites</h1>

      <div className="flex gap-2 mb-8 border-b border-surface-variant">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-3 text-label-md font-semibold border-b-2 -mb-px transition-colors",
              tab === t ? "border-primary text-primary" : "border-transparent text-on-surface-variant hover:text-primary"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-gutter">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : (
        <>
          {tab === "Products" &&
            (favProducts.length === 0 ? (
              <EmptyState
                icon="favorite"
                title="No favorite products yet"
                description="Tap the heart icon on any product to save it here."
                action={
                  <Link to="/marketplace">
                    <Button variant="outline">Browse Products</Button>
                  </Link>
                }
              />
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-gutter">
                {favProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            ))}

          {tab === "Farms" &&
            (favFarms.length === 0 ? (
              <EmptyState
                icon="favorite"
                title="No favorite farms yet"
                description="Save farms you love to find them here quickly."
                action={
                  <Link to="/farms">
                    <Button variant="outline">Discover Farms</Button>
                  </Link>
                }
              />
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-gutter">
                {favFarms.map((f) => (
                  <FarmCard key={f.id} farm={f} />
                ))}
              </div>
            ))}

          {tab === "Farmers" &&
            (favFarmers.length === 0 ? (
              <EmptyState icon="favorite" title="No favorite farmers yet" description="Follow farmers to see their updates here." />
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-gutter">
                {favFarmers.map((f) => (
                  <Link
                    key={f.id}
                    to={`/farmers/${f.id}`}
                    className="flex items-center gap-3 p-4 bg-surface-bright rounded-xl border border-surface-variant hover:border-primary-fixed-dim"
                  >
                    <div className="w-14 h-14 rounded-full overflow-hidden bg-surface-container shrink-0">
                      {f.avatarUrl && <img src={f.avatarUrl} alt={f.fullName} className="w-full h-full object-cover" />}
                    </div>
                    <div>
                      <p className="font-semibold text-on-surface flex items-center gap-1">
                        {f.fullName}
                        {f.verified && <Icon name="verified" size={14} className="text-primary" />}
                      </p>
                      <p className="text-label-sm text-on-surface-variant">View profile</p>
                    </div>
                  </Link>
                ))}
              </div>
            ))}
        </>
      )}
    </Container>
  );
}
