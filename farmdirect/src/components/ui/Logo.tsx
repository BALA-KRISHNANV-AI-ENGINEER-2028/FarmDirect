import { Link } from "react-router-dom";
import { cn } from "../../utils/cn";

export function LogoMark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label="FarmDirect leaf logo"
    >
      <rect width="64" height="64" rx="16" fill="#154212" />
      <path
        d="M32 50C20 50 12 42 12 28c0-6 2-11 5-15 3 8 10 12 18 12 5 0 9-2 12-5 1 4 1 8 0 12-2 12-9 18-15 18z"
        fill="#a1d494"
      />
      <path
        d="M32 50c0-14 4-24 13-31"
        stroke="#154212"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export default function Logo({
  className,
  to = "/",
  size = 36,
}: {
  className?: string;
  to?: string;
  size?: number;
}) {
  return (
    <Link to={to} className={cn("flex items-center gap-2 group", className)}>
      <LogoMark size={size} />
      <span className="font-display font-extrabold text-headline-md text-primary group-hover:opacity-90 transition-opacity">
        FarmDirect
      </span>
    </Link>
  );
}
