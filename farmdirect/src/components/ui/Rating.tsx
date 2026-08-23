import Icon from "./Icon";

export default function Rating({
  value,
  count,
  size = 16,
}: {
  value: number;
  count?: number;
  size?: number;
}) {
  return (
    <span className="inline-flex items-center gap-1 text-label-sm text-on-surface-variant">
      <Icon name="star" filled size={size} className="text-tertiary-fixed-dim" />
      <span className="font-semibold text-on-surface">{value.toFixed(1)}</span>
      {typeof count === "number" && <span>({count})</span>}
    </span>
  );
}
