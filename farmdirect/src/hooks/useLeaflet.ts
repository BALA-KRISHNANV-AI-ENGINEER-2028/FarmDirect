/**
 * useLeaflet — lazy CDN loader for Leaflet 1.9.
 *
 * We avoid an npm install by loading the Leaflet UMD bundle from unpkg at
 * runtime.  The CSS is already in index.html.  On first call the script is
 * appended to <head>; subsequent calls reuse the existing element / cached
 * load so the script is only requested once per page session.
 */
import { useEffect, useState } from "react";

const SCRIPT_ID = "leaflet-js";
const LEAFLET_CDN =
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

// TypeScript: the Leaflet global injected by the UMD bundle.
// We use `unknown` here and cast via the exported helper `getL()`.
declare global {
  interface Window {
    L: unknown;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LeafletNS = any;

export function useLeaflet(): { L: LeafletNS | null; ready: boolean } {
  const [ready, setReady] = useState<boolean>(typeof window !== "undefined" && !!window.L);

  useEffect(() => {
    if (ready) return;

    // Already injected — wait for load event that may still be in flight.
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => setReady(true));
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = LEAFLET_CDN;
    script.integrity =
      "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV/XN2GqaE=";
    script.crossOrigin = "";
    script.async = true;
    script.onload = () => setReady(true);
    script.onerror = () => console.error("[FarmDirect] Failed to load Leaflet from CDN");
    document.head.appendChild(script);
  }, [ready]);

  return { L: ready ? (window.L as LeafletNS) : null, ready };
}
