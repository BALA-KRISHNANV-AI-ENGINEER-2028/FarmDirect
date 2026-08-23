import Icon from "./Icon";
import { cn } from "../../utils/cn";

export default function StatCard({
  label,
  value,
  icon,
  trend,
  trendUp = true,
}: {
  label: string;
  value: string;
  icon: string;
  trend?: string;
  trendUp?: boolean;
}) {
  return (
    <div className="bg-surface-bright rounded-xl border border-surface-variant p-5 ambient-shadow">
      <div className="flex items-center justify-between mb-3">
        <span className="text-label-sm uppercase tracking-wide text-on-surface-variant">{label}</span>
        <div className="w-9 h-9 rounded-full bg-primary-container/15 flex items-center justify-center">
          <Icon name={icon} size={18} className="text-primary" />
        </div>
      </div>
      <div className="flex items-end justify-between">
        <span className="font-display text-headline-md text-on-surface">{value}</span>
        {trend && (
          <span
            className={cn(
              "flex items-center gap-0.5 text-label-sm font-semibold",
              trendUp ? "text-primary" : "text-error"
            )}
          >
            <Icon name={trendUp ? "trending_up" : "trending_down"} size={14} />
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}
