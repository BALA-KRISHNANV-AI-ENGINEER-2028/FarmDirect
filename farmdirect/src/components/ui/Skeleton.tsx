import { cn } from "../../utils/cn";

export default function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse bg-surface-container-high rounded-lg", className)} />;
}

export function ProductCardSkeleton() {
  return (
    <div className="bg-surface-bright rounded-xl overflow-hidden border border-surface-variant">
      <Skeleton className="h-48 w-full rounded-none" />
      <div className="p-6 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-9 w-full mt-4" />
      </div>
    </div>
  );
}
