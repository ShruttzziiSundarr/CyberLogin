import { httpClient, setCsrfToken } from './httpClient';
import type {
  AppDetail,
  AppSummary,
  AppType,
  CatalogItem,
  LoginRequest,
  OAuthOnboardRequest,
  OAuthOnboardResponse,
  PlatformStatus,
  SamlOnboardRequest,
  SamlOnboardResponse,
} from '../types/api';

// --- Auth ---

interface SessionResponse {
  user: { username: string };
  csrfToken: string;
}

export async function login(body: LoginRequest): Promise<SessionResponse> {
  const { data } = await httpClient.post<SessionResponse>('/auth/login', body);
  setCsrfToken(data.csrfToken);
  return data;
}

// Recovers the session + a fresh CSRF token after a page reload (the token
// from login only lives in JS memory). Used by AuthGuard on mount.
export async function getSession(): Promise<SessionResponse> {
  const { data } = await httpClient.get<SessionResponse>('/auth/session');
  setCsrfToken(data.csrfToken);
  return data;
}

export async function logout(): Promise<void> {
  await httpClient.post('/auth/logout');
  setCsrfToken(null);
}

// --- Platform status ---

export async function getPlatformStatus(): Promise<PlatformStatus> {
  const { data } = await httpClient.get<PlatformStatus>('/platform/status');
  return data;
}

// --- Catalog ---

export async function getOAuthAtms(): Promise<CatalogItem[]> {
  const { data } = await httpClient.get<CatalogItem[]>('/catalog/oauth-atms');
  return data;
}

export async function getOidcPolicies(): Promise<CatalogItem[]> {
  const { data } = await httpClient.get<CatalogItem[]>('/catalog/oidc-policies');
  return data;
}

export async function getSigningKeys(): Promise<CatalogItem[]> {
  const { data } = await httpClient.get<CatalogItem[]>('/catalog/signing-keys');
  return data;
}

// --- Onboarding ---

export async function onboardOAuth(body: OAuthOnboardRequest): Promise<OAuthOnboardResponse> {
  const { data } = await httpClient.post<OAuthOnboardResponse>('/onboard/oauth', body);
  return data;
}

export async function onboardSaml(body: SamlOnboardRequest): Promise<SamlOnboardResponse> {
  const { data } = await httpClient.post<SamlOnboardResponse>('/onboard/saml', body);
  return data;
}

// --- Apps ---

export async function getApps(): Promise<AppSummary[]> {
  const { data } = await httpClient.get<AppSummary[]>('/apps');
  return data;
}

export async function getAppDetail(type: AppType, id: string): Promise<AppDetail> {
  const { data } = await httpClient.get<AppDetail>(`/apps/${type}/${id}`);
  return data;
}

export async function deleteApp(type: AppType, id: string): Promise<void> {
  await httpClient.delete(`/apps/${type}/${id}`);
}
