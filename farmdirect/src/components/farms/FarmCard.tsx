import { Link } from "react-router-dom";
import type { Farm } from "../../types";
import Badge from "../ui/Badge";
import Icon from "../ui/Icon";
import Rating from "../ui/Rating";

export default function FarmCard({ farm }: { farm: Farm }) {
  return (
    <Link
      to={`/farms/${farm.id}`}
      className="bg-surface-bright rounded-xl overflow-hidden ambient-shadow flex flex-col group border border-surface-variant hover:border-primary-fixed-dim transition-colors"
    >
      <div className="relative h-40 overflow-hidden bg-surface-container">
        <img
          src={farm.image}
          alt={farm.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        {farm.verified && (
          <Badge variant="gold" icon={<Icon name="verified" size={14} />} className="absolute top-3 left-3">
            Verified Farmer
          </Badge>
        )}
      </div>
      <div className="p-5 flex flex-col flex-grow">
        <h3 className="font-display text-headline-sm text-on-surface mb-1">{farm.name}</h3>
        <p className="text-body-md text-on-surface-variant mb-2">{farm.location}</p>
        <div className="flex items-center gap-3 mb-3">
          <Rating value={farm.rating} count={farm.reviewCount} />
        </div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {farm.currentCrops.slice(0, 3).map((c) => (
            <Badge key={c} variant="outline">
              {c}
            </Badge>
          ))}
        </div>
        <div className="mt-auto flex items-center justify-between pt-3 border-t border-surface-variant text-label-sm text-outline">
          <span className="flex items-center gap-1">
            <Icon name="location_on" size={16} /> {farm.distanceMi} mi away
          </span>
          <span>{farm.farmingMethod}</span>
        </div>
      </div>
    </Link>
  );
}
