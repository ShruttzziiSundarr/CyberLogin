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

authRouter.post('/logout', (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('connect.sid');
    res.status(204).send();
  });
});
