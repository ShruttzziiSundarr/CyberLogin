import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env';
import { ApiErrors } from '../utils/errors';
import { generateCsrfToken } from '../middleware/csrf';

export const authRouter = Router();

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

authRouter.post('/login', (req, res, next) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return next(ApiErrors.validation('username and password are required'));
  }

  const { username, password } = parsed.data;
  if (username !== env.ADMIN_USERNAME || password !== env.ADMIN_PASSWORD) {
    return next(ApiErrors.unauthorized('Invalid credentials'));
  }

  req.session.regenerate((err) => {
    if (err) return next(err);
    req.session.user = { username };
    const csrfToken = generateCsrfToken(req, res);
    res.json({ user: { username }, csrfToken });
  });
});

// Lets the frontend recover a valid session + CSRF token after a page reload
// (the CSRF token from /login only lives in JS memory on the client).
authRouter.get('/session', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: { code: 'unauthorized', message: 'Not authenticated' } });
  }
  const csrfToken = generateCsrfToken(req, res);
  res.json({ user: req.session.user, csrfToken });
});

authRouter.post('/logout', (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('connect.sid');
    res.status(204).send();
  });
});
