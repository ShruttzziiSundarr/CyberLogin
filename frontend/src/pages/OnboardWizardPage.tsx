import { useState } from 'react';
import { ProtocolPicker, type Protocol } from '../components/onboard/ProtocolPicker';
import { OAuthForm } from '../components/onboard/OAuthForm';
import { SamlForm } from '../components/onboard/SamlForm';
import { SuccessScreen } from '../components/onboard/SuccessScreen';
import { usePlatformStatus } from '../hooks/usePlatformStatus';
import type { OAuthOnboardResponse, SamlOnboardResponse } from '../types/api';

type WizardResult =
  | { protocol: 'oauth'; data: OAuthOnboardResponse }
  | { protocol: 'saml'; data: SamlOnboardResponse };

export function OnboardWizardPage() {
  const { data: platformStatus } = usePlatformStatus();
  const oauthEnabled = Boolean(platformStatus?.oauthOnboardingEnabled);

  const [protocol, setProtocol] = useState<Protocol | null>(oauthEnabled ? null : 'saml');
  const [result, setResult] = useState<WizardResult | null>(null);

  if (result) {
    return (
      <div className="mx-auto max-w-2xl">
        <SuccessScreen result={result} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Onboard new app</h1>
        <p className="text-sm text-slate-500">
          {oauthEnabled ? 'Choose a protocol to get started.' : 'Register a SAML SP connection.'}
        </p>
      </div>

      {oauthEnabled && <ProtocolPicker value={protocol} onChange={setProtocol} />}

      {protocol === 'oauth' && oauthEnabled && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-800">OAuth / OIDC client details</h2>
          <OAuthForm onSuccess={(data) => setResult({ protocol: 'oauth', data })} />
        </div>
      )}

      {protocol === 'saml' && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-800">SAML connection details</h2>
          <SamlForm onSuccess={(data) => setResult({ protocol: 'saml', data })} />
        </div>
      )}
    </div>
  );
}
