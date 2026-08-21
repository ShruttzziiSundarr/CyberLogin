import { Link } from 'react-router-dom';
import { PlatformStatusPanel } from '../components/PlatformStatusPanel';
import { useApps } from '../hooks/useApps';

export function DashboardPage() {
  const { data: apps } = useApps();

  return (
    <div className="space-y-6">
      <PlatformStatusPanel />

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">Quick actions</h2>
        </div>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link
            to="/onboard"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Onboard new app
          </Link>
          <Link
            to="/apps"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            View apps ({apps?.length ?? 0})
          </Link>
        </div>
      </section>
    </div>
  );
}
