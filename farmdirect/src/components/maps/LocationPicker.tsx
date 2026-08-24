/**
 * LocationPicker — interactive Leaflet map for farmers to set/edit their
 * farm location.
 *
 * The farmer can:
 *   1. Click "Use my location" to auto-centre on their browser position.
 *   2. Click anywhere on the map to drop / move the marker.
 *   3. Drag the marker to fine-tune.
 *
 * The selected lat/lng is reported back via onChange so the parent form
 * can persist it. The parent must call onChange on every coordinate change.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useLeaflet } from "../../hooks/useLeaflet";
import { useGeolocation } from "../../hooks/useGeolocation";
import Icon from "../ui/Icon";
import Button from "../ui/Button";

export interface LocationPickerProps {
  /** Initially shown coordinates (e.g. from an existing farm). */
  initialLat?: number | null;
  initialLng?: number | null;
  onChange: (lat: number, lng: number) => void;
  /** px height, default 360 */
  height?: number;
}

// Default centre — geographic centre of India, no farm selected yet.
const DEFAULT_LAT = 20.5937;
const DEFAULT_LNG = 78.9629;
const DEFAULT_ZOOM = 5;
const MARKER_ZOOM = 14;

export default function LocationPicker({ initialLat, initialLng, onChange, height = 360 }: LocationPickerProps) {
  const { L, ready } = useLeaflet();
  const geo = useGeolocation();
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);

  const [selectedLat, setSelectedLat] = useState<number | null>(initialLat ?? null);
  const [selectedLng, setSelectedLng] = useState<number | null>(initialLng ?? null);

  // Called any time the marker position changes.
  const reportPosition = useCallback(
    (lat: number, lng: number) => {
      setSelectedLat(lat);
      setSelectedLng(lng);
      onChange(lat, lng);
    },
    [onChange]
  );

  // Initialise map once Leaflet is ready.
  useEffect(() => {
    if (!ready || !L || !containerRef.current || mapRef.current) return;

    const startLat = initialLat ?? DEFAULT_LAT;
    const startLng = initialLng ?? DEFAULT_LNG;
    const zoom = initialLat != null ? MARKER_ZOOM : DEFAULT_ZOOM;

    const map = L.map(containerRef.current, { center: [startLat, startLng], zoom });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // If initial coordinates exist, drop a draggable marker immediately.
    if (initialLat != null && initialLng != null) {
      const marker = L.marker([initialLat, initialLng], { draggable: true }).addTo(map);
      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        reportPosition(pos.lat, pos.lng);
      });
      markerRef.current = marker;
    }

    // Click anywhere on the map to move / create the marker.
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

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // Pan map to browser geolocation when granted.
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
  }, [ready, L, geo.status, geo.position, reportPosition]);

  if (!ready) {
    return (
      <div
        className="flex items-center justify-center rounded-xl bg-surface-container-low border border-surface-variant"
        style={{ height }}
      >
        <div className="flex flex-col items-center gap-2 text-on-surface-variant">
          <Icon name="map" size={32} className="animate-pulse" />
          <p className="text-label-md">Loading map…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Location controls */}
      <div className="flex flex-wrap items-center gap-2">
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

      {/* Error / info messages */}
      {geo.error && (
        <p className="text-label-sm text-on-surface-variant flex items-center gap-1.5">
          <Icon name="info" size={14} />
          {geo.error}
        </p>
      )}
      {!selectedLat && !geo.error && (
        <p className="text-label-sm text-on-surface-variant flex items-center gap-1.5">
          <Icon name="info" size={14} />
          Click on the map or use your current location to set the farm position.
        </p>
      )}

      {/* Map container */}
      <div
        ref={containerRef}
        className="rounded-xl overflow-hidden border border-surface-variant"
        style={{ height }}
        aria-label="Farm location picker map"
      />
    </div>
  );
}
