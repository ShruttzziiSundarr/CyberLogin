import { createApp } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';

const app = createApp();
const port = Number(env.PORT);

app.listen(port, () => {
  logger.info({ port, env: env.NODE_ENV }, 'Unified Login Onboarding Portal backend listening');
});
