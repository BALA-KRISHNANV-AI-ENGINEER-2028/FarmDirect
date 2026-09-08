import { Link } from "react-router-dom";
import { cn } from "../../utils/cn";

export function LogoMark({
  size = 36,
  className,
  variant = "color",
}: {
  size?: number;
  className?: string;
  variant?: "color" | "white" | "dark";
}) {
  const isWhite = variant === "white";
  const isDark = variant === "dark";

  const primaryColor = isWhite ? "#FFFFFF" : isDark ? "#111827" : "#1A5336";
  const accentColor = isWhite ? "#FFFFFF" : isDark ? "#111827" : "#E5A812";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={cn("shrink-0", className)}
      role="img"
      aria-label="FarmDirect"
      fill="none"
    >
      <defs>
        <path
          id={`fd-leaf-prim-${variant}`}
          d="M 0,0 C -3.6,-4 -4,-9.5 0,-14 C 4,-9.5 3.6,-4 0,0 Z"
          fill={primaryColor}
        />
        <path
          id={`fd-leaf-acc-${variant}`}
          d="M 0,0 C -3.6,-4 -4,-9.5 0,-14 C 4,-9.5 3.6,-4 0,0 Z"
          fill={accentColor}
        />
      </defs>
      {/* Central Paddy Stem */}
      <rect x="30.5" y="15" width="3" height="44" rx="1.5" fill={primaryColor} />
      {/* Top Center Leaf */}
      <use href={`#fd-leaf-prim-${variant}`} x="32" y="16" />
      {/* Golden Inner Circles */}
      <circle cx="25.5" cy="19.5" r="2.7" fill={accentColor} />
      <circle cx="38.5" cy="19.5" r="2.7" fill={accentColor} />
      {/* Golden Outer Tilted Grains */}
      <use href={`#fd-leaf-acc-${variant}`} transform="translate(29.5, 24) rotate(-45)" />
      <use href={`#fd-leaf-acc-${variant}`} transform="translate(34.5, 24) rotate(45)" />
      {/* Middle Pair Green Leaves */}
      <use href={`#fd-leaf-prim-${variant}`} transform="translate(30.5, 34.5) rotate(-45)" />
      <use href={`#fd-leaf-prim-${variant}`} transform="translate(33.5, 34.5) rotate(45)" />
      {/* Bottom Pair Green Leaves */}
      <use href={`#fd-leaf-prim-${variant}`} transform="translate(30.5, 45.5) rotate(-45)" />
      <use href={`#fd-leaf-prim-${variant}`} transform="translate(33.5, 45.5) rotate(45)" />
    </svg>
  );
}

export default function Logo({
  className,
  to = "/",
  size = 36,
  showText = true,
  variant = "color",
}: {
  className?: string;
  to?: string;
  size?: number;
  showText?: boolean;
  variant?: "color" | "white" | "dark";
}) {
  const textColor =
    variant === "white"
      ? "text-white"
      : variant === "dark"
        ? "text-neutral-900"
        : "text-primary";

  return (
    <Link to={to} className={cn("inline-flex items-center gap-2 group shrink-0", className)}>
      <LogoMark size={size} variant={variant} />
      {showText && (
        <span
          className={cn(
            "font-display font-extrabold text-headline-md tracking-tight group-hover:opacity-90 transition-opacity",
            textColor
          )}
        >
          FarmDirect
        </span>
      )}
    </Link>
  );
}
