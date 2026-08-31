/**
 * LocationPicker — interactive Leaflet map for farmers to set farm coordinates.
 *
 * - Click anywhere to drop/move a draggable marker.
 * - "Use my location" button triggers browser geolocation.
 * - Initial coordinates (if provided) are shown immediately.
 * - Container is ALWAYS in the DOM. Loading overlay covers it while Leaflet loads.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useLeaflet } from "../../hooks/useLeaflet";
import { useGeolocation } from "../../hooks/useGeolocation";
import Icon from "../ui/Icon";
import Button from "../ui/Button";

export interface LocationPickerProps {
  initialLat?: number | null;
  initialLng?: number | null;
  onChange: (lat: number, lng: number) => void;
  height?: number;
}

const DEFAULT_LAT = 20.5937;
const DEFAULT_LNG = 78.9629;
const DEFAULT_ZOOM = 5;
const MARKER_ZOOM = 14;

export default function LocationPicker({
  initialLat,
  initialLng,
  onChange,
  height = 360,
}: LocationPickerProps) {
  const { L, ready } = useLeaflet();
  const geo = useGeolocation();
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);
  const [selectedLat, setSelectedLat] = useState<number | null>(initialLat ?? null);
  const [selectedLng, setSelectedLng] = useState<number | null>(initialLng ?? null);

  const reportPosition = useCallback(
    (lat: number, lng: number) => {
      setSelectedLat(lat);
      setSelectedLng(lng);
      onChange(lat, lng);
    },
    [onChange]
  );

  // ── Map init ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ready || !L || !containerRef.current || mapRef.current) return;

    const startLat = initialLat ?? DEFAULT_LAT;
    const startLng = initialLng ?? DEFAULT_LNG;
    const zoom = initialLat != null ? MARKER_ZOOM : DEFAULT_ZOOM;

    const map = L.map(containerRef.current, { center: [startLat, startLng], zoom });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Pre-place marker at initial coordinates
    if (initialLat != null && initialLng != null) {
      const marker = L.marker([initialLat, initialLng], { draggable: true }).addTo(map);
      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        reportPosition(pos.lat, pos.lng);
      });
      markerRef.current = marker;
    }

    // Click to place/move marker
    map.on("click", (e: { latlng: { lat: number; lng: number } }) => {
      const { lat, lng } = e.latlng;
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
        marker.on("dragend", () => {
          const pos = marker.getLatLng();
          reportPosition(pos.lat, pos.lng);
        });
        markerRef.current = marker;
      }
      reportPosition(lat, lng);
    });

    mapRef.current = map;

    setTimeout(() => {
      if (mapRef.current) mapRef.current.invalidateSize();
    }, 100);

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, L]);

  // ── Pan to geo position when it arrives ────────────────────────────────────
  useEffect(() => {
    if (!ready || !L || !mapRef.current || geo.status !== "success" || !geo.position) return;
    const { lat, lng } = geo.position;
    const map = mapRef.current;

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        reportPosition(pos.lat, pos.lng);
      });
      markerRef.current = marker;
    }
    map.setView([lat, lng], MARKER_ZOOM, { animate: true });
    reportPosition(lat, lng);
    setTimeout(() => map.invalidateSize(), 350);
  }, [ready, L, geo.status, geo.position, reportPosition]);

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          icon={<Icon name="my_location" size={16} />}
          onClick={geo.request}
          disabled={geo.status === "loading"}
        >
          {geo.status === "loading" ? "Finding location…" : "Use my location"}
        </Button>
        {selectedLat != null && selectedLng != null && (
          <span className="text-label-sm text-on-surface-variant font-mono">
            {selectedLat.toFixed(5)}, {selectedLng.toFixed(5)}
          </span>
        )}
      </div>

      {geo.error && (
        <p className="text-label-sm text-on-surface-variant flex items-center gap-1.5">
          <Icon name="info" size={14} />
          {geo.error}
        </p>
      )}
      {!selectedLat && !geo.error && (
        <p className="text-label-sm text-on-surface-variant flex items-center gap-1.5">
          <Icon name="touch_app" size={14} />
          Click on the map to pin your farm's exact location.
        </p>
      )}

      {/* Map */}
      <div
        className="relative rounded-xl overflow-hidden border border-surface-variant"
        style={{ height }}
      >
        {!ready && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-surface-container-low">
            <Icon name="map" size={32} className="animate-pulse text-on-surface-variant mb-2" />
            <p className="text-label-md text-on-surface-variant">Loading map…</p>
          </div>
        )}
        <div
          ref={containerRef}
          style={{ width: "100%", height: "100%" }}
          aria-label="Farm location picker"
        />
      </div>
    </div>
  );
}
