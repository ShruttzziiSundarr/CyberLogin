import request from 'supertest';
import { createApp } from '../../app';
import { env } from '../../config/env';

export const PF_BASE_URL = env.PF_ADMIN_BASE_URL;

/** Logs in against the running app and returns an agent carrying the session cookie + CSRF token. */
export async function loginAgent() {
  const app = createApp();
  const agent = request.agent(app);
  const res = await agent
    .post('/api/auth/login')
    .send({ username: env.ADMIN_USERNAME, password: env.ADMIN_PASSWORD })
    .expect(200);

  return { app, agent, csrfToken: res.body.csrfToken as string };
}
