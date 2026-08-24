import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { loginSchema, type LoginFormValues } from '../lib/schemas';
import { useLogin } from '../hooks/useAuth';
import { ErrorBanner } from '../components/ErrorBanner';
import { normalizeApiError } from '../lib/httpClient';

export function LoginPage() {
  const navigate = useNavigate();
  const loginMutation = useLogin();
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api';
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });

  const onSubmit = handleSubmit((values) => {
    loginMutation.mutate(values, {
      onSuccess: () => navigate('/', { replace: true }),
    });
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-lg font-semibold text-slate-900">sso-lab</h1>
        <p className="mb-6 text-sm text-slate-500">Sign in to manage app onboarding.</p>

        {loginMutation.isError && (
          <div className="mb-4">
            <ErrorBanner {...normalizeApiError(loginMutation.error)} />
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Username</label>
            <input
              {...register('username')}
              autoComplete="username"
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
            {errors.username && <p className="mt-1 text-xs text-red-600">{errors.username.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Password</label>
            <input
              type="password"
              {...register('password')}
              autoComplete="current-password"
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
          </div>
          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-xs text-slate-400">or</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <a
          href={`${apiBaseUrl}/saml/login`}
          className="block w-full rounded-md border border-slate-300 px-4 py-2 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Sign in with PingFederate
        </a>
      </div>
    </div>
  );
}
