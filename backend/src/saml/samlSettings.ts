import { env } from '../config/env';

export interface SamlIdpSettings {
  spEntityId: string;
  idpEntityId: string;
  idpSsoUrl: string;
  idpSloUrl: string;
  idpCert: string;
}

// In-memory only, seeded from env vars at startup: lets the SSO test page
// edit IdP/SP settings and take effect immediately without a redeploy.
// Resets back to the env var values whenever the process restarts.
let settings: SamlIdpSettings = {
  spEntityId: env.SP_ENTITY_ID,
  idpEntityId: env.PF_IDP_ENTITY_ID,
  idpSsoUrl: env.PF_IDP_SSO_URL,
  idpSloUrl: env.PF_IDP_SLO_URL,
  idpCert: env.PF_IDP_CERT
};

export function getSamlSettings(): SamlIdpSettings {
  return settings;
}

export function updateSamlSettings(update: Partial<SamlIdpSettings>): SamlIdpSettings {
  settings = { ...settings, ...update };
  return settings;
}
