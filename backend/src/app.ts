import express from 'express';
import session from 'express-session';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import pinoHttp from 'pino-http';
import { env } from './config/env';
import { logger } from './utils/logger';
import { apiRouter } from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    cors({
      origin: env.FRONTEND_BASE_URL,
      credentials: true
    })
  );
  app.use(express.json({ limit: '1mb' }));
  // PingFederate posts the SAML assertion to the ACS endpoint as a standard HTML form.
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));
  app.use(cookieParser());
  app.use(
    pinoHttp({
      logger,
      autoLogging: env.NODE_ENV !== 'test'
    })
  );

  app.use(
    session({
      name: 'connect.sid',
      secret: env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: env.COOKIE_SECURE,
        sameSite: 'strict',
        maxAge: 1000 * 60 * 60 * 8
      }
    })
  );

  app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));

  app.use('/api', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
