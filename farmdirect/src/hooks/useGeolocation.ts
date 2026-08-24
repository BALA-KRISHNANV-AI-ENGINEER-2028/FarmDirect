/**
 * useGeolocation — clean browser Geolocation API wrapper.
 *
 * Returns the current position and a status so components can show the
 * correct UI for every browser permission state without ad-hoc logic.
 * Permission is only requested when `request()` is called — never
 * automatically on mount — to avoid surprise prompts.
 */
import { useCallback, useState } from "react";

export type GeoStatus =
  | "idle"
  | "loading"
  | "success"
  | "denied"
  | "unavailable"
  | "timeout"
  | "unsupported";

export interface GeoPosition {
  lat: number;
  lng: number;
  accuracy?: number;
}

export interface UseGeolocationResult {
  status: GeoStatus;
  position: GeoPosition | null;
  error: string | null;
  request: () => void;
}

const GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10_000,
  maximumAge: 30_000,
};

export function useGeolocation(): UseGeolocationResult {
  const [status, setStatus] = useState<GeoStatus>("idle");
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus("unsupported");
      setError("Your browser doesn't support location access.");
      return;
    }

    setStatus("loading");
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setStatus("success");
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setStatus("denied");
          setError("Location permission was denied. You can enter coordinates manually.");
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setStatus("unavailable");
          setError("Your current position is unavailable. Try again or enter coordinates manually.");
        } else if (err.code === err.TIMEOUT) {
          setStatus("timeout");
          setError("Location request timed out. Please try again.");
        } else {
          setStatus("unavailable");
          setError("Could not determine your location.");
        }
      },
      GEO_OPTIONS
    );
  }, []);

  return { status, position, error, request };
}
