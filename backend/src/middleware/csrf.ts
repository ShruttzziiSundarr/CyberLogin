import { doubleCsrf } from 'csrf-csrf';
import { env } from '../config/env';

const { doubleCsrfProtection, generateToken } = doubleCsrf({
  getSecret: () => env.SESSION_SECRET,
  cookieName: env.COOKIE_SECURE ? '__Host-portal.csrf' : 'portal.csrf',
  cookieOptions: {
    sameSite: 'strict',
    secure: env.COOKIE_SECURE,
    httpOnly: true,
    path: '/'
  },
  getSessionIdentifier: (req) => req.session?.id ?? 'anonymous',
  size: 64
});

export const csrfProtection = doubleCsrfProtection;
export const generateCsrfToken = generateToken;
