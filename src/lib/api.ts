// Thin fetch wrapper for the backend. Requests go to this app's /api/v1, which next.config proxies to the
// backend, so the browser never makes a cross-origin call.
import { readCookie } from "@/lib/cookies";

export class ApiError extends Error {
  constructor(
    message: string,
    /** HTTP status; 0 when the request never reached the server. */
    readonly status: number,
    /** A 400's `details`: field name → what is wrong with it. */
    readonly details?: Record<string, string>,
    /** The error `code` the backend sent, e.g. VALIDATION_ERROR or PERMISSION_DENIED. */
    readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface ApiRequest {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Sent as JSON, or as multipart/form-data when it is a FormData (file uploads). */
  body?: unknown;
  /** Sent as `Authorization: Bearer …`; signed-in calls get it from features/auth (authRequest). */
  accessToken?: string;
  /** Sent as `X-CSRF-Token`; IAM-issued sessions carry one, required by the backends behind them. */
  csrfToken?: string;
  /** Path prefix on this app; defaults to the DA Services API. */
  prefix?: string;
}

// The CSRF value of the current session. The auth store registers itself here (lib cannot import the store), so
// every call below, signed in or not, carries X-CSRF-Token without each caller passing it.
let csrfProvider: () => string | undefined = () => undefined;
export function setCsrfProvider(provider: () => string | undefined) {
  csrfProvider = provider;
}

/** The CSRF token to send now: the session's own, else the X-CSRF-Token cookie a backend may have set. */
export function currentCsrfToken(): string | undefined {
  return csrfProvider() ?? readCookie("X-CSRF-Token") ?? undefined;
}

export async function apiRequest<T>(path: string, { method = "GET", body, accessToken, csrfToken, prefix = "/api/v1" }: ApiRequest = {}): Promise<T> {
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  const headers: Record<string, string> = { Accept: "application/json" };
  // A FormData body sets its own multipart Content-Type, boundary included.
  if (body !== undefined && !isForm) headers["Content-Type"] = "application/json";
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const csrf = csrfToken ?? currentCsrfToken();
  if (csrf) headers["X-CSRF-Token"] = csrf;
  if (process.env.NODE_ENV !== "production") console.debug(`[api] ${method} ${prefix}${path} -> header "${csrf ? "X-CSRF-Token" : "(none)"}", Authorization ${accessToken ? "yes" : "no"}`);

  let res: Response;
  try {
    res = await fetch(`${prefix}${path}`, { method, headers, body: body === undefined ? undefined : isForm ? body : JSON.stringify(body) });
  } catch {
    throw new ApiError("Could not reach the server. Check your connection and try again.", 0);
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(errorMessage(data) ?? `Request failed (${res.status}).`, res.status, errorDetails(data), errorCode(data));
  return data as T;
}

export const apiPost = <T>(path: string, body: unknown) => apiRequest<T>(path, { method: "POST", body });

/** A 400's `details` as field → text; undefined when the body has none. */
export function errorDetails(data: unknown): Record<string, string> | undefined {
  const raw = data && typeof data === "object" ? (data as Record<string, unknown>).details : undefined;
  if (!raw || typeof raw !== "object") return undefined;
  const entries = Object.entries(raw).filter((e): e is [string, string] => typeof e[1] === "string" && !!e[1].trim());
  return entries.length ? Object.fromEntries(entries) : undefined;
}

function errorCode(data: unknown): string | undefined {
  const code = data && typeof data === "object" ? (data as Record<string, unknown>).code : undefined;
  return typeof code === "string" ? code : undefined;
}

// Error bodies carry their text under `message` (Frappe), `error` or `detail`; take the first readable one.
// A generic "Validation failed" names the broken fields under `details`, which say more than it does.
export function errorMessage(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const d = data as Record<string, unknown>;
  const fieldErrors = d.details && typeof d.details === "object" ? Object.values(d.details).filter((v): v is string => typeof v === "string" && !!v.trim()) : [];
  if (fieldErrors.length > 0) return fieldErrors.join(" ");
  for (const value of [d.message, d.error, d.detail]) {
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
}
