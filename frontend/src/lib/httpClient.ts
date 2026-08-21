import axios, { type AxiosError } from 'axios';
import type { ApiErrorEnvelope } from '../types/api';

// Backend base URL. Configure via VITE_API_BASE_URL (see .env.example).
const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api';

/**
 * ASSUMPTION: the backend is not yet confirmed to implement CSRF protection,
 * so this is a best-effort, standards-shaped guess: a double-submit cookie
 * named `XSRF-TOKEN` is read client-side and echoed back as the
 * `X-CSRF-Token` request header on state-changing requests (POST/PUT/DELETE).
 * If the backend uses different cookie/header names (or none at all), update
 * CSRF_COOKIE_NAME / CSRF_HEADER_NAME below accordingly.
 */
const CSRF_COOKIE_NAME = 'XSRF-TOKEN';
const CSRF_HEADER_NAME = 'X-CSRF-Token';

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

export const httpClient = axios.create({
  baseURL,
  // Session-cookie based auth: always send the session cookie.
  withCredentials: true,
});

httpClient.interceptors.request.use((config) => {
  const method = (config.method ?? 'get').toLowerCase();
  if (['post', 'put', 'delete', 'patch'].includes(method)) {
    const token = readCookie(CSRF_COOKIE_NAME);
    if (token) {
      config.headers = config.headers ?? {};
      config.headers[CSRF_HEADER_NAME] = token;
    }
  }
  return config;
});

export interface NormalizedApiError {
  code: string;
  message: string;
  status?: number;
}

export function normalizeApiError(error: unknown): NormalizedApiError {
  const axiosError = error as AxiosError<ApiErrorEnvelope>;
  if (axiosError?.isAxiosError) {
    const envelope = axiosError.response?.data;
    if (envelope?.error) {
      return {
        code: envelope.error.code,
        message: envelope.error.message,
        status: axiosError.response?.status,
      };
    }
    return {
      code: 'network_error',
      message: axiosError.message || 'Network error contacting the server.',
      status: axiosError.response?.status,
    };
  }
  return { code: 'unknown_error', message: 'An unexpected error occurred.' };
}
