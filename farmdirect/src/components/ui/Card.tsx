import type { HTMLAttributes } from "react";
import { cn } from "../../utils/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-surface-bright rounded-xl border border-surface-variant ambient-shadow",
        className
      )}
      {...props}
    />
  );
}

export function Container({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop", className)}
      {...props}
    />
  );
}

export function SectionHeading({
  title,
  action,
}: {
  title: string;
  action?: { label: string; onClick?: () => void; href?: string };
}) {
  return (
    <div className="flex justify-between items-end mb-6 md:mb-8">
      <h2 className="font-display text-headline-lg-mobile md:text-headline-lg text-on-surface">{title}</h2>
      {action &&
        (action.href ? (
          <a className="text-label-md font-semibold text-primary hover:underline whitespace-nowrap ml-4" href={action.href}>
            {action.label}
          </a>
        ) : (
          <button className="text-label-md font-semibold text-primary hover:underline whitespace-nowrap ml-4" onClick={action.onClick}>
            {action.label}
          </button>
        ))}
    </div>
  );
}
