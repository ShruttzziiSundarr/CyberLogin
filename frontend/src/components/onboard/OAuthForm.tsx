import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { oauthOnboardSchema, type OAuthOnboardFormValues } from '../../lib/schemas';
import { useOAuthAtms, useOidcPolicies } from '../../hooks/useCatalog';
import { useOnboardOAuth } from '../../hooks/useOnboard';
import { ErrorBanner } from '../ErrorBanner';
import { normalizeApiError } from '../../lib/httpClient';
import type { GrantType, OAuthOnboardResponse, TokenEndpointAuthMethod } from '../../types/api';

const GRANT_TYPES: GrantType[] = [
  'authorization_code',
  'client_credentials',
  'refresh_token',
  'implicit',
  'device_code',
];

const AUTH_METHODS: TokenEndpointAuthMethod[] = [
  'client_secret_basic',
  'client_secret_post',
  'private_key_jwt',
  'none',
];

const DEFAULT_SCOPES = ['openid', 'profile', 'email'];

interface OAuthFormProps {
  onSuccess: (result: OAuthOnboardResponse) => void;
}

export function OAuthForm({ onSuccess }: OAuthFormProps) {
  const { data: atms, isLoading: atmsLoading } = useOAuthAtms();
  const { data: oidcPolicies, isLoading: policiesLoading } = useOidcPolicies();
  const onboardMutation = useOnboardOAuth();
  const [customScope, setCustomScope] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<OAuthOnboardFormValues>({
    resolver: zodResolver(oauthOnboardSchema),
    defaultValues: {
      name: '',
      clientId: '',
      grantTypes: [],
      redirectUris: [],
      scopes: [],
      oidcEnabled: false,
      tokenEndpointAuthMethod: 'client_secret_basic',
      accessTokenManagerRef: '',
      oidcPolicyRef: '',
      requireMfa: false,
    },
  });

  const grantTypes = watch('grantTypes');
  const scopes = watch('scopes');
  const oidcEnabled = watch('oidcEnabled');
  const redirectUris = watch('redirectUris');

  function appendRedirect() {
    setValue('redirectUris', [...redirectUris, ''], { shouldValidate: true });
  }

  function removeRedirect(index: number) {
    setValue(
      'redirectUris',
      redirectUris.filter((_, i) => i !== index),
      { shouldValidate: true },
    );
  }

  function updateRedirect(index: number, value: string) {
    const next = [...redirectUris];
    next[index] = value;
    setValue('redirectUris', next, { shouldValidate: true });
  }

  function toggleGrantType(gt: GrantType) {
    const current = getValues('grantTypes');
    if (current.includes(gt)) {
      setValue('grantTypes', current.filter((g) => g !== gt), { shouldValidate: true });
    } else {
      setValue('grantTypes', [...current, gt], { shouldValidate: true });
    }
  }

  function toggleScope(scope: string) {
    const current = getValues('scopes');
    if (current.includes(scope)) {
      setValue('scopes', current.filter((s) => s !== scope), { shouldValidate: true });
    } else {
      setValue('scopes', [...current, scope], { shouldValidate: true });
    }
  }

  function addCustomScope() {
    const trimmed = customScope.trim();
    if (trimmed && !scopes.includes(trimmed)) {
      setValue('scopes', [...scopes, trimmed], { shouldValidate: true });
      setCustomScope('');
    }
  }

  const onSubmit = handleSubmit((values) => {
    onboardMutation.mutate(
      {
        ...values,
        clientId: values.clientId || undefined,
        oidcPolicyRef: values.oidcEnabled ? values.oidcPolicyRef : undefined,
      },
      { onSuccess },
    );
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {onboardMutation.isError && (
        <ErrorBanner {...normalizeApiError(onboardMutation.error)} />
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700">Application name</label>
        <input
          {...register('name')}
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
          placeholder="e.g. Internal Reporting App"
        />
        {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          Client ID <span className="text-slate-400">(optional, auto-generated if blank)</span>
        </label>
        <input
          {...register('clientId')}
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-slate-700">Grant types</legend>
        <div className="mt-2 flex flex-wrap gap-3">
          {GRANT_TYPES.map((gt) => (
            <label key={gt} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={grantTypes.includes(gt)}
                onChange={() => toggleGrantType(gt)}
              />
              {gt}
            </label>
          ))}
        </div>
        {errors.grantTypes && (
          <p className="mt-1 text-xs text-red-600">{errors.grantTypes.message as string}</p>
        )}
      </fieldset>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          Redirect URIs {grantTypes.includes('authorization_code') && <span className="text-red-500">*</span>}
        </label>
        <div className="mt-2 space-y-2">
          {redirectUris.map((uri, index) => (
            <div key={index} className="flex gap-2">
              <input
                value={uri}
                onChange={(e) => updateRedirect(index, e.target.value)}
                className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm"
                placeholder="https://app.example.com/callback"
              />
              <button
                type="button"
                onClick={() => removeRedirect(index)}
                className="rounded border border-slate-300 px-3 text-sm text-slate-600 hover:bg-slate-100"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={appendRedirect}
            className="rounded border border-dashed border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            + Add redirect URI
          </button>
        </div>
        {errors.redirectUris && (
          <p className="mt-1 text-xs text-red-600">
            {(errors.redirectUris as any)?.message ?? 'Invalid redirect URI'}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Scopes</label>
        <div className="mt-2 flex flex-wrap gap-3">
          {DEFAULT_SCOPES.map((scope) => (
            <label key={scope} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={scopes.includes(scope)} onChange={() => toggleScope(scope)} />
              {scope}
            </label>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {scopes
            .filter((s) => !DEFAULT_SCOPES.includes(s))
            .map((s) => (
              <span
                key={s}
                className="flex items-center gap-1 rounded-full bg-slate-200 px-2.5 py-1 text-xs text-slate-700"
              >
                {s}
                <button type="button" onClick={() => toggleScope(s)} className="text-slate-500 hover:text-slate-800">
                  &times;
                </button>
              </span>
            ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            value={customScope}
            onChange={(e) => setCustomScope(e.target.value)}
            placeholder="Custom scope"
            className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={addCustomScope}
            className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
          >
            Add
          </button>
        </div>
        {errors.scopes && <p className="mt-1 text-xs text-red-600">{errors.scopes.message as string}</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">Token endpoint auth method</label>
          <select
            {...register('tokenEndpointAuthMethod')}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
          >
            {AUTH_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Access token manager</label>
          <select
            {...register('accessTokenManagerRef')}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
            disabled={atmsLoading}
          >
            <option value="">{atmsLoading ? 'Loading...' : 'Select...'}</option>
            {atms?.map((atm) => (
              <option key={atm.id} value={atm.id}>
                {atm.name}
              </option>
            ))}
          </select>
          {errors.accessTokenManagerRef && (
            <p className="mt-1 text-xs text-red-600">{errors.accessTokenManagerRef.message}</p>
          )}
        </div>
      </div>

      <div className="rounded-md border border-slate-200 p-3">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" {...register('oidcEnabled')} />
          Enable OIDC
        </label>
        {oidcEnabled && (
          <div className="mt-3">
            <label className="block text-sm font-medium text-slate-700">OIDC policy</label>
            <select
              {...register('oidcPolicyRef')}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
              disabled={policiesLoading}
            >
              <option value="">{policiesLoading ? 'Loading...' : 'Select...'}</option>
              {oidcPolicies?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {errors.oidcPolicyRef && (
              <p className="mt-1 text-xs text-red-600">{errors.oidcPolicyRef.message}</p>
            )}
          </div>
        )}
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" {...register('requireMfa')} />
          Require MFA
        </label>
        <p className="mt-1 text-xs text-slate-500">
          Requires a platform admin's PingOne connection to already exist. If the PingOne
          connection is not configured (see Platform status), enabling this will fail at
          submission time.
        </p>
      </div>

      <button
        type="submit"
        disabled={onboardMutation.isPending}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {onboardMutation.isPending ? 'Creating...' : 'Create OAuth client'}
      </button>
    </form>
  );
}
