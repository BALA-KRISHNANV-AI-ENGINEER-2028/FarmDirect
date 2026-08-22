import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Container, SectionHeading, Card } from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Icon from "../../components/ui/Icon";
import Button from "../../components/ui/Button";
import Rating from "../../components/ui/Rating";
import ProductCard from "../../components/products/ProductCard";
import WriteReviewForm from "../../components/products/WriteReviewForm";
import EmptyState from "../../components/ui/EmptyState";
import Skeleton from "../../components/ui/Skeleton";
import { fetchProduct, fetchRelatedProducts } from "../../services/productsApi";
import * as reviewsApi from "../../services/reviewsApi";
import { useCart } from "../../hooks/useCart";
import { useFavorites } from "../../hooks/useFavorites";
import { formatDate } from "../../utils/format";
import { cn } from "../../utils/cn";
import type { Product } from "../../types";

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null | undefined>(undefined);
  const [related, setRelated] = useState<Product[]>([]);
  const { addItem } = useCart();
  const { isProductFav, toggleProduct } = useFavorites();
  const [activeImg, setActiveImg] = useState(0);
  const [qty, setQty] = useState(1);

  const loadProduct = () => {
    if (!id) return;
    fetchProduct(id)
      .then((p) => {
        setProduct(p);
        setActiveImg(0);
      })
      .catch(() => setProduct(null));
    fetchRelatedProducts(id)
      .then(setRelated)
      .catch(() => setRelated([]));
  };

  useEffect(loadProduct, [id]);

  if (product === undefined) {
    return (
      <Container className="py-stack-lg">
        <div className="grid md:grid-cols-2 gap-gutter">
          <Skeleton className="h-96 rounded-xl" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-24" />
          </div>
        </div>
      </Container>
    );
  }

  if (!product) {
    return (
      <Container className="py-16">
        <EmptyState
          icon="search_off"
          title="Product not found"
          description="This product may no longer be available."
          action={
            <Link to="/marketplace">
              <Button variant="outline">Back to Marketplace</Button>
            </Link>
          }
        />
      </Container>
    );
  }

  const fav = isProductFav(product.id);
  const outOfStock = product.availability === "Out of Stock";

  return (
    <Container className="py-stack-lg">
      <nav className="text-label-sm text-on-surface-variant mb-6 flex items-center gap-1.5">
        <Link to="/marketplace" className="hover:text-primary">Marketplace</Link>
        <Icon name="chevron_right" size={14} />
        <span className="text-on-surface">{product.name}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-gutter mb-16">
        <div>
          <div className="rounded-xl overflow-hidden bg-surface-container-low h-96 mb-3">
            {product.images[activeImg] && (
              <img src={product.images[activeImg]} alt={product.name} className="w-full h-full object-cover" />
            )}
          </div>
          {product.images.length > 1 && (
            <div className="flex gap-2">
              {product.images.map((img, i) => (
                <button
                  key={img}
                  onClick={() => setActiveImg(i)}
                  className={cn(
                    "w-20 h-20 rounded-lg overflow-hidden border-2",
                    activeImg === i ? "border-primary" : "border-transparent"
                  )}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            {product.harvestedToday && (
              <Badge variant="primary" icon={<Icon name="local_florist" size={14} />}>
                Harvested Today
              </Badge>
            )}
            <Badge variant="outline">{product.farmingMethod}</Badge>
          </div>
          <h1 className="font-display text-headline-lg-mobile md:text-headline-lg text-on-surface mb-2">{product.name}</h1>
          <div className="flex items-center gap-4 mb-4">
            <Rating value={product.rating} count={product.reviewCount} />
            <Link to={`/farms/${product.farmId}`} className="text-label-md text-primary hover:underline flex items-center gap-1">
              <Icon name="storefront" size={16} />
              {product.farmName}
            </Link>
          </div>
          <p className="text-body-lg text-on-surface-variant mb-6">{product.description}</p>

          <div className="flex items-baseline gap-2 mb-6">
            <span className="font-display text-headline-lg text-primary">₹{product.price}</span>
            <span className="text-body-md text-on-surface-variant">/ {product.unit}</span>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <InfoItem icon="agriculture" label="Farmer" value={product.farmerName} />
            <InfoItem icon="calendar_today" label="Harvest Date" value={product.harvestDate ? formatDate(product.harvestDate) : "—"} />
            <InfoItem
              icon="inventory_2"
              label="Availability"
              value={product.availability}
              valueClass={outOfStock ? "text-error" : "text-primary"}
            />
            <InfoItem icon="scale" label="In Stock" value={`${product.stock} ${product.unit}`} />
          </div>

          <div className="flex items-center gap-3 mb-4">
            <span className="text-label-md font-semibold text-on-surface">Quantity</span>
            <div className="flex items-center border border-surface-variant rounded-lg">
              <button
                className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:text-primary disabled:opacity-40"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={qty <= 1}
                aria-label="Decrease quantity"
              >
                <Icon name="remove" size={18} />
              </button>
              <span className="w-10 text-center font-semibold">{qty}</span>
              <button
                className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:text-primary"
                onClick={() => setQty((q) => q + 1)}
                aria-label="Increase quantity"
              >
                <Icon name="add" size={18} />
              </button>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              size="lg"
              className="flex-1"
              disabled={outOfStock}
              onClick={() => addItem(product.id, qty)}
            >
              Add to Cart
            </Button>
            <Button size="lg" className="flex-1" disabled={outOfStock} onClick={() => addItem(product.id, qty)}>
              Buy Now
            </Button>
            <button
              onClick={() => toggleProduct(product.id)}
              aria-label={fav ? "Remove from favorites" : "Add to favorites"}
              className="w-14 h-14 rounded-lg border border-surface-variant flex items-center justify-center hover:border-primary shrink-0"
            >
              <Icon name="favorite" filled={fav} className={fav ? "text-error" : "text-on-surface-variant"} size={22} />
            </button>
          </div>
        </div>
      </div>

      {/* Reviews */}
      <div className="mb-16">
        <SectionHeading title={`Reviews (${product.reviewCount})`} />
        <div className="mb-6 max-w-lg">
          <WriteReviewForm
            onSubmit={(rating, comment) => reviewsApi.addProductReview(product.id, rating, comment || undefined)}
            onSubmitted={loadProduct}
          />
        </div>
        {product.reviews.length === 0 ? (
          <EmptyState icon="rate_review" title="No reviews yet" description="Be the first to review this product." />
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {product.reviews.map((r) => (
              <Card key={r.id} className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-on-surface">{r.author}</span>
                  <Rating value={r.rating} />
                </div>
                <p className="text-body-md text-on-surface-variant mb-2">{r.comment}</p>
                <span className="text-label-sm text-outline">{formatDate(r.date)}</span>
              </Card>
            ))}
          </div>
        )}
      </div>

      {related.length > 0 && (
        <div>
          <SectionHeading title="Related Products" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </Container>
  );
}

function InfoItem({
  icon,
  label,
  value,
  valueClass,
}: {
  icon: string;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-start gap-2 p-3 rounded-lg bg-surface-container-low">
      <Icon name={icon} size={18} className="text-primary mt-0.5" />
      <div>
        <p className="text-label-sm text-on-surface-variant">{label}</p>
        <p className={cn("text-label-md font-semibold text-on-surface", valueClass)}>{value}</p>
      </div>
    </div>
  );
}
