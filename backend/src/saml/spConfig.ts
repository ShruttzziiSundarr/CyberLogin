import fs from 'fs';
import path from 'path';
import { SAML, SamlConfig } from '@node-saml/node-saml';
import { env } from '../config/env';
import { getSamlSettings } from './samlSettings';

function readCert(filePath: string): string {
  const resolved = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  return fs.readFileSync(resolved, 'utf8');
}

// Inline PEM env vars win (used where certs/ isn't shipped, e.g. Render); otherwise
// fall back to the on-disk dev keypair generated into backend/certs/. The SP's own
// signing keypair isn't editable via the settings API - only the IdP side is.
export const spPrivateKey = env.SP_PRIVATE_KEY || readCert(env.SP_PRIVATE_KEY_PATH);
export const spCertificate = env.SP_CERTIFICATE || readCert(env.SP_CERTIFICATE_PATH);

export const samlEndpoints = {
  metadata: `${env.SP_BASE_URL}/api/saml/metadata`,
  acs: `${env.SP_BASE_URL}/api/saml/acs`,
  login: `${env.SP_BASE_URL}/api/saml/login`,
  sloRequest: `${env.SP_BASE_URL}/api/saml/slo`
};

export function isIdpConfigured(): boolean {
  const settings = getSamlSettings();
  return Boolean(settings.idpSsoUrl && settings.idpCert);
}

// Built fresh per call from the current (possibly just-edited) settings, rather
// than once at module load, so changes made via the SSO settings page take
// effect on the very next request without a restart.
export function getSamlClient(): SAML {
  const settings = getSamlSettings();

  // PingFederate is the IdP this SP trusts. These values come from PingFederate's
  // own SP Connections wizard (Applications > Integration > SP Connections) once
  // this app's SP metadata (see GET /api/saml/metadata) has been imported there -
  // or can be edited directly on the SSO settings page for testing.
  const samlConfig: SamlConfig = {
    callbackUrl: samlEndpoints.acs,
    entryPoint: settings.idpSsoUrl || undefined,
    logoutUrl: settings.idpSloUrl || undefined,
    issuer: settings.spEntityId,
    idpCert: settings.idpCert || 'MISSING_IDP_CERT',
    privateKey: spPrivateKey,
    decryptionPvk: spPrivateKey,
    signatureAlgorithm: 'sha256',
    wantAssertionsSigned: true,
    wantAuthnResponseSigned: true,
    identifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
    disableRequestedAuthnContext: true
  };

  return new SAML(samlConfig);
}
