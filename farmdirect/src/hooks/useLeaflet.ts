/**
 * useLeaflet — production-grade lazy CDN loader for Leaflet 1.9.
 *
 * Features:
 * - Checks if window.L & window.L.map is already available.
 * - Primary CDN (unpkg) with fallbacks (cdnjs, jsDelivr) if primary fails.
 * - Dynamic CSS injection with anonymous crossOrigin.
 * - Per-attempt timeout (7s) to guarantee no infinite "Loading map…".
 * - Returns { L, ready, error, retry } with full error & retry handling.
 */
import { useCallback, useEffect, useState } from "react";

const CDNS = [
  {
    js: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
    css: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
  },
  {
    js: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js",
    css: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css",
  },
  {
    js: "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js",
    css: "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css",
  },
];

const SCRIPT_ID_PREFIX = "leaflet-js-cdn-";
const CSS_ID = "leaflet-css-dynamic";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    L: any;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LeafletNS = any;

export function isLeafletReady(): boolean {
  return typeof window !== "undefined" && !!window.L && typeof window.L.map === "function";
}

export function useLeaflet(): {
  L: LeafletNS | null;
  ready: boolean;
  error: string | null;
  retry: () => void;
} {
  const [ready, setReady] = useState<boolean>(isLeafletReady);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<number>(0);

  const retry = useCallback(() => {
    setError(null);
    setReady(isLeafletReady());
    setAttempt((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (isLeafletReady()) {
      setReady(true);
      setError(null);
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let pollId: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    // Ensure CSS is injected
    const ensureCss = (cssUrl: string) => {
      if (document.getElementById(CSS_ID) || document.querySelector('link[href*="leaflet.css"]')) return;
      const link = document.createElement("link");
      link.id = CSS_ID;
      link.rel = "stylesheet";
      link.href = cssUrl;
      link.crossOrigin = "anonymous";
      document.head.appendChild(link);
    };

    const tryLoadCdn = (index: number) => {
      if (cancelled) return;
      if (index >= CDNS.length) {
        setError("Unable to load map library from CDN. Please check your connection and click retry.");
        setReady(false);
        return;
      }

      const { js, css } = CDNS[index];
      ensureCss(css);

      const scriptId = `${SCRIPT_ID_PREFIX}${index}`;
      let script = document.getElementById(scriptId) as HTMLScriptElement | null;

      if (!script) {
        script = document.createElement("script");
        script.id = scriptId;
        script.src = js;
        script.crossOrigin = "anonymous";
        script.async = true;
        document.head.appendChild(script);
      }

      // Timeout per CDN attempt
      timeoutId = setTimeout(() => {
        if (cancelled) return;
        if (!isLeafletReady()) {
          console.warn(`[FarmDirect] Leaflet CDN attempt ${index + 1} (${js}) timed out, trying fallback...`);
          if (pollId) clearInterval(pollId);
          tryLoadCdn(index + 1);
        }
      }, 7000);

      // Poll every 50ms for window.L
      pollId = setInterval(() => {
        if (cancelled) return;
        if (isLeafletReady()) {
          if (pollId) clearInterval(pollId);
          if (timeoutId) clearTimeout(timeoutId);
          setReady(true);
          setError(null);
        }
      }, 50);

      script.onerror = () => {
        if (cancelled) return;
        console.warn(`[FarmDirect] Leaflet CDN attempt ${index + 1} (${js}) failed, trying fallback...`);
        if (pollId) clearInterval(pollId);
        if (timeoutId) clearTimeout(timeoutId);
        tryLoadCdn(index + 1);
      };
    };

    tryLoadCdn(0);

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      if (pollId) clearInterval(pollId);
    };
  }, [attempt]);

  return {
    L: ready && typeof window !== "undefined" ? window.L : null,
    ready,
    error,
    retry,
  };
}
