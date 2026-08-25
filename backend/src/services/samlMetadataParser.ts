import { XMLParser } from 'fast-xml-parser';
import { ApiErrors } from '../utils/errors';

export interface ParsedSamlMetadata {
  entityId?: string;
  acsUrl?: string;
  acsBinding?: 'POST' | 'Redirect';
  signingCert?: string;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: true
});

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function bindingFromUrn(urn?: string): 'POST' | 'Redirect' | undefined {
  if (!urn) return undefined;
  if (urn.includes('HTTP-POST')) return 'POST';
  if (urn.includes('HTTP-Redirect')) return 'Redirect';
  return undefined;
}

/**
 * Parses a pasted/uploaded SAML SP metadata XML document and extracts the fields
 * used to prefill the onboarding form: entityID, ACS Location/Binding, and the
 * SP's signing certificate.
 */
export function parseSpMetadataXml(xml: string): ParsedSamlMetadata {
  let doc: unknown;
  try {
    doc = parser.parse(xml);
  } catch {
    throw ApiErrors.badRequest('Uploaded metadata is not valid XML');
  }

  const root = (doc as Record<string, unknown>)?.EntityDescriptor as Record<string, unknown> | undefined;
  if (!root) {
    throw ApiErrors.badRequest('Metadata is missing an EntityDescriptor root element');
  }

  const entityId = root['@_entityID'] as string | undefined;

  const spSsoDescriptor = root.SPSSODescriptor as Record<string, unknown> | undefined;

  let acsUrl: string | undefined;
  let acsBinding: 'POST' | 'Redirect' | undefined;
  if (spSsoDescriptor) {
    const acsList = asArray<Record<string, unknown>>(
      spSsoDescriptor.AssertionConsumerService as Record<string, unknown> | Record<string, unknown>[] | undefined
    );
    // Prefer the entry marked isDefault, otherwise take the first.
    const preferred = acsList.find((a) => a['@_isDefault'] === true || a['@_isDefault'] === 'true') ?? acsList[0];
    if (preferred) {
      acsUrl = preferred['@_Location'] as string | undefined;
      acsBinding = bindingFromUrn(preferred['@_Binding'] as string | undefined);
    }
  }

  let signingCert: string | undefined;
  if (spSsoDescriptor) {
    const keyDescriptors = asArray<Record<string, unknown>>(
      spSsoDescriptor.KeyDescriptor as Record<string, unknown> | Record<string, unknown>[] | undefined
    );
    const signingKey = keyDescriptors.find((k) => !k['@_use'] || k['@_use'] === 'signing') ?? keyDescriptors[0];
    const keyInfo = signingKey?.KeyInfo as Record<string, unknown> | undefined;
    const x509Data = keyInfo?.X509Data as Record<string, unknown> | undefined;
    const cert = x509Data?.X509Certificate;
    if (typeof cert === 'string') {
      signingCert = cert.replace(/\s+/g, '');
    }
  }

  return { entityId, acsUrl, acsBinding, signingCert };
}

export interface ParsedIdpMetadata {
  entityId?: string;
  ssoUrl?: string;
  sloUrl?: string;
  cert?: string;
}

function preferRedirectBinding<T extends Record<string, unknown>>(entries: T[]): T | undefined {
  return entries.find((e) => bindingFromUrn(e['@_Binding'] as string | undefined) === 'Redirect') ?? entries[0];
}

/**
 * Parses a pasted/uploaded IdP metadata XML document (e.g. PingFederate's own
 * metadata) and extracts the fields used to prefill the SSO settings form:
 * entityID, SSO/SLO endpoint Location (preferring HTTP-Redirect, which is what
 * this SP sends AuthnRequests/LogoutRequests with), and the IdP's signing cert.
 */
export function parseIdpMetadataXml(xml: string): ParsedIdpMetadata {
  let doc: unknown;
  try {
    doc = parser.parse(xml);
  } catch {
    throw ApiErrors.badRequest('Uploaded metadata is not valid XML');
  }

  const root = (doc as Record<string, unknown>)?.EntityDescriptor as Record<string, unknown> | undefined;
  if (!root) {
    throw ApiErrors.badRequest('Metadata is missing an EntityDescriptor root element');
  }

  const entityId = root['@_entityID'] as string | undefined;

  const idpSsoDescriptor = root.IDPSSODescriptor as Record<string, unknown> | undefined;
  if (!idpSsoDescriptor) {
    throw ApiErrors.badRequest(
      'Metadata does not contain an IDPSSODescriptor - this looks like SP metadata, not IdP metadata'
    );
  }

  const ssoList = asArray<Record<string, unknown>>(
    idpSsoDescriptor.SingleSignOnService as Record<string, unknown> | Record<string, unknown>[] | undefined
  );
  const ssoUrl = preferRedirectBinding(ssoList)?.['@_Location'] as string | undefined;

  const sloList = asArray<Record<string, unknown>>(
    idpSsoDescriptor.SingleLogoutService as Record<string, unknown> | Record<string, unknown>[] | undefined
  );
  const sloUrl = preferRedirectBinding(sloList)?.['@_Location'] as string | undefined;

  const keyDescriptors = asArray<Record<string, unknown>>(
    idpSsoDescriptor.KeyDescriptor as Record<string, unknown> | Record<string, unknown>[] | undefined
  );
  const signingKey = keyDescriptors.find((k) => !k['@_use'] || k['@_use'] === 'signing') ?? keyDescriptors[0];
  const keyInfo = signingKey?.KeyInfo as Record<string, unknown> | undefined;
  const x509Data = keyInfo?.X509Data as Record<string, unknown> | undefined;
  const certRaw = x509Data?.X509Certificate;
  const cert = typeof certRaw === 'string' ? certRaw.replace(/\s+/g, '') : undefined;

  return { entityId, ssoUrl, sloUrl, cert };
}
