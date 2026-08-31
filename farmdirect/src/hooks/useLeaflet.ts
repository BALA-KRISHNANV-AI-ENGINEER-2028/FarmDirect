/**
 * useLeaflet — lazy CDN loader for Leaflet 1.9.
 *
 * Loads the Leaflet UMD bundle from unpkg once per page session.
 * Returns { L, ready } — ready is true when window.L is available.
 *
 * Key robustness details:
 * - If the script tag already exists AND window.L is set (already loaded),
 *   we start ready=true immediately.
 * - If the script tag exists but window.L is not set yet (in-flight),
 *   we poll until it appears, avoiding the race where the load event
 *   fired before our listener was attached.
 * - If no script tag exists, we inject it and listen for onload.
 */
import { useEffect, useState } from "react";

const SCRIPT_ID = "leaflet-js";
const LEAFLET_CDN = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const LEAFLET_INTEGRITY = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV/XN2GqaE=";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    L: any;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LeafletNS = any;

function isLeafletReady(): boolean {
  return typeof window !== "undefined" && !!window.L && typeof window.L.map === "function";
}

export function useLeaflet(): { L: LeafletNS | null; ready: boolean } {
  const [ready, setReady] = useState<boolean>(isLeafletReady);

  useEffect(() => {
    // Already ready — nothing to do.
    if (isLeafletReady()) {
      setReady(true);
      return;
    }

    let pollInterval: ReturnType<typeof setInterval> | null = null;

    function handleLoaded() {
      if (pollInterval) clearInterval(pollInterval);
      // Poll for window.L since onload fires when the script element
      // finishes downloading, but window.L is set synchronously during
      // script execution — they should coincide, but poll to be safe.
      if (isLeafletReady()) {
        setReady(true);
      } else {
        pollInterval = setInterval(() => {
          if (isLeafletReady()) {
            clearInterval(pollInterval!);
            pollInterval = null;
            setReady(true);
          }
        }, 50);
      }
    }

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;

    if (existing) {
      // Script tag exists — might have already loaded (window.L not yet set
      // in our state) or still loading. Start polling.
      pollInterval = setInterval(() => {
        if (isLeafletReady()) {
          clearInterval(pollInterval!);
          pollInterval = null;
          setReady(true);
        }
      }, 50);
      // Belt-and-suspenders: also listen for load event.
      existing.addEventListener("load", handleLoaded);
      return () => {
        existing.removeEventListener("load", handleLoaded);
        if (pollInterval) clearInterval(pollInterval);
      };
    }

    // No script tag yet — inject it.
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = LEAFLET_CDN;
    script.integrity = LEAFLET_INTEGRITY;
    script.crossOrigin = "";
    script.async = true;
    script.onload = handleLoaded;
    script.onerror = () => {
      console.error("[FarmDirect] Failed to load Leaflet from CDN. Map will not render.");
    };
    document.head.appendChild(script);

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, []); // Run once on mount

  return { L: ready ? window.L : null, ready };
}
