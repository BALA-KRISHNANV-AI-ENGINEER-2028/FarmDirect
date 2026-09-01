const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api";

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

/**
 * Access token lives in memory only (module-level variable), never
 * localStorage — matches decision #5 (rotating refresh token in an
 * httpOnly cookie; access token held client-side only as long as the tab
 * is open). Lost on page refresh, recovered via refreshSession() below.
 */
let accessToken: string | null = null;
let refreshPromise: Promise<boolean> | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  skipAuthRetry?: boolean;
}

export function getErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    // status 0 = fetch() itself threw (network down / CORS block / wrong URL)
    if (err.status === 0) return "Unable to connect to FarmDirect. Check your internet connection.";
    if (err.status === 400) return err.message || "Please check the information you entered.";
    if (err.status === 401) return err.message || "Invalid email or password.";
    if (err.status === 403) return "You don't have permission to perform this action.";
    if (err.status === 404) return "The requested item could not be found.";
    if (err.status === 409) return err.message || "This action conflicts with the current data. Please refresh and try again.";
    if (err.status === 429) return "Too many requests. Please wait a moment and try again.";
    if (err.status >= 500) return "Something went wrong on our server. Please try again.";
    return err.message || "An unexpected error occurred. Please try again.";
  }
  if (err instanceof Error) {
    if (err.name === "TypeError" || err.message.toLowerCase().includes("fetch")) {
      return "Unable to connect to FarmDirect. Check your internet connection.";
    }
    return err.message;
  }
  return "An unexpected error occurred. Please try again.";
}

async function rawRequest(path: string, options: RequestOptions = {}): Promise<Response> {
  const { body, skipAuthRetry, headers, ...rest } = options;
  try {
    return await fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      credentials: "include", // sends the httpOnly refresh-token cookie on /auth/* calls
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, "Unable to connect to FarmDirect. Check your internet connection.");
  }
}

/**
 * Attempts to refresh the access token using the httpOnly cookie. Shares a
 * single in-flight promise so concurrent 401s don't all fire their own
 * refresh calls.
 */
export async function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await rawRequest("/auth/refresh", { method: "POST", skipAuthRetry: true });
        if (!res.ok) {
          setAccessToken(null);
          return false;
        }
        const data = await res.json();
        setAccessToken(data.accessToken);
        return true;
      } catch {
        setAccessToken(null);
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let res = await rawRequest(path, options);

  // One retry after a silent token refresh — covers the common case of an
  // expired 15-minute access token on an otherwise-valid session.
  if (res.status === 401 && !options.skipAuthRetry && path !== "/auth/refresh") {
    const refreshed = await refreshSession();
    if (refreshed) {
      res = await rawRequest(path, options);
    }
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const contentType = res.headers.get("content-type") ?? "";
  const data = contentType.includes("application/json") ? await res.json() : undefined;

  if (!res.ok) {
    const message = data?.error?.message ?? res.statusText ?? "Request failed";
    throw new ApiError(res.status, message, data?.error?.details);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => apiRequest<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: "POST", body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: "PUT", body }),
  delete: <T>(path: string, options?: RequestOptions) => apiRequest<T>(path, { ...options, method: "DELETE" }),
};
