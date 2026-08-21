import axios, { type AxiosError } from 'axios';
import type { ApiErrorEnvelope } from '../types/api';

// Backend base URL. Configure via VITE_API_BASE_URL (see .env.example).
const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api';

/**
 * The backend's CSRF cookie is httpOnly (not readable from JS by design), so
 * the double-submit token is instead handed back in the JSON body of
 * POST /auth/login and GET /auth/session, and echoed here as the
 * `x-csrf-token` header on state-changing requests.
 */
const CSRF_HEADER_NAME = 'x-csrf-token';

let csrfToken: string | null = null;

export function setCsrfToken(token: string | null): void {
  csrfToken = token;
}

export const httpClient = axios.create({
  baseURL,
  // Session-cookie based auth: always send the session cookie.
  withCredentials: true,
});

httpClient.interceptors.request.use((config) => {
  const method = (config.method ?? 'get').toLowerCase();
  if (['post', 'put', 'delete', 'patch'].includes(method) && csrfToken) {
    config.headers = config.headers ?? {};
    config.headers[CSRF_HEADER_NAME] = csrfToken;
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
