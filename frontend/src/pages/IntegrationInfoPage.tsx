import { useEffect, useRef, useState } from 'react';
import { useIntegrationInfo } from '../hooks/useIntegrationInfo';
import { useSamlIdpSettings, useUpdateSamlIdpSettings } from '../hooks/useSamlIdpSettings';
import { CopyField } from '../components/CopyField';
import { ErrorBanner } from '../components/ErrorBanner';
import { normalizeApiError } from '../lib/httpClient';
import { getSpMetadataXml, parseIdpMetadataXml } from '../lib/api';
import type { SamlIdpSettings } from '../types/api';

type Tab = 'saml' | 'oauth';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api';

const emptySettings: SamlIdpSettings = {
  spEntityId: '',
  idpEntityId: '',
  idpSsoUrl: '',
  idpSloUrl: '',
  idpCert: '',
  requiredAttributes: []
};

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

function DownloadSpMetadataButton() {
  const [state, setState] = useState<'idle' | 'downloading' | 'error'>('idle');

  async function handleDownload() {
    setState('downloading');
    try {
      const xml = await getSpMetadataXml();
      const blob = new Blob([xml], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'sp-metadata.xml';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setState('idle');
    } catch {
      setState('error');
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={handleDownload}
        disabled={state === 'downloading'}
        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
      >
        {state === 'downloading' ? 'Downloading...' : 'Download SP metadata (.xml)'}
      </button>
      {state === 'error' && <span className="text-xs text-red-600">Download failed - try again.</span>}
    </div>
  );
}

function IdpSettingsForm() {
  const { data, isLoading, isError, error } = useSamlIdpSettings();
  const updateMutation = useUpdateSamlIdpSettings();
  const [form, setForm] = useState<SamlIdpSettings>(emptySettings);
  const [requiredAttributesText, setRequiredAttributesText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [metadataParse, setMetadataParse] = useState<{ status: 'idle' | 'parsing' | 'error'; message: string | null }>({
    status: 'idle',
    message: null,
  });

  useEffect(() => {
    if (data?.settings) {
      setForm(data.settings);
      setRequiredAttributesText(data.settings.requiredAttributes.join('\n'));
    }
  }, [data?.settings]);

  if (isLoading) {
    return <p className="text-sm text-slate-500">Loading IdP settings...</p>;
  }

  if (isError) {
    return <ErrorBanner {...normalizeApiError(error)} />;
  }

  async function handleMetadataUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const xml = await file.text();
    e.target.value = '';
    setMetadataParse({ status: 'parsing', message: null });
    try {
      const parsed = await parseIdpMetadataXml(xml);
      setForm((f) => ({
        ...f,
        idpEntityId: parsed.entityId ?? f.idpEntityId,
        idpSsoUrl: parsed.ssoUrl ?? f.idpSsoUrl,
        idpSloUrl: parsed.sloUrl ?? f.idpSloUrl,
        idpCert: parsed.cert ?? f.idpCert,
      }));
      const filled = Object.values(parsed).filter(Boolean).length;
      setMetadataParse({
        status: 'idle',
        message: `Prefilled ${filled} field(s) from ${file.name}. Review before saving.`,
      });
    } catch (err) {
      setMetadataParse({ status: 'error', message: normalizeApiError(err).message });
    }
  }

  function field<K extends keyof SamlIdpSettings>(key: K) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm((f) => ({ ...f, [key]: e.target.value })),
    };
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const requiredAttributes = requiredAttributesText
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean);
        updateMutation.mutate({ ...form, requiredAttributes });
      }}
      className="space-y-4"
    >
      {updateMutation.isError && <ErrorBanner {...normalizeApiError(updateMutation.error)} />}
      {updateMutation.isSuccess && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Saved. Takes effect immediately for testing (resets to env var defaults if the service restarts).
        </p>
      )}

      <div className="rounded-md border border-dashed border-slate-300 p-3">
        <label className="block text-sm font-medium text-slate-700">
          Upload IdP metadata (.xml) <span className="text-slate-400">(optional)</span>
        </label>
        <p className="mt-1 text-xs text-slate-500">
          Upload your IdP's (e.g. PingFederate's) metadata XML to auto-fill the fields below. Nothing is
          saved until you click "Save IdP settings".
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xml,text/xml"
          onChange={handleMetadataUpload}
          disabled={metadataParse.status === 'parsing'}
          className="mt-2 text-sm"
        />
        {metadataParse.status === 'parsing' && <p className="mt-2 text-xs text-slate-500">Parsing...</p>}
        {metadataParse.status === 'error' && (
          <p className="mt-2 text-xs text-red-600">Could not parse metadata: {metadataParse.message}</p>
        )}
        {metadataParse.status === 'idle' && metadataParse.message && (
          <p className="mt-2 text-xs text-emerald-700">{metadataParse.message}</p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
          SP Entity ID
        </label>
        <input
          {...field('spEntityId')}
          required
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm font-mono"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
            IdP Entity ID
          </label>
          <input {...field('idpEntityId')} className="w-full rounded border border-slate-300 px-3 py-2 text-sm font-mono" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
            IdP SSO URL
          </label>
          <input {...field('idpSsoUrl')} className="w-full rounded border border-slate-300 px-3 py-2 text-sm font-mono" />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
          IdP SLO URL
        </label>
        <input {...field('idpSloUrl')} className="w-full rounded border border-slate-300 px-3 py-2 text-sm font-mono" />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
          IdP signing certificate (PEM)
        </label>
        <textarea
          {...field('idpCert')}
          rows={8}
          placeholder="-----BEGIN CERTIFICATE-----..."
          className="w-full rounded border border-slate-300 px-3 py-2 font-mono text-xs"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
          Required SAML attributes (one per line)
        </label>
        <textarea
          value={requiredAttributesText}
          onChange={(e) => setRequiredAttributesText(e.target.value)}
          rows={3}
          placeholder="email&#10;department"
          className="w-full rounded border border-slate-300 px-3 py-2 font-mono text-xs"
        />
        <p className="mt-1 text-xs text-slate-500">
          Exact, case-sensitive attribute names. Login is rejected if the assertion is missing any
          of these. Leave empty to only require NameID.
        </p>
      </div>

      <button
        type="submit"
        disabled={updateMutation.isPending}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {updateMutation.isPending ? 'Saving...' : 'Save IdP settings'}
      </button>
    </form>
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
        <h1 className="text-lg font-semibold text-slate-900">SSO testing</h1>
        <p className="mt-1 text-sm text-slate-500">
          Edit the IdP this app trusts, kick off SSO/SLO to try different test cases, and grab the
          SP metadata to hand to an IdP when registering this app as a relying party.
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
          <SectionCard title="Run a test login">
            <StatusPill
              ok={data.saml.idp.configured}
              label={data.saml.idp.configured ? 'IdP configured — ready to test' : 'IdP not configured yet'}
            />
            {!data.saml.idp.configured && (
              <p className="text-xs text-slate-500">
                Fill in the IdP SSO URL and certificate below first, then these links will work.
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <a
                href={`${apiBaseUrl}/saml/login`}
                aria-disabled={!data.saml.idp.configured}
                className={`rounded-md border px-4 py-2 text-sm font-semibold ${
                  data.saml.idp.configured
                    ? 'border-slate-900 bg-slate-900 text-white hover:bg-slate-800'
                    : 'pointer-events-none border-slate-200 bg-slate-100 text-slate-400'
                }`}
              >
                Start SSO login
              </a>
              <a
                href={`${apiBaseUrl}/saml/slo`}
                aria-disabled={!data.saml.idp.configured}
                className={`rounded-md border px-4 py-2 text-sm font-semibold ${
                  data.saml.idp.configured
                    ? 'border-slate-300 text-slate-700 hover:bg-slate-50'
                    : 'pointer-events-none border-slate-200 text-slate-400'
                }`}
              >
                Trigger SLO
              </a>
            </div>
          </SectionCard>

          <SectionCard title="Identity Provider settings (editable)">
            <IdpSettingsForm />
          </SectionCard>

          <SectionCard title="Service Provider (this app) — for the IdP's relying-party setup">
            <CopyField label="SP Entity ID" value={data.saml.spEntityId} />
            <CopyField label="SP SSO Login URL (SP-initiated)" value={data.saml.loginUrl} />
            <div className="grid gap-3 sm:grid-cols-2">
              <CopyField label="Assertion Consumer Service (ACS) URL" value={data.saml.acsUrl} />
              <CopyField label="ACS Binding" value={data.saml.acsBinding} mono={false} />
            </div>
            <CopyField label="Single Logout (SLO) URL" value={data.saml.sloUrl} />
            <CopyField label="SP Metadata URL" value={data.saml.spMetadataUrl} />
            <DownloadSpMetadataButton />
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
          </SectionCard>
        </div>
      )}
    </div>
  );
}
