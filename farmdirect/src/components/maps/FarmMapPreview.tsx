/**
 * FarmMapPreview — compact single-farm map for the Farm Detail page.
 *
 * Shows just the farm pin centred on the map. Renders nothing if the farm
 * has no coordinates (lat === 0 && lng === 0 is the sentinel).
 */
import { useEffect, useRef } from "react";
import { useLeaflet } from "../../hooks/useLeaflet";
import Icon from "../ui/Icon";

interface FarmMapPreviewProps {
  lat: number;
  lng: number;
  farmName: string;
  height?: number;
  className?: string;
}

export default function FarmMapPreview({ lat, lng, farmName, height = 260, className = "" }: FarmMapPreviewProps) {
  const { L, ready } = useLeaflet();
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (!ready || !L || !containerRef.current || mapRef.current) return;
    if (lat === 0 && lng === 0) return; // No location set.

    const map = L.map(containerRef.current, {
      center: [lat, lng],
      zoom: 13,
      zoomControl: false,
      scrollWheelZoom: false,
      dragging: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    L.marker([lat, lng])
      .addTo(map)
      .bindPopup(`<strong>${farmName}</strong>`)
      .openPopup();

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // If no real coordinates, render nothing.
  if (lat === 0 && lng === 0) return null;

  if (!ready) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl bg-surface-container-low border border-surface-variant ${className}`}
        style={{ height }}
      >
        <Icon name="map" size={28} className="animate-pulse text-on-surface-variant" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`rounded-xl overflow-hidden border border-surface-variant ${className}`}
      style={{ height }}
      aria-label={`Map showing the location of ${farmName}`}
    />
  );
}
