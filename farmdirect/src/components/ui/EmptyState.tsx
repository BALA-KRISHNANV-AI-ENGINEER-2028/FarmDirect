import type { ReactNode } from "react";
import Icon from "./Icon";

export default function EmptyState({
  icon = "eco",
  title,
  description,
  action,
}: {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 bg-surface-container-low rounded-xl border border-dashed border-outline-variant">
      <div className="w-16 h-16 rounded-full bg-primary-container/20 flex items-center justify-center mb-4">
        <Icon name={icon} size={32} className="text-primary" />
      </div>
      <h3 className="font-display text-headline-sm text-on-surface mb-2">{title}</h3>
      {description && (
        <p className="font-body text-body-md text-on-surface-variant max-w-sm mb-4">{description}</p>
      )}
      {action}
    </div>
  );
}
