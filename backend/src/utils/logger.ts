import pino from 'pino';
import { env } from '../config/env';

// Redact anything that looks like a secret so it never lands in log output,
// no matter how deep it is nested in the logged object.
const REDACT_PATHS = [
  'password',
  '*.password',
  '*.*.password',
  'clientSecret',
  '*.clientSecret',
  '*.*.clientSecret',
  'bindPassword',
  '*.bindPassword',
  'PF_ADMIN_PASSWORD',
  'PD_BIND_PASSWORD',
  'secret',
  '*.secret',
  '*.*.secret',
  'authorization',
  '*.authorization',
  'headers.authorization',
  'req.headers.authorization',
  'req.headers.cookie'
];

export const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : process.env.LOG_LEVEL || 'info',
  redact: {
    paths: REDACT_PATHS,
    censor: '[REDACTED]'
  }
});

const SECRET_KEY_PATTERN = /(password|secret|token|bindpassword|clientsecret|authorization)/i;

/**
 * Deep-clones an object, replacing any value whose key looks secret-ish with '[REDACTED]'.
 * Use this before logging any payload that may contain PF request/response bodies.
 */
export function redactSecrets<T>(value: T, depth = 0): T {
  if (depth > 6 || value === null || value === undefined) return value;
  if (Array.isArray(value)) {
    return value.map((v) => redactSecrets(v, depth + 1)) as unknown as T;
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SECRET_KEY_PATTERN.test(k)) {
        out[k] = '[REDACTED]';
      } else {
        out[k] = redactSecrets(v, depth + 1);
      }
    }
    return out as unknown as T;
  }
  return value;
}
