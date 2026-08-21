import { logger } from '../utils/logger';
import {
  AuthenticationPolicyTree,
  IdentityProvider,
  OAuthClient,
  SpConnection
} from './IdentityProvider';
import { PingFederateApiError } from './errors';

/**
 * In-memory stand-in for the PingFederate admin API. Lets the portal run
 * fully end-to-end (login, platform status, both onboarding flows, apps
 * list, offboard) without a real PingFederate instance. Enabled via
 * MOCK_PING=true. Never used when that flag is off.
 */
export class MockIdentityProvider implements IdentityProvider {
  private oauthClients = new Map<string, OAuthClient>();
  private spConnections = new Map<string, SpConnection>();
  private policyTree: AuthenticationPolicyTree = { policies: [] };

  constructor() {
    logger.warn('MOCK_PING is enabled: PingFederate admin API calls are served by an in-memory mock. Not for production.');
  }

  getServerSettings(): Promise<Record<string, unknown>> {
    return Promise.resolve({
      federationInfo: { baseUrl: 'https://mock-pf.local:9031' },
      mock: true
    });
  }

  // --- OAuth clients ---
  listOAuthClients(): Promise<{ items: OAuthClient[] }> {
    return Promise.resolve({ items: Array.from(this.oauthClients.values()) });
  }
  createOAuthClient(client: OAuthClient): Promise<OAuthClient> {
    if (this.oauthClients.has(client.clientId)) {
      return Promise.reject(new PingFederateApiError(409, 'CONFLICT', `OAuth client "${client.clientId}" already exists`));
    }
    const created = { ...client, createdAt: new Date().toISOString() };
    this.oauthClients.set(client.clientId, created);
    return Promise.resolve(created);
  }
  getOAuthClient(clientId: string): Promise<OAuthClient> {
    const found = this.oauthClients.get(clientId);
    if (!found) return Promise.reject(new PingFederateApiError(404, 'NOT_FOUND', `OAuth client "${clientId}" not found`));
    return Promise.resolve(found);
  }
  updateOAuthClient(clientId: string, client: OAuthClient): Promise<OAuthClient> {
    if (!this.oauthClients.has(clientId)) {
      return Promise.reject(new PingFederateApiError(404, 'NOT_FOUND', `OAuth client "${clientId}" not found`));
    }
    this.oauthClients.set(clientId, client);
    return Promise.resolve(client);
  }
  deleteOAuthClient(clientId: string): Promise<void> {
    this.oauthClients.delete(clientId);
    return Promise.resolve();
  }

  // --- catalog ---
  listAccessTokenManagers(): Promise<{ items: unknown[] }> {
    return Promise.resolve({
      items: [
        { id: 'jwt-atm', name: 'JWT Access Token Manager' },
        { id: 'ref-atm', name: 'Reference Token Access Token Manager' }
      ]
    });
  }
  listOidcPolicies(): Promise<{ items: unknown[] }> {
    return Promise.resolve({
      items: [
        { id: 'default-oidc-policy', name: 'Default OIDC Policy' },
        { id: 'pairwise-oidc-policy', name: 'Pairwise Subject OIDC Policy' }
      ]
    });
  }
  listSigningKeyPairs(): Promise<{ items: unknown[] }> {
    return Promise.resolve({
      items: [
        { id: 'mock-signing-key-1', subjectDN: 'CN=mock-pf.local, O=Mock Org' },
        { id: 'mock-signing-key-2', subjectDN: 'CN=mock-pf-backup.local, O=Mock Org' }
      ]
    });
  }
  listPingOneConnections(): Promise<{ items: unknown[] }> {
    return Promise.resolve({
      items: [{ id: 'mock-pingone-conn', name: 'Mock PingOne Environment' }]
    });
  }

  // --- SP connections ---
  listSpConnections(): Promise<{ items: SpConnection[] }> {
    return Promise.resolve({ items: Array.from(this.spConnections.values()) });
  }
  createSpConnection(conn: SpConnection): Promise<SpConnection> {
    if (this.spConnections.has(conn.id)) {
      return Promise.reject(new PingFederateApiError(409, 'CONFLICT', `SP connection "${conn.id}" already exists`));
    }
    const created = { ...conn, createdAt: new Date().toISOString() };
    this.spConnections.set(conn.id, created);
    return Promise.resolve(created);
  }
  getSpConnection(id: string): Promise<SpConnection> {
    const found = this.spConnections.get(id);
    if (!found) return Promise.reject(new PingFederateApiError(404, 'NOT_FOUND', `SP connection "${id}" not found`));
    return Promise.resolve(found);
  }
  updateSpConnection(id: string, conn: SpConnection): Promise<SpConnection> {
    if (!this.spConnections.has(id)) {
      return Promise.reject(new PingFederateApiError(404, 'NOT_FOUND', `SP connection "${id}" not found`));
    }
    this.spConnections.set(id, conn);
    return Promise.resolve(conn);
  }
  deleteSpConnection(id: string): Promise<void> {
    this.spConnections.delete(id);
    return Promise.resolve();
  }

  // --- IdP adapters / authn policies ---
  listIdpAdapters(): Promise<{ items: unknown[] }> {
    return Promise.resolve({ items: [{ id: 'mock-pingone-mfa-adapter', name: 'PingOne MFA Adapter', type: 'MFA' }] });
  }
  getAuthenticationPolicies(): Promise<AuthenticationPolicyTree> {
    return Promise.resolve(this.policyTree);
  }
  putAuthenticationPolicies(tree: AuthenticationPolicyTree): Promise<AuthenticationPolicyTree> {
    this.policyTree = tree;
    return Promise.resolve(this.policyTree);
  }

  listAuthenticationPolicyContracts(): Promise<{ items: unknown[] }> {
    return Promise.resolve({ items: [{ id: 'default-policy-contract', name: 'Default Policy Contract' }] });
  }
  createAuthenticationPolicyContract(contract: Record<string, unknown>): Promise<Record<string, unknown>> {
    return Promise.resolve({ id: `mock-contract-${Date.now()}`, ...contract });
  }

  // --- data stores / PCVs (seeded so the platform status panel shows "ready") ---
  listDataStores(): Promise<{ items: unknown[] }> {
    return Promise.resolve({
      items: [{ id: 'mock-pingdirectory', type: 'LDAP', name: 'Mock PingDirectory' }]
    });
  }
  createDataStore(dataStore: Record<string, unknown>): Promise<Record<string, unknown>> {
    return Promise.resolve({ id: `mock-datastore-${Date.now()}`, ...dataStore });
  }

  listPasswordCredentialValidators(): Promise<{ items: unknown[] }> {
    return Promise.resolve({
      items: [{ id: 'mock-pingdirectory-pcv', name: 'Mock PingDirectory PCV' }]
    });
  }
  createPasswordCredentialValidator(pcv: Record<string, unknown>): Promise<Record<string, unknown>> {
    return Promise.resolve({ id: `mock-pcv-${Date.now()}`, ...pcv });
  }
}
