import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApps, useDeleteApp } from '../hooks/useApps';
import { ErrorBanner } from '../components/ErrorBanner';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { normalizeApiError } from '../lib/httpClient';
import type { AppSummary } from '../types/api';

export function AppsListPage() {
  const { data: apps, isLoading, isError, error } = useApps();
  const deleteMutation = useDeleteApp();
  const [pendingDelete, setPendingDelete] = useState<AppSummary | null>(null);

  function handleConfirmDelete() {
    if (!pendingDelete) return;
    deleteMutation.mutate(
      { type: pendingDelete.type, id: pendingDelete.id },
      { onSuccess: () => setPendingDelete(null) },
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Apps</h1>
        <Link
          to="/onboard"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Onboard new app
        </Link>
      </div>

      {isLoading && <p className="text-sm text-slate-500">Loading apps...</p>}
      {isError && <ErrorBanner {...normalizeApiError(error)} />}
      {deleteMutation.isError && <ErrorBanner {...normalizeApiError(deleteMutation.error)} />}

      {apps && apps.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          No apps onboarded yet.
        </p>
      )}

      {apps && apps.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-slate-500">Name</th>
                <th className="px-4 py-2 text-left font-medium text-slate-500">Type</th>
                <th className="px-4 py-2 text-left font-medium text-slate-500">Status</th>
                <th className="px-4 py-2 text-right font-medium text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {apps.map((app) => (
                <tr key={`${app.type}-${app.id}`}>
                  <td className="px-4 py-2">
                    <Link to={`/apps/${app.type}/${app.id}`} className="font-medium text-slate-900 hover:underline">
                      {app.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 uppercase text-slate-600">{app.type}</td>
                  <td className="px-4 py-2 text-slate-600">{app.status ?? '—'}</td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => setPendingDelete(app)}
                      className="rounded border border-red-300 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                    >
                      Offboard
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Offboard app"
        message={`This will permanently remove "${pendingDelete?.name}" from PingFederate. This cannot be undone.`}
        confirmLabel="Offboard"
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
        pending={deleteMutation.isPending}
      />
    </div>
  );
}
