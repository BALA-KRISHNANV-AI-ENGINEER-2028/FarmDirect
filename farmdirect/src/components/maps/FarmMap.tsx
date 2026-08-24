/**
 * FarmMap — read-only Leaflet map for farm discovery.
 *
 * Shows a customer location marker (blue pulse) and farm markers (green pins).
 * Clicking a farm marker opens a popup with name, distance, and a link to
 * the farm detail page. Works on mobile and desktop. Map is initialised once
 * and updated imperatively when props change, avoiding re-init jank.
 */
import { useEffect, useRef } from "react";
import { useLeaflet } from "../../hooks/useLeaflet";
import Icon from "../ui/Icon";
import type { Farm } from "../../types";

export interface FarmMapProps {
  userLat?: number;
  userLng?: number;
  farms: Farm[];
  /** px height, default 480 */
  height?: number;
  className?: string;
}

// Leaflet icon factory — kept outside React render to avoid recreation.
function makeFarmIcon(L: NonNullable<ReturnType<typeof useLeaflet>["L"]>) {
  return L.divIcon({
    className: "",
    html: `<span class="fd-farm-marker" style="
      display:inline-flex;align-items:center;justify-content:center;
      width:32px;height:32px;border-radius:50% 50% 50% 0;
      background:#2e7d32;border:2px solid #fff;
      box-shadow:0 2px 6px rgba(0,0,0,.3);
      transform:rotate(-45deg);
    "><span style="transform:rotate(45deg);font-size:15px;color:#fff;
      font-family:'Material Symbols Outlined';font-variation-settings:'FILL' 1">
        storefront
      </span></span>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -34],
  });
}

function makeUserIcon(L: NonNullable<ReturnType<typeof useLeaflet>["L"]>) {
  return L.divIcon({
    className: "",
    html: `<span style="
      display:block;width:16px;height:16px;border-radius:50%;
      background:#1a73e8;border:3px solid #fff;
      box-shadow:0 0 0 6px rgba(26,115,232,.25);
    "></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -10],
  });
}

export default function FarmMap({ userLat, userLng, farms, height = 480, className = "" }: FarmMapProps) {
  const { L, ready } = useLeaflet();
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userMarkerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const farmMarkersRef = useRef<any[]>([]);

  // Initialise map once Leaflet is ready.
  useEffect(() => {
    if (!ready || !L || !containerRef.current || mapRef.current) return;

    const defaultLat = userLat ?? 20.5937;
    const defaultLng = userLng ?? 78.9629;
    const zoom = userLat != null ? 11 : 5;

    const map = L.map(containerRef.current, {
      center: [defaultLat, defaultLng],
      zoom,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    // Clean up on unmount.
    return () => {
      map.remove();
      mapRef.current = null;
      userMarkerRef.current = null;
      farmMarkersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // Sync user location marker.
  useEffect(() => {
    if (!ready || !L || !mapRef.current) return;
    const map = mapRef.current;

    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }

    if (userLat != null && userLng != null) {
      userMarkerRef.current = L.marker([userLat, userLng], { icon: makeUserIcon(L) })
        .addTo(map)
        .bindPopup("📍 Your location");
      map.setView([userLat, userLng], 11, { animate: true });
    }
  }, [ready, L, userLat, userLng]);

  // Sync farm markers.
  useEffect(() => {
    if (!ready || !L || !mapRef.current) return;
    const map = mapRef.current;

    // Remove old markers.
    farmMarkersRef.current.forEach((m) => m.remove());
    farmMarkersRef.current = [];

    const farmIcon = makeFarmIcon(L);
    const latLngs: [number, number][] = [];

    farms.forEach((farm) => {
      // Skip farms that have no real coordinates (lat/lng both 0 is the
      // default sentinel for "unknown" — see farmsApi.ts toFarm()).
      if (farm.lat === 0 && farm.lng === 0) return;
      latLngs.push([farm.lat, farm.lng]);
      const marker = L.marker([farm.lat, farm.lng], { icon: farmIcon })
        .addTo(map)
        .bindPopup(
          `<div style="min-width:160px">
            <p style="font-weight:600;font-size:14px;margin:0 0 4px">${farm.name}</p>
            ${farm.location ? `<p style="font-size:12px;color:#666;margin:0 0 4px">${farm.location}</p>` : ""}
            ${farm.distanceMi ? `<p style="font-size:12px;color:#2e7d32;margin:0 0 8px;font-weight:600">${farm.distanceMi} km away</p>` : ""}
            <a href="/farms/${farm.id}" style="display:inline-block;font-size:12px;font-weight:600;color:#2e7d32;text-decoration:underline">View farm →</a>
          </div>`,
          { maxWidth: 240 }
        );
      farmMarkersRef.current.push(marker);
    });

    // If we have farms with coords, fit the map to them.
    if (latLngs.length > 0 && !userLat) {
      map.fitBounds(L.latLngBounds(latLngs), { padding: [48, 48] });
    } else if (latLngs.length > 0 && userLat != null && userLng != null) {
      const allBounds = [[userLat, userLng], ...latLngs] as [number, number][];
      map.fitBounds(L.latLngBounds(allBounds), { padding: [48, 48] });
    }
  }, [ready, L, farms, userLat, userLng]);

  if (!ready) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl bg-surface-container-low border border-surface-variant ${className}`}
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
    <div
      ref={containerRef}
      className={`rounded-xl overflow-hidden border border-surface-variant ${className}`}
      style={{ height }}
      aria-label="Farm map"
    />
  );
}
