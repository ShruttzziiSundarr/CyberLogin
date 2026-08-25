import 'express-session';

declare module 'express-session' {
  interface SessionData {
    user?: { username: string; attributes?: Record<string, unknown> };
  }
}

export interface RuntimeOAuthEndpoints {
  discovery: string;
  authorization: string;
  token: string;
  userinfo: string;
  jwks: string;
  introspection: string;
  revocation: string;
}

export interface RuntimeSamlEndpoints {
  sso: string;
  slo: string;
  metadata: string;
}

export interface NormalizedApp {
  id: string;
  type: 'oauth' | 'saml';
  name: string;
  createdAt?: string;
}
