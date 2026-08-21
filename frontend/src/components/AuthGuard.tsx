import { useQuery } from '@tanstack/react-query';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { getSession } from '../lib/api';
import { normalizeApiError } from '../lib/httpClient';

/**
 * Route guard: calls GET /api/auth/session to check whether the current
 * session cookie is valid, and to recover a fresh CSRF token after a page
 * reload (the token from login only lives in JS memory). Redirects to
 * /login on 401.
 */
export function AuthGuard() {
  const location = useLocation();
  const { isLoading, isError, error } = useQuery({
    queryKey: ['session-check'],
    queryFn: getSession,
    retry: false,
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-500">
        Checking session...
      </div>
    );
  }

  if (isError) {
    const normalized = normalizeApiError(error);
    if (normalized.status === 401 || normalized.status === undefined) {
      return <Navigate to="/login" replace state={{ from: location }} />;
    }
  }

  return <Outlet />;
}
