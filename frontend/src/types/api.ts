// Shared type definitions mirroring the backend internal REST API contract.

export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
  };
}

export interface PlatformStatus {
  pingDirectoryDataStore: boolean;
  passwordCredentialValidator: boolean;
  pingOneConnection: boolean;
  signingKeys: boolean;
  oauthOnboardingEnabled: boolean;
  [key: string]: boolean;
}

export interface SamlIdpSettings {
  spEntityId: string;
  idpEntityId: string;
  idpSsoUrl: string;
  idpSloUrl: string;
  idpCert: string;
  requiredAttributes: string[];
}

export interface SamlIdpSettingsResponse {
  settings: SamlIdpSettings;
  idpConfigured: boolean;
}

export interface CatalogItem {
  id: string;
  name: string;
}

export type GrantType =
  | 'authorization_code'
  | 'client_credentials'
  | 'refresh_token'
  | 'implicit'
  | 'device_code';

export type TokenEndpointAuthMethod =
  | 'client_secret_basic'
  | 'client_secret_post'
  | 'private_key_jwt'
  | 'none';

export interface OAuthOnboardRequest {
  name: string;
  clientId?: string;
  grantTypes: GrantType[];
  redirectUris: string[];
  scopes: string[];
  oidcEnabled: boolean;
  tokenEndpointAuthMethod: TokenEndpointAuthMethod;
  accessTokenManagerRef: string;
  oidcPolicyRef?: string;
  requireMfa: boolean;
}

export interface OAuthRuntimeEndpoints {
  discovery: string;
  authorization: string;
  token: string;
  userinfo: string;
  jwks: string;
  introspection: string;
  revocation: string;
}

export interface OAuthOnboardResponse {
  id: string;
  name: string;
  clientId: string;
  secret?: string;
  grantTypes: GrantType[];
  redirectUris: string[];
  scopes: string[];
  oidcEnabled: boolean;
  tokenEndpointAuthMethod: TokenEndpointAuthMethod;
  accessTokenManagerRef: string;
  oidcPolicyRef?: string;
  requireMfa: boolean;
  endpoints: OAuthRuntimeEndpoints;
}

export type AcsBinding = 'POST' | 'Redirect';
export type NameIdFormat = 'emailAddress' | 'unspecified' | 'persistent' | 'transient';

export interface AttributeContractEntry {
  source: string;
  samlAttributeName: string;
}

export interface SamlOnboardRequest {
  partnerEntityId: string;
  connectionName: string;
  acsUrl: string;
  acsBinding: AcsBinding;
  sloEndpoint?: string;
  metadataXml?: string;
  nameIdFormat: NameIdFormat;
  attributeContract: AttributeContractEntry[];
  spSigningCert?: string;
  pfSigningKeyPairRef: string;
  requireMfa: boolean;
}

export interface SamlRuntimeEndpoints {
  sso: string;
  slo: string;
  idpMetadata: string;
}

export interface SamlOnboardResponse {
  id: string;
  partnerEntityId: string;
  connectionName: string;
  acsUrl: string;
  acsBinding: AcsBinding;
  sloEndpoint?: string;
  nameIdFormat: NameIdFormat;
  attributeContract: AttributeContractEntry[];
  pfSigningKeyPairRef: string;
  requireMfa: boolean;
  endpoints: SamlRuntimeEndpoints;
}

export type AppType = 'oauth' | 'saml';

export interface AppSummary {
  id: string;
  type: AppType;
  name: string;
  status?: string;
}

export interface OAuthAppDetail extends OAuthOnboardResponse {
  type: 'oauth';
}

export interface SamlAppDetail extends SamlOnboardResponse {
  type: 'saml';
}

export type AppDetail = OAuthAppDetail | SamlAppDetail;

export interface LoginRequest {
  username: string;
  password: string;
}

export interface IntegrationInfo {
  saml: {
    spEntityId: string;
    acsUrl: string;
    acsBinding: 'HTTP-POST';
    sloUrl: string;
    spMetadataUrl: string;
    nameIdFormatsSupported: string[];
    spCertificatePem: string;
    idp: {
      configured: boolean;
      entityId: string | null;
      ssoUrl: string | null;
      sloUrl: string | null;
    };
    pfRuntimeEndpoints: {
      sso: string;
      slo: string;
      metadata: string;
    };
  };
  oauth: {
    runtimeEndpoints: OAuthRuntimeEndpoints;
    grantTypesSupported: GrantType[];
    tokenEndpointAuthMethodsSupported: TokenEndpointAuthMethod[];
  };
}
