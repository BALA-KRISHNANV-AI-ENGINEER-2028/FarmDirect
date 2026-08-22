import { cn } from "../../utils/cn";

interface IconProps {
  name: string;
  className?: string;
  size?: number;
  filled?: boolean;
}

export default function Icon({ name, className, size = 20, filled = false }: IconProps) {
  return (
    <span
      className={cn("material-symbols-outlined leading-none select-none", className)}
      style={{ fontSize: size, fontVariationSettings: `'FILL' ${filled ? 1 : 0}` }}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}
