import { usePlatformStatus } from '../hooks/usePlatformStatus';
import { ErrorBanner } from './ErrorBanner';
import { normalizeApiError } from '../lib/httpClient';

// Keys shown here, in order - matches what GET /api/platform/status actually
// returns (backend/src/routes/platform.ts). mfaPolicyWriteEnabled and
// oauthOnboardingEnabled are feature flags, not platform health checks, so
// they're intentionally excluded from this grid.
const LABELS: Record<string, string> = {
  dataStoreConfigured: 'PingDirectory data store',
  passwordCredentialValidatorConfigured: 'Password credential validator',
  pingOneConnectionConfigured: 'PingOne connection (MFA)',
  signingKeysAvailable: 'Signing keys',
};

export function PlatformStatusPanel() {
  const { data, isLoading, isError, error } = usePlatformStatus();

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-slate-800">Platform status</h2>
      {isLoading && <p className="text-sm text-slate-500">Loading platform status...</p>}
      {isError && <ErrorBanner {...normalizeApiError(error)} />}
      {data && (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(LABELS).map(([key, label]) => {
            const ok = Boolean(data[key]);
            return (
              <li
                key={key}
                className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm"
              >
                <span
                  className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${
                    ok ? 'bg-emerald-500' : 'bg-red-500'
                  }`}
                  aria-hidden
                />
                <span className="text-slate-700">{label}</span>
                <span
                  className={`ml-auto text-xs font-semibold ${
                    ok ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  {ok ? 'PASS' : 'FAIL'}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
