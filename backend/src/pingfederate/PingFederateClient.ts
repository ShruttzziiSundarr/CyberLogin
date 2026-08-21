import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import https from 'https';
import { env } from '../config/env';
import { logger, redactSecrets } from '../utils/logger';
import { mapUpstreamError } from './errors';
import {
  AuthenticationPolicyTree,
  IdentityProvider,
  OAuthClient,
  SpConnection
} from './IdentityProvider';

interface OAuthToken {
  accessToken: string;
  expiresAt: number; // epoch ms
}

/**
 * Concrete adapter for the PingFederate admin API (implements IdentityProvider).
 * All requests carry Basic or OAuth2-bearer auth plus the mandatory X-XSRF-Header,
 * and TLS verification stays on unless PF_TLS_INSECURE=true (logged loudly at startup).
 */
export class PingFederateClient implements IdentityProvider {
  private http: AxiosInstance;
  private cachedToken: OAuthToken | null = null;

  constructor() {
    if (env.PF_TLS_INSECURE) {
      // eslint-disable-next-line no-console
      console.warn(
        '\n*** WARNING: PF_TLS_INSECURE=true — TLS certificate verification for the PingFederate admin API is DISABLED. ***\n' +
          '*** This must never be used in production. ***\n'
      );
      logger.warn('PF_TLS_INSECURE is enabled: TLS certificate verification is disabled for the PF admin API');
    }

    const httpsAgent = new https.Agent({
      rejectUnauthorized: !env.PF_TLS_INSECURE
    });

    this.http = axios.create({
      baseURL: env.PF_ADMIN_BASE_URL,
      httpsAgent,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-XSRF-Header': 'PingFederate'
      }
    });
  }

  private async getAuthHeader(): Promise<Record<string, string>> {
    if (env.PF_ADMIN_AUTH_MODE === 'oauth2') {
      const token = await this.getOAuthToken();
      return { Authorization: `Bearer ${token}` };
    }
    const basic = Buffer.from(`${env.PF_ADMIN_USER}:${env.PF_ADMIN_PASSWORD}`).toString('base64');
    return { Authorization: `Basic ${basic}` };
  }

  private async getOAuthToken(): Promise<string> {
    const now = Date.now();
    if (this.cachedToken && this.cachedToken.expiresAt > now + 5000) {
      return this.cachedToken.accessToken;
    }

    try {
      const resp = await axios.post(
        env.PF_ADMIN_OAUTH_TOKEN_URL,
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: env.PF_ADMIN_OAUTH_CLIENT_ID,
          client_secret: env.PF_ADMIN_OAUTH_CLIENT_SECRET
        }).toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 15000 }
      );
      const accessToken = resp.data.access_token as string;
      const expiresIn = Number(resp.data.expires_in ?? 300);
      this.cachedToken = { accessToken, expiresAt: now + expiresIn * 1000 };
      return accessToken;
    } catch (err) {
      logger.error({ err: mapUpstreamError(err) }, 'Failed to obtain PF admin OAuth2 token');
      throw mapUpstreamError(err);
    }
  }

  private async request<T>(config: AxiosRequestConfig): Promise<T> {
    const authHeader = await this.getAuthHeader();
    try {
      const resp = await this.http.request<T>({
        ...config,
        headers: { ...config.headers, ...authHeader }
      });
      return resp.data;
    } catch (err) {
      const mapped = mapUpstreamError(err);
      logger.warn(
        { method: config.method, url: config.url, status: mapped.status, code: mapped.code, body: redactSecrets(config.data) },
        'PingFederate admin API request failed'
      );
      throw mapped;
    }
  }

  // --- server settings ---
  getServerSettings(): Promise<Record<string, unknown>> {
    return this.request({ method: 'GET', url: '/serverSettings' });
  }

  // --- OAuth clients ---
  listOAuthClients(): Promise<{ items: OAuthClient[] }> {
    return this.request({ method: 'GET', url: '/oauth/clients' });
  }
  createOAuthClient(client: OAuthClient): Promise<OAuthClient> {
    return this.request({ method: 'POST', url: '/oauth/clients', data: client });
  }
  getOAuthClient(clientId: string): Promise<OAuthClient> {
    return this.request({ method: 'GET', url: `/oauth/clients/${encodeURIComponent(clientId)}` });
  }
  updateOAuthClient(clientId: string, client: OAuthClient): Promise<OAuthClient> {
    return this.request({ method: 'PUT', url: `/oauth/clients/${encodeURIComponent(clientId)}`, data: client });
  }
  deleteOAuthClient(clientId: string): Promise<void> {
    return this.request({ method: 'DELETE', url: `/oauth/clients/${encodeURIComponent(clientId)}` });
  }

  // --- catalog ---
  listAccessTokenManagers(): Promise<{ items: unknown[] }> {
    return this.request({ method: 'GET', url: '/oauth/accessTokenManagers' });
  }
  listOidcPolicies(): Promise<{ items: unknown[] }> {
    return this.request({ method: 'GET', url: '/oauth/openIdConnect/policies' });
  }
  listSigningKeyPairs(): Promise<{ items: unknown[] }> {
    return this.request({ method: 'GET', url: '/keyPairs/signing' });
  }
  listPingOneConnections(): Promise<{ items: unknown[] }> {
    return this.request({ method: 'GET', url: '/pingOneConnections' });
  }

  // --- SP connections ---
  listSpConnections(): Promise<{ items: SpConnection[] }> {
    return this.request({ method: 'GET', url: '/idp/spConnections' });
  }
  createSpConnection(conn: SpConnection): Promise<SpConnection> {
    return this.request({ method: 'POST', url: '/idp/spConnections', data: conn });
  }
  getSpConnection(id: string): Promise<SpConnection> {
    return this.request({ method: 'GET', url: `/idp/spConnections/${encodeURIComponent(id)}` });
  }
  updateSpConnection(id: string, conn: SpConnection): Promise<SpConnection> {
    return this.request({ method: 'PUT', url: `/idp/spConnections/${encodeURIComponent(id)}`, data: conn });
  }
  deleteSpConnection(id: string): Promise<void> {
    return this.request({ method: 'DELETE', url: `/idp/spConnections/${encodeURIComponent(id)}` });
  }

  // --- IdP adapters / authn policies ---
  listIdpAdapters(): Promise<{ items: unknown[] }> {
    return this.request({ method: 'GET', url: '/idp/adapters' });
  }
  getAuthenticationPolicies(): Promise<AuthenticationPolicyTree> {
    return this.request({ method: 'GET', url: '/authenticationPolicies' });
  }
  putAuthenticationPolicies(tree: AuthenticationPolicyTree): Promise<AuthenticationPolicyTree> {
    return this.request({ method: 'PUT', url: '/authenticationPolicies', data: tree });
  }

  listAuthenticationPolicyContracts(): Promise<{ items: unknown[] }> {
    return this.request({ method: 'GET', url: '/authenticationPolicyContracts' });
  }
  createAuthenticationPolicyContract(contract: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.request({ method: 'POST', url: '/authenticationPolicyContracts', data: contract });
  }

  // --- data stores / PCVs ---
  listDataStores(): Promise<{ items: unknown[] }> {
    return this.request({ method: 'GET', url: '/dataStores' });
  }
  createDataStore(dataStore: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.request({ method: 'POST', url: '/dataStores', data: dataStore });
  }

  listPasswordCredentialValidators(): Promise<{ items: unknown[] }> {
    return this.request({ method: 'GET', url: '/passwordCredentialValidators' });
  }
  createPasswordCredentialValidator(pcv: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.request({ method: 'POST', url: '/passwordCredentialValidators', data: pcv });
  }
}

let singleton: PingFederateClient | null = null;

export function getPingFederateClient(): PingFederateClient {
  if (!singleton) {
    singleton = new PingFederateClient();
  }
  return singleton;
}
