import axios, { AxiosError } from 'axios';

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

/**
 * True when the API itself could not be reached: no HTTP response at all (offline, DNS,
 * timeout), or a proxy/gateway answering on behalf of a backend that is down
 * (502/503/504, or any 5xx without the API's JSON envelope).
 */
export function isNetworkError(err: unknown): boolean {
  if (!axios.isAxiosError(err)) return false;
  const res = (err as AxiosError).response;
  if (!res) return true;
  if ([502, 503, 504].includes(res.status)) return true;
  const fromApi = typeof res.data === 'object' && res.data !== null && 'success' in res.data;
  return res.status >= 500 && !fromApi;
}

/** The session is missing or expired (the API answered 401). */
export function isUnauthorized(err: unknown): boolean {
  return axios.isAxiosError(err) && err.response?.status === 401;
}

/**
 * True for errors worth retrying later rather than discarding the write.
 * 401 included: a write made when the session expired waits for the next login.
 */
export function isRetryable(err: unknown): boolean {
  if (isNetworkError(err)) return true;
  const status = axios.isAxiosError(err) ? err.response?.status ?? 0 : 0;
  return status >= 500 || status === 401 || status === 408 || status === 429;
}

// --- Session expiry -----------------------------------------------------------
// The auth module registers here (it imports http, so http cannot import it).
let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void) {
  unauthorizedHandler = handler;
}

http.interceptors.response.use(undefined, (err) => {
  const url = axios.isAxiosError(err) ? err.config?.url ?? '' : '';
  // /auth/* handle their own 401 (wrong password, no session yet at startup)
  if (isUnauthorized(err) && !url.startsWith('/auth/')) unauthorizedHandler?.();
  return Promise.reject(err);
});

export function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return (err.response?.data as { error?: string } | undefined)?.error || err.message;
  }
  return err instanceof Error ? err.message : String(err);
}
