import { Link } from "react-router-dom";
import type { Product } from "../../types";
import Badge from "../ui/Badge";
import Icon from "../ui/Icon";
import Button from "../ui/Button";
import { useCart } from "../../hooks/useCart";
import { useFavorites } from "../../hooks/useFavorites";
import { cn } from "../../utils/cn";

export default function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const { isProductFav, toggleProduct } = useFavorites();
  const fav = isProductFav(product.id);
  const outOfStock = product.availability === "Out of Stock";

  return (
    <div className="bg-surface-bright rounded-xl overflow-hidden ambient-shadow flex flex-col group border border-surface-variant hover:border-primary-fixed-dim transition-colors">
      <Link to={`/products/${product.id}`} className="relative h-48 overflow-hidden bg-surface-container block">
        <img
          src={product.images[0]}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        {product.harvestedToday && (
          <Badge variant="primary" icon={<Icon name="local_florist" size={14} />} className="absolute top-4 left-4">
            Harvested Today
          </Badge>
        )}
        {product.availability !== "In Stock" && (
          <Badge
            variant={outOfStock ? "error" : "gold"}
            className="absolute top-4 right-4"
          >
            {product.availability}
          </Badge>
        )}
        <button
          onClick={(e) => {
            e.preventDefault();
            toggleProduct(product.id);
          }}
          aria-label={fav ? "Remove from favorites" : "Add to favorites"}
          className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-surface-bright/90 backdrop-blur-sm flex items-center justify-center hover:scale-110 transition-transform"
        >
          <Icon name="favorite" filled={fav} className={cn(fav ? "text-error" : "text-on-surface-variant")} size={18} />
        </button>
      </Link>
      <div className="p-6 flex flex-col flex-grow">
        <Link to={`/products/${product.id}`}>
          <h3 className="font-display text-headline-md text-on-surface mb-2 hover:text-primary transition-colors">
            {product.name}
          </h3>
        </Link>
        <Link to={`/farms/${product.farmId}`} className="text-body-md text-on-surface-variant flex-grow hover:text-primary transition-colors">
          From {product.farmName}
        </Link>
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-surface-variant">
          <span className="text-label-md font-semibold text-primary">
            ₹{product.price} / {product.unit}
          </span>
          <span className="text-label-sm text-outline flex items-center gap-1">
            <Icon name="location_on" size={16} /> {product.distanceMi} mi
          </span>
        </div>
        <Button
          variant="secondary"
          className="mt-4 w-full"
          disabled={outOfStock}
          onClick={() => addItem(product.id)}
        >
          {outOfStock ? "Out of Stock" : "Add to Basket"}
        </Button>
      </div>
    </div>
  );
}
