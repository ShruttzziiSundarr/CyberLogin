export type Protocol = 'oauth' | 'saml';

interface ProtocolPickerProps {
  value: Protocol | null;
  onChange: (protocol: Protocol) => void;
}

export function ProtocolPicker({ value, onChange }: ProtocolPickerProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <button
        type="button"
        onClick={() => onChange('oauth')}
        className={`rounded-lg border p-4 text-left transition ${
          value === 'oauth' ? 'border-slate-900 ring-1 ring-slate-900' : 'border-slate-200 hover:border-slate-400'
        }`}
      >
        <h3 className="font-semibold text-slate-900">OAuth / OIDC</h3>
        <p className="mt-1 text-sm text-slate-500">
          Register an OAuth 2.0 client, optionally with OpenID Connect enabled.
        </p>
      </button>
      <button
        type="button"
        onClick={() => onChange('saml')}
        className={`rounded-lg border p-4 text-left transition ${
          value === 'saml' ? 'border-slate-900 ring-1 ring-slate-900' : 'border-slate-200 hover:border-slate-400'
        }`}
      >
        <h3 className="font-semibold text-slate-900">SAML</h3>
        <p className="mt-1 text-sm text-slate-500">
          Register a SAML SP connection, with optional metadata-driven prefill.
        </p>
      </button>
    </div>
  );
}
