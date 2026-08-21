import { z } from 'zod';

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

  FEATURE_MFA_POLICY_WRITE: boolFromString
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
