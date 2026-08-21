import crypto from 'crypto';

/** Generates a strong, URL-safe random secret suitable for an OAuth client secret. */
export function generateClientSecret(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

/** One-way hash of a secret, for storing a local reference without persisting plaintext. */
export function hashSecret(secret: string): string {
  return crypto.createHash('sha256').update(secret).digest('hex');
}
