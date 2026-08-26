import fs from 'fs';
import path from 'path';
import { SAML, SamlConfig, ValidateInResponseTo, CacheProvider } from '@node-saml/node-saml';
import { env } from '../config/env';
import { getSamlSettings } from './samlSettings';

function readCert(filePath: string): string {
  const resolved = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  return fs.readFileSync(resolved, 'utf8');
}

// SP_BASE_URL is an operator-supplied env var; a trailing slash there (e.g.
// "https://host.com/") would otherwise get concatenated straight into
// "https://host.com//api/saml/acs" below - a path Express never matches,
// since "//api" isn't the same route as "/api". Strip it so the same
// misconfiguration can't silently break routing again.
const spBaseUrl = env.SP_BASE_URL.replace(/\/+$/, '');

const REQUEST_ID_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours, matches node-saml's own default

// getSamlClient() below builds a fresh SAML instance per call (so edited IdP
// settings take effect immediately without a restart) - but validateInResponseTo
// needs the request ID saved during /login to still be there when /acs validates
// it later, which would break if each call got its own throwaway cache. This
// provider is a module-level singleton shared across every SAML instance instead.
class SharedRequestIdCache implements CacheProvider {
  private store = new Map<string, { value: string; createdAt: number }>();

  async saveAsync(key: string, value: string) {
    const item = { value, createdAt: Date.now() };
    this.store.set(key, item);
    return item;
  }

  async getAsync(key: string) {
    const item = this.store.get(key);
    if (!item) return null;
    if (Date.now() - item.createdAt > REQUEST_ID_TTL_MS) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async removeAsync(key: string | null) {
    if (!key) return null;
    const item = this.store.get(key);
    this.store.delete(key);
    return item?.value ?? null;
  }
}

const requestIdCache = new SharedRequestIdCache();

// Inline PEM env vars win (used where certs/ isn't shipped, e.g. Render); otherwise
// fall back to the on-disk dev keypair generated into backend/certs/. The SP's own
// signing keypair isn't editable via the settings API - only the IdP side is.
export const spPrivateKey = env.SP_PRIVATE_KEY || readCert(env.SP_PRIVATE_KEY_PATH);
export const spCertificate = env.SP_CERTIFICATE || readCert(env.SP_CERTIFICATE_PATH);

export const samlEndpoints = {
  metadata: `${spBaseUrl}/api/saml/metadata`,
  acs: `${spBaseUrl}/api/saml/acs`,
  login: `${spBaseUrl}/api/saml/login`,
  sloRequest: `${spBaseUrl}/api/saml/slo`
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
    identifierFormat: 'urn:oasis:names:tc:SAML:2.0:nameid-format:unspecified',
    disableRequestedAuthnContext: true,
    // 'ifPresent' (not 'always') so a genuinely IdP-initiated response - which has
    // no InResponseTo at all - still validates, while an SP-initiated response is
    // required to match a request this SP actually sent (via requestIdCache below).
    validateInResponseTo: ValidateInResponseTo.ifPresent,
    requestIdExpirationPeriodMs: REQUEST_ID_TTL_MS,
    cacheProvider: requestIdCache
  };

  return new SAML(samlConfig);
}
