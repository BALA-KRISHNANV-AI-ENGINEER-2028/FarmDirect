import type { ReactNode } from "react";
import { cn } from "../../utils/cn";

interface BadgeProps {
  children: ReactNode;
  variant?: "primary" | "gold" | "outline" | "error" | "neutral";
  icon?: ReactNode;
  className?: string;
}

const variants: Record<string, string> = {
  primary: "bg-primary-container text-on-primary-container",
  gold: "bg-tertiary-fixed text-on-tertiary-fixed-variant",
  outline: "border border-outline-variant text-on-surface-variant bg-surface-bright",
  error: "bg-error-container text-on-error-container",
  neutral: "bg-surface-container text-on-surface-variant",
};

export default function Badge({ children, variant = "neutral", icon, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-label-sm font-semibold backdrop-blur-sm",
        variants[variant],
        className
      )}
    >
      {icon}
      {children}
    </span>
  );
}
