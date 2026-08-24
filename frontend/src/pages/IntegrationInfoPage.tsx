import { useState } from 'react';
import { useIntegrationInfo } from '../hooks/useIntegrationInfo';
import { CopyField } from '../components/CopyField';
import { ErrorBanner } from '../components/ErrorBanner';
import { normalizeApiError } from '../lib/httpClient';

type Tab = 'saml' | 'oauth';

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold text-slate-900">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        ok ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-emerald-600' : 'bg-amber-600'}`} />
      {label}
    </span>
  );
}

export function IntegrationInfoPage() {
  const { data, isLoading, isError, error } = useIntegrationInfo();
  const [tab, setTab] = useState<Tab>('saml');

  if (isLoading) {
    return <p className="text-sm text-slate-500">Loading integration info...</p>;
  }

  if (isError || !data) {
    return <ErrorBanner {...normalizeApiError(error)} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Integration info</h1>
        <p className="mt-1 text-sm text-slate-500">
          Everything a PingFederate administrator needs to trust this app as a SAML 2.0 Service
          Provider, plus the OAuth 2.0 / OIDC authorization-server endpoints PingFederate exposes
          for onboarded client apps.
        </p>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setTab('saml')}
          className={`px-4 py-2 text-sm font-medium ${
            tab === 'saml' ? 'border-b-2 border-slate-900 text-slate-900' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          SAML 2.0 (this app as SP)
        </button>
        <button
          type="button"
          onClick={() => setTab('oauth')}
          className={`px-4 py-2 text-sm font-medium ${
            tab === 'oauth' ? 'border-b-2 border-slate-900 text-slate-900' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          OAuth 2.0 / OIDC
        </button>
      </div>

      {tab === 'saml' && (
        <div className="space-y-6">
          <SectionCard title="Service Provider (this app)">
            <CopyField label="SP Entity ID" value={data.saml.spEntityId} />
            <div className="grid gap-3 sm:grid-cols-2">
              <CopyField label="Assertion Consumer Service (ACS) URL" value={data.saml.acsUrl} />
              <CopyField label="ACS Binding" value={data.saml.acsBinding} mono={false} />
            </div>
            <CopyField label="Single Logout (SLO) URL" value={data.saml.sloUrl} />
            <CopyField label="SP Metadata URL" value={data.saml.spMetadataUrl} />
            <div>
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                Supported NameID formats
              </span>
              <ul className="space-y-1">
                {data.saml.nameIdFormatsSupported.map((f) => (
                  <li key={f} className="rounded border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-xs text-slate-700">
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <details>
              <summary className="cursor-pointer text-xs font-medium uppercase tracking-wide text-slate-500">
                SP signing certificate (PEM)
              </summary>
              <textarea
                readOnly
                value={data.saml.spCertificatePem}
                rows={10}
                className="mt-2 w-full rounded border border-slate-300 bg-slate-50 p-2 font-mono text-xs"
                onFocus={(e) => e.currentTarget.select()}
              />
            </details>
          </SectionCard>

          <SectionCard title="Identity Provider (PingFederate)">
            <StatusPill
              ok={data.saml.idp.configured}
              label={data.saml.idp.configured ? 'IdP connection configured' : 'IdP not yet configured'}
            />
            {!data.saml.idp.configured && (
              <p className="text-xs text-slate-500">
                Import the SP metadata above into PingFederate (Applications &gt; Integration &gt; SP
                Connections &gt; Create Connection), then set PF_IDP_ENTITY_ID / PF_IDP_SSO_URL /
                PF_IDP_SLO_URL / PF_IDP_CERT in this app's environment.
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <CopyField label="IdP Entity ID" value={data.saml.idp.entityId ?? 'not set'} />
              <CopyField label="IdP SSO URL" value={data.saml.idp.ssoUrl ?? 'not set'} />
            </div>
            <CopyField label="IdP SLO URL" value={data.saml.idp.sloUrl ?? 'not set'} />
          </SectionCard>

          <SectionCard title="Expected PingFederate runtime endpoints (reference)">
            <p className="text-xs text-slate-500">
              Computed from PF_RUNTIME_BASE_URL + this SP's entity ID. These are where
              PingFederate's own IdP-side SAML endpoints for this SP connection are expected to
              live once configured.
            </p>
            <CopyField label="SSO endpoint" value={data.saml.pfRuntimeEndpoints.sso} />
            <CopyField label="SLO endpoint" value={data.saml.pfRuntimeEndpoints.slo} />
            <CopyField label="IdP metadata (for this SP)" value={data.saml.pfRuntimeEndpoints.metadata} />
          </SectionCard>
        </div>
      )}

      {tab === 'oauth' && (
        <div className="space-y-6">
          <SectionCard title="PingFederate OAuth 2.0 / OIDC authorization server">
            <CopyField label="Discovery (OIDC well-known)" value={data.oauth.runtimeEndpoints.discovery} />
            <div className="grid gap-3 sm:grid-cols-2">
              <CopyField label="Authorization endpoint" value={data.oauth.runtimeEndpoints.authorization} />
              <CopyField label="Token endpoint" value={data.oauth.runtimeEndpoints.token} />
              <CopyField label="Userinfo endpoint" value={data.oauth.runtimeEndpoints.userinfo} />
              <CopyField label="JWKS URI" value={data.oauth.runtimeEndpoints.jwks} />
              <CopyField label="Introspection endpoint" value={data.oauth.runtimeEndpoints.introspection} />
              <CopyField label="Revocation endpoint" value={data.oauth.runtimeEndpoints.revocation} />
            </div>
          </SectionCard>

          <SectionCard title="Supported grant types">
            <div className="flex flex-wrap gap-2">
              {data.oauth.grantTypesSupported.map((g) => (
                <span key={g} className="rounded-full bg-slate-100 px-3 py-1 font-mono text-xs text-slate-700">
                  {g}
                </span>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Supported token endpoint auth methods">
            <div className="flex flex-wrap gap-2">
              {data.oauth.tokenEndpointAuthMethodsSupported.map((m) => (
                <span key={m} className="rounded-full bg-slate-100 px-3 py-1 font-mono text-xs text-slate-700">
                  {m}
                </span>
              ))}
            </div>
            <p className="text-xs text-slate-500">
              Per-client client ID, secret, redirect URIs, and scopes are issued when you onboard
              an OAuth app — see the onboarding wizard.
            </p>
          </SectionCard>
        </div>
      )}
    </div>
  );
}
