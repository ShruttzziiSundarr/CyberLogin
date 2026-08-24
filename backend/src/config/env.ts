import dotenv from 'dotenv';
import { z } from 'zod';

// In tests, src/test-env.ts (a Jest setupFile) already populates process.env
// directly, so skip loading a local .env file to keep test config isolated
// and deterministic.
if (process.env.NODE_ENV !== 'test') {
  dotenv.config();
}

const boolFromString = z
  .string()
  .optional()
  .transform((v) => (v ?? 'false').toLowerCase() === 'true');

const envSchema = z.object({
  PORT: z.string().default('4000'),
  NODE_ENV: z.string().default('development'),
  SESSION_SECRET: z.string().min(1, 'SESSION_SECRET is required'),
  COOKIE_SECURE: boolFromString,

  ADMIN_USERNAME: z.string().min(1),
  ADMIN_PASSWORD: z.string().min(1),

  PF_ADMIN_BASE_URL: z.string().url(),
  PF_ADMIN_USER: z.string().optional().default(''),
  PF_ADMIN_PASSWORD: z.string().optional().default(''),
  PF_ADMIN_AUTH_MODE: z.enum(['basic', 'oauth2']).default('basic'),
  PF_ADMIN_OAUTH_TOKEN_URL: z.string().optional().default(''),
  PF_ADMIN_OAUTH_CLIENT_ID: z.string().optional().default(''),
  PF_ADMIN_OAUTH_CLIENT_SECRET: z.string().optional().default(''),

  PF_TLS_INSECURE: boolFromString,
  PF_RUNTIME_BASE_URL: z.string().url(),

  PD_LDAP_HOST: z.string().optional().default(''),
  PD_BIND_DN: z.string().optional().default(''),
  PD_BIND_PASSWORD: z.string().optional().default(''),
  PD_SEARCH_BASE: z.string().optional().default(''),

  FEATURE_MFA_POLICY_WRITE: boolFromString,

  // Off by default: the OAuth/OIDC onboarding route and its frontend form are
  // hidden, leaving SAML as the only onboarding protocol. Set to true to
  // re-enable OAuth/OIDC onboarding.
  FEATURE_OAUTH_ONBOARDING: boolFromString,

  // When true, all PingFederate admin API calls are served by an in-memory
  // mock instead of a real PF instance, so the whole portal works standalone
  // as a demo. Never enable in production.
  MOCK_PING: boolFromString,

  // --- This app acting as a SAML 2.0 Service Provider, with PingFederate as the IdP ---
  // Public URL this backend is reachable at, used to build ACS/metadata/SLO endpoint URLs.
  SP_BASE_URL: z.string().url().default('http://localhost:4000'),
  // Where to send the browser back to after ACS processes the assertion, and
  // the only origin allowed to make credentialed cross-origin requests to this API.
  FRONTEND_BASE_URL: z.string().url().default('http://localhost:5173'),
  SP_ENTITY_ID: z.string().default('urn:sso-lab:sp'),
  // SP signing key/certificate: either inline PEM content (SP_PRIVATE_KEY / SP_CERTIFICATE,
  // used in deployments where the certs/ directory isn't shipped, e.g. Render) or a path to
  // a PEM file, defaulting to the generated dev pair in backend/certs/.
  SP_PRIVATE_KEY: z.string().optional().default(''),
  SP_CERTIFICATE: z.string().optional().default(''),
  SP_PRIVATE_KEY_PATH: z.string().default('certs/sp-private-key.pem'),
  SP_CERTIFICATE_PATH: z.string().default('certs/sp-certificate.pem'),

  // PingFederate as the IdP: its entity ID, SSO/SLO endpoints, and signing certificate.
  // Leave blank until a real PingFederate SP connection has been created for this app.
  PF_IDP_ENTITY_ID: z.string().optional().default(''),
  PF_IDP_SSO_URL: z.string().optional().default(''),
  PF_IDP_SLO_URL: z.string().optional().default(''),
  PF_IDP_CERT: z.string().optional().default('')
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment configuration');
  }
  return parsed.data;
}

export const env = loadEnv();

export const isProduction = env.NODE_ENV === 'production';
