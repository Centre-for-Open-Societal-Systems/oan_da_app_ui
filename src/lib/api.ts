// Thin fetch wrapper for the backend. Requests go to this app's /api/v1, which next.config proxies to the
// backend, so the browser never makes a cross-origin call.

export class ApiError extends Error {
  constructor(
    message: string,
    /** HTTP status; 0 when the request never reached the server. */
    readonly status: number,
    /** The error body's `details`, when it carried any (e.g. the row errors of a refused import). */
    readonly details?: unknown,
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
  /** Sent as `X-CSRF-Token`: the staff IAM's double-submit value that goes with an IAM access token. */
  csrfToken?: string;
}

export async function apiRequest<T>(path: string, { method = "GET", body, accessToken, csrfToken }: ApiRequest = {}): Promise<T> {
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  const headers: Record<string, string> = { Accept: "application/json" };
  // A FormData body sets its own multipart Content-Type, boundary included.
  if (body !== undefined && !isForm) headers["Content-Type"] = "application/json";
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (csrfToken) headers["X-CSRF-Token"] = csrfToken;

  let res: Response;
  try {
    res = await fetch(`/api/v1${path}`, { method, headers, body: body === undefined ? undefined : isForm ? body : JSON.stringify(body) });
  } catch {
    throw new ApiError("Could not reach the server. Check your connection and try again.", 0);
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(errorMessage(data) ?? `Request failed (${res.status}).`, res.status, errorDetails(data));
  return data as T;
}

export const apiPost = <T>(path: string, body: unknown) => apiRequest<T>(path, { method: "POST", body });

const errorDetails = (data: unknown): unknown => (data && typeof data === "object" ? (data as { details?: unknown }).details : undefined);

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
