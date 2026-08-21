import rateLimit from 'express-rate-limit';

/** Applied to /api/onboard/* — these are the highest-impact write operations in the portal. */
export const onboardRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many onboarding requests, please try again later' } }
});
