/**
 * FarmMapPreview — compact single-farm Leaflet map for FarmDetail page.
 *
 * Container is ALWAYS in the DOM. Uses overlay pattern for loading state.
 * Renders nothing if lat/lng are both 0 (no location set for this farm).
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

export default function FarmMapPreview({
  lat,
  lng,
  farmName,
  height = 260,
  className = "",
}: FarmMapPreviewProps) {
  const { L, ready } = useLeaflet();
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);

  // No real coordinates — render nothing
  if (lat === 0 && lng === 0) return null;

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!ready || !L || !containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [lat, lng],
      zoom: 13,
      zoomControl: false,
      scrollWheelZoom: false,
      dragging: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    L.marker([lat, lng])
      .addTo(map)
      .bindPopup(`<strong>${farmName}</strong>`)
      .openPopup();

    mapRef.current = map;

    setTimeout(() => {
      if (mapRef.current) mapRef.current.invalidateSize();
    }, 100);

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, L]);

  return (
    <div
      className={`relative rounded-xl overflow-hidden border border-surface-variant ${className}`}
      style={{ height }}
    >
      {!ready && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface-container-low">
          <Icon name="map" size={28} className="animate-pulse text-on-surface-variant" />
        </div>
      )}
      <div
        ref={containerRef}
        style={{ width: "100%", height: "100%" }}
        aria-label={`Map showing location of ${farmName}`}
      />
    </div>
  );
}
