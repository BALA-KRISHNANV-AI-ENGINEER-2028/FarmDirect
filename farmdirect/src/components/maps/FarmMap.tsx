/**
 * FarmMap — Leaflet map for farm discovery.
 *
 * ARCHITECTURE:
 * - The map container div is ALWAYS in the DOM so Leaflet always has a real
 *   element to measure. We use CSS visibility + a loading overlay instead of
 *   conditional rendering.
 * - Map is initialised once when Leaflet becomes ready. We call
 *   invalidateSize() after init to force Leaflet to measure the container
 *   after the browser has laid it out.
 * - Farm data (markers) is completely optional. The map renders with
 *   farms = [] showing only the "You are here" marker.
 * - Unmounting cleans up via map.remove() so list→map→list→map toggling
 *   works without "container already initialized" errors.
 */
import { useEffect, useRef, useState } from "react";
import { useLeaflet } from "../../hooks/useLeaflet";
import Icon from "../ui/Icon";
import type { Farm } from "../../types";

export interface FarmMapProps {
  userLat?: number;
  userLng?: number;
  farms: Farm[];
  /** px height — must be explicit, default 480 */
  height?: number;
  className?: string;
}

// Default centre: geographic centre of India
const DEFAULT_LAT = 20.5937;
const DEFAULT_LNG = 78.9629;
const DEFAULT_ZOOM = 5;
const USER_ZOOM = 12;

function makeUserIcon(L: NonNullable<ReturnType<typeof useLeaflet>["L"]>) {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:20px;height:20px;border-radius:50%;
      background:#1a73e8;border:3px solid #fff;
      box-shadow:0 0 0 8px rgba(26,115,232,.2);
    "></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -12],
  });
}

function makeFarmIcon(L: NonNullable<ReturnType<typeof useLeaflet>["L"]>) {
  return L.divIcon({
    className: "",
    html: `<div style="
      display:flex;align-items:center;justify-content:center;
      width:34px;height:34px;border-radius:50% 50% 50% 0;
      background:#2e7d32;border:2px solid #fff;
      box-shadow:0 2px 6px rgba(0,0,0,.35);
      transform:rotate(-45deg);
    "><span style="transform:rotate(45deg);font-size:16px;color:#fff;
      font-family:'Material Symbols Outlined';font-variation-settings:'FILL' 1">
        storefront
      </span></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -36],
  });
}

export default function FarmMap({
  userLat,
  userLng,
  farms,
  height = 480,
  className = "",
}: FarmMapProps) {
  const { L, ready } = useLeaflet();
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userMarkerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const farmMarkersRef = useRef<any[]>([]);
  const [mapError, setMapError] = useState<string | null>(null);

  // ── Map initialisation ────────────────────────────────────────────────────
  // Runs once when Leaflet becomes available. The container div is always
  // in the DOM at this point (never conditionally rendered), so
  // getBoundingClientRect() returns real dimensions.
  useEffect(() => {
    if (!ready || !L || !containerRef.current) return;
    if (mapRef.current) return; // already initialised

    try {
      const startLat = userLat ?? DEFAULT_LAT;
      const startLng = userLng ?? DEFAULT_LNG;
      const zoom = userLat != null ? USER_ZOOM : DEFAULT_ZOOM;

      const map = L.map(containerRef.current, {
        center: [startLat, startLng],
        zoom,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;

      // Force Leaflet to recalculate the container size after the browser
      // has painted. This is the key fix for the "blank map" problem.
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      }, 100);
    } catch (err) {
      console.error("[FarmMap] Leaflet init error:", err);
      setMapError("Map failed to initialise. Please refresh the page.");
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        userMarkerRef.current = null;
        farmMarkersRef.current = [];
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, L]);

  // ── User location marker ──────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !L) return;
    const map = mapRef.current;

    // Remove old user marker
    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }

    if (userLat != null && userLng != null) {
      try {
        const marker = L.marker([userLat, userLng], { icon: makeUserIcon(L) })
          .addTo(map)
          .bindPopup("<strong>📍 You are here</strong>", { maxWidth: 180 });
        marker.openPopup();
        userMarkerRef.current = marker;
        map.setView([userLat, userLng], USER_ZOOM, { animate: true });
        // Re-measure after pan animation
        setTimeout(() => map.invalidateSize(), 350);
      } catch (err) {
        console.warn("[FarmMap] Failed to place user marker:", err);
      }
    }
  }, [L, userLat, userLng]);

  // ── Farm markers ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !L) return;
    const map = mapRef.current;

    farmMarkersRef.current.forEach((m) => m.remove());
    farmMarkersRef.current = [];

    if (farms.length === 0) return;

    const farmIcon = makeFarmIcon(L);
    const validLatLngs: [number, number][] = [];

    farms.forEach((farm) => {
      if (farm.lat === 0 && farm.lng === 0) return; // no real coords
      validLatLngs.push([farm.lat, farm.lng]);
      try {
        const marker = L.marker([farm.lat, farm.lng], { icon: farmIcon })
          .addTo(map)
          .bindPopup(
            `<div style="min-width:160px;font-family:inherit">
              <p style="font-weight:700;font-size:14px;margin:0 0 4px;color:#1a1a1a">${farm.name}</p>
              ${farm.location ? `<p style="font-size:12px;color:#666;margin:0 0 4px">${farm.location}</p>` : ""}
              ${farm.distanceMi ? `<p style="font-size:12px;color:#2e7d32;margin:0 0 8px;font-weight:600">${farm.distanceMi} km away</p>` : ""}
              <a href="/farms/${farm.id}" style="display:inline-block;padding:4px 10px;background:#2e7d32;color:#fff;border-radius:6px;font-size:12px;font-weight:600;text-decoration:none">View farm →</a>
            </div>`,
            { maxWidth: 240 }
          );
        farmMarkersRef.current.push(marker);
      } catch (err) {
        console.warn("[FarmMap] Failed to place farm marker:", err);
      }
    });

    // Fit bounds to show all farms + user location
    if (validLatLngs.length > 0) {
      try {
        const allPoints: [number, number][] =
          userLat != null && userLng != null
            ? [[userLat, userLng], ...validLatLngs]
            : validLatLngs;
        map.fitBounds(L.latLngBounds(allPoints), { padding: [48, 48], maxZoom: 14 });
        setTimeout(() => map.invalidateSize(), 350);
      } catch {
        // ignore fitBounds failures
      }
    }
  }, [L, farms, userLat, userLng]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className={`relative rounded-xl overflow-hidden border border-surface-variant ${className}`}
      style={{ height }}
    >
      {/* Loading overlay — shown while Leaflet CDN script loads */}
      {!ready && !mapError && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-surface-container-low">
          <Icon name="map" size={40} className="text-on-surface-variant animate-pulse mb-3" />
          <p className="text-label-lg text-on-surface-variant">Loading map…</p>
          <p className="text-label-sm text-outline mt-1">Fetching Leaflet from CDN</p>
        </div>
      )}

      {/* Error overlay */}
      {mapError && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-surface-container-low">
          <Icon name="map_off" size={40} className="text-error mb-3" />
          <p className="text-label-lg text-on-surface-variant">{mapError}</p>
        </div>
      )}

      {/* The map container is ALWAYS in the DOM — never conditionally rendered.
          Leaflet needs a real element with real dimensions to initialise. */}
      <div
        ref={containerRef}
        style={{ width: "100%", height: "100%" }}
        aria-label="Farm map"
      />
    </div>
  );
}
