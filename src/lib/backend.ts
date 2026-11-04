// Where the backend is, for code that runs on the Next.js server (the /api/auth/iam route handlers). Browser
// code never needs this: its calls go to this app's /api/v1, which next.config proxies to the same address.

export const DEFAULT_BACKEND_URL = "http://127.0.0.1:8200";

/** API_BASE_URL without a trailing slash, so paths can be appended as `${base}/api/v1/…`. */
export const backendBaseUrl = (value: string | undefined = process.env.API_BASE_URL) => (value || DEFAULT_BACKEND_URL).replace(/\/+$/, "");
