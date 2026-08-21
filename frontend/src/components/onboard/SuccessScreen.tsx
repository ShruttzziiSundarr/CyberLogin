import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CopyField } from '../CopyField';
import type { OAuthOnboardResponse, SamlOnboardResponse } from '../../types/api';

type SuccessResult =
  | { protocol: 'oauth'; data: OAuthOnboardResponse }
  | { protocol: 'saml'; data: SamlOnboardResponse };

interface SuccessScreenProps {
  result: SuccessResult;
}

function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function SuccessScreen({ result }: SuccessScreenProps) {
  const [acknowledged, setAcknowledged] = useState(false);

  const name = result.protocol === 'oauth' ? result.data.name : result.data.connectionName;
  const endpointEntries = Object.entries(result.data.endpoints) as [string, string][];

  function handleDownload() {
    const filename =
      result.protocol === 'oauth'
        ? `oauth-client-${result.data.clientId}.json`
        : `saml-connection-${result.data.id}.json`;
    // Never include the one-time secret in the exported bundle by default is
    // debatable; the wizard already warned it's shown once, so we include it
    // here since this is the admin's own downloaded record of what was created.
    downloadJson(filename, result.data);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        <span className="font-medium">{name}</span> was created successfully.
      </div>

      {result.protocol === 'oauth' && result.data.secret && (
        <div className="rounded-md border border-amber-400 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">
            This client secret is shown once. Save it now — it cannot be retrieved again.
          </p>
          <div className="mt-3">
            <CopyField label="Client secret" value={result.data.secret} sensitive />
          </div>
          <label className="mt-3 flex items-center gap-2 text-xs text-amber-800">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
            />
            I have copied and securely stored this secret.
          </label>
        </div>
      )}

      {result.protocol === 'oauth' && (
        <div className="space-y-3">
          <CopyField label="Client ID" value={result.data.clientId} />
        </div>
      )}

      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-800">Runtime endpoints</h3>
        <div className="space-y-3">
          {endpointEntries.map(([key, value]) => (
            <CopyField key={key} label={key} value={value} />
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleDownload}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Download config
        </button>
        <Link
          to="/apps"
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          View apps
        </Link>
        <Link
          to="/onboard"
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Onboard another app
        </Link>
      </div>
    </div>
  );
}
