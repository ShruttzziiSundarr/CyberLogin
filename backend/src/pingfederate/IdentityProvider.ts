// Generic contract for an "onboarding-capable" identity provider admin API.
// PingFederateClient implements this today; a future Keycloak/Okta adapter
// could implement the same interface without any route code changing.

export interface OAuthClient {
  clientId: string;
  name: string;
  grantTypes: string[];
  redirectUris?: string[];
  [key: string]: unknown;
}

export interface SpConnection {
  id: string;
  entityId: string;
  name?: string;
  [key: string]: unknown;
}

export interface AuthenticationPolicyTree {
  [key: string]: unknown;
}

export interface IdentityProvider {
  getServerSettings(): Promise<Record<string, unknown>>;

  listOAuthClients(): Promise<{ items: OAuthClient[] }>;
  createOAuthClient(client: OAuthClient): Promise<OAuthClient>;
  getOAuthClient(clientId: string): Promise<OAuthClient>;
  updateOAuthClient(clientId: string, client: OAuthClient): Promise<OAuthClient>;
  deleteOAuthClient(clientId: string): Promise<void>;

  listAccessTokenManagers(): Promise<{ items: unknown[] }>;
  listOidcPolicies(): Promise<{ items: unknown[] }>;

  listSpConnections(): Promise<{ items: SpConnection[] }>;
  createSpConnection(conn: SpConnection): Promise<SpConnection>;
  getSpConnection(id: string): Promise<SpConnection>;
  updateSpConnection(id: string, conn: SpConnection): Promise<SpConnection>;
  deleteSpConnection(id: string): Promise<void>;

  listIdpAdapters(): Promise<{ items: unknown[] }>;
  getAuthenticationPolicies(): Promise<AuthenticationPolicyTree>;
  putAuthenticationPolicies(tree: AuthenticationPolicyTree): Promise<AuthenticationPolicyTree>;

  listAuthenticationPolicyContracts(): Promise<{ items: unknown[] }>;
  createAuthenticationPolicyContract(contract: Record<string, unknown>): Promise<Record<string, unknown>>;

  listDataStores(): Promise<{ items: unknown[] }>;
  createDataStore(dataStore: Record<string, unknown>): Promise<Record<string, unknown>>;

  listPasswordCredentialValidators(): Promise<{ items: unknown[] }>;
  createPasswordCredentialValidator(pcv: Record<string, unknown>): Promise<Record<string, unknown>>;

  listSigningKeyPairs(): Promise<{ items: unknown[] }>;
  listPingOneConnections(): Promise<{ items: unknown[] }>;
}
