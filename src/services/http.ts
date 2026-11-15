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

/** True for errors worth retrying later rather than discarding the write. */
export function isRetryable(err: unknown): boolean {
  if (isNetworkError(err)) return true;
  const status = axios.isAxiosError(err) ? err.response?.status ?? 0 : 0;
  return status >= 500 || status === 408 || status === 429;
}

export function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return (err.response?.data as { error?: string } | undefined)?.error || err.message;
  }
  return err instanceof Error ? err.message : String(err);
}
