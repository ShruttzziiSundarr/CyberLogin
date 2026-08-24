import fs from 'fs';
import path from 'path';
import { SAML, SamlConfig } from '@node-saml/node-saml';
import { env } from '../config/env';

function readCert(filePath: string): string {
  const resolved = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  return fs.readFileSync(resolved, 'utf8');
}

// Inline PEM env vars win (used where certs/ isn't shipped, e.g. Render); otherwise
// fall back to the on-disk dev keypair generated into backend/certs/.
export const spPrivateKey = env.SP_PRIVATE_KEY || readCert(env.SP_PRIVATE_KEY_PATH);
export const spCertificate = env.SP_CERTIFICATE || readCert(env.SP_CERTIFICATE_PATH);

export const samlEndpoints = {
  metadata: `${env.SP_BASE_URL}/api/saml/metadata`,
  acs: `${env.SP_BASE_URL}/api/saml/acs`,
  login: `${env.SP_BASE_URL}/api/saml/login`,
  sloRequest: `${env.SP_BASE_URL}/api/saml/slo`
};

// PingFederate is the IdP this SP trusts. These values come from PingFederate's
// own SP Connections wizard (Applications > Integration > SP Connections) once
// this app's SP metadata (see GET /api/saml/metadata) has been imported there.
const samlConfig: SamlConfig = {
  callbackUrl: samlEndpoints.acs,
  entryPoint: env.PF_IDP_SSO_URL || undefined,
  logoutUrl: env.PF_IDP_SLO_URL || undefined,
  issuer: env.SP_ENTITY_ID,
  idpCert: env.PF_IDP_CERT || 'MISSING_IDP_CERT',
  privateKey: spPrivateKey,
  decryptionPvk: spPrivateKey,
  signatureAlgorithm: 'sha256',
  wantAssertionsSigned: true,
  wantAuthnResponseSigned: true,
  identifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
  disableRequestedAuthnContext: true
};

export function isIdpConfigured(): boolean {
  return Boolean(env.PF_IDP_SSO_URL && env.PF_IDP_CERT);
}

export const sp = new SAML(samlConfig);
