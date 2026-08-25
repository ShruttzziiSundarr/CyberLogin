import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useLogout } from '../hooks/useAuth';

const navItemClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-2 text-sm font-medium ${
    isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
  }`;

export function DashboardLayout() {
  const navigate = useNavigate();
  const logoutMutation = useLogout();

  async function handleLogout() {
    await logoutMutation.mutateAsync();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <span className="text-sm font-semibold text-slate-900">
              sso-lab
            </span>
            <nav className="flex items-center gap-1">
              <NavLink to="/" end className={navItemClass}>
                Dashboard
              </NavLink>
              <NavLink to="/apps" className={navItemClass}>
                Apps
              </NavLink>
              <NavLink to="/integration-info" className={navItemClass}>
                SSO testing
              </NavLink>
            </nav>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Log out
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
