import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAppDetail, useDeleteApp } from '../hooks/useApps';
import { ErrorBanner } from '../components/ErrorBanner';
import { CopyField } from '../components/CopyField';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { normalizeApiError } from '../lib/httpClient';
import type { AppType } from '../types/api';

export function AppDetailPage() {
  const { type, id } = useParams<{ type: AppType; id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useAppDetail(type as AppType, id ?? '');
  const deleteMutation = useDeleteApp();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleDelete() {
    if (!type || !id) return;
    deleteMutation.mutate(
      { type, id },
      {
        onSuccess: () => navigate('/apps', { replace: true }),
      },
    );
  }

  const name = data && (data.type === 'oauth' ? data.name : data.connectionName);
  const endpointEntries = data ? (Object.entries(data.endpoints) as [string, string][]) : [];

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link to="/apps" className="text-sm text-slate-500 hover:underline">
        &larr; Back to apps
      </Link>

      {isLoading && <p className="text-sm text-slate-500">Loading...</p>}
      {isError && <ErrorBanner {...normalizeApiError(error)} />}
      {deleteMutation.isError && <ErrorBanner {...normalizeApiError(deleteMutation.error)} />}

      {data && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-lg font-semibold text-slate-900">{name}</h1>
              <p className="text-xs uppercase text-slate-500">{data.type}</p>
            </div>
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="rounded border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
            >
              Offboard
            </button>
          </div>

          <div className="mt-4 space-y-3">
            <h2 className="text-sm font-semibold text-slate-800">Runtime endpoints</h2>
            {endpointEntries.map(([key, value]) => (
              <CopyField key={key} label={key} value={value} />
            ))}
          </div>

          {data.type === 'oauth' && (
            <div className="mt-4 space-y-1 text-sm text-slate-600">
              <p>
                <span className="font-medium text-slate-700">Client ID:</span> {data.clientId}
              </p>
              <p>
                <span className="font-medium text-slate-700">Grant types:</span> {data.grantTypes.join(', ')}
              </p>
              <p className="text-xs text-slate-400">
                The client secret is never shown again after creation.
              </p>
            </div>
          )}

          {data.type === 'saml' && (
            <div className="mt-4 space-y-1 text-sm text-slate-600">
              <p>
                <span className="font-medium text-slate-700">Partner entity ID:</span> {data.partnerEntityId}
              </p>
              <p>
                <span className="font-medium text-slate-700">ACS URL:</span> {data.acsUrl}
              </p>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Offboard app"
        message={`This will permanently remove "${name}" from PingFederate. This cannot be undone.`}
        confirmLabel="Offboard"
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
        pending={deleteMutation.isPending}
      />
    </div>
  );
}
