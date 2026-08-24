import path from 'path';
import fs from 'fs';
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

// Present only in the combined single-container image (root Dockerfile), which
// copies the frontend's built assets in here. Absent in the standalone
// backend-only image (backend/Dockerfile), where the frontend is a separate service.
const frontendDir = path.join(__dirname, '..', 'public');
const hasFrontendBuild = fs.existsSync(path.join(frontendDir, 'index.html'));

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

  if (!hasFrontendBuild) {
    app.get('/', (_req, res) =>
      res.json({
        service: 'sso-lab-backend',
        status: 'ok',
        message: 'This is the API server. The web UI is served by the frontend service.',
        health: '/healthz',
        api: '/api'
      })
    );
  }

  app.use('/api', apiRouter);

  if (hasFrontendBuild) {
    app.use(express.static(frontendDir));
    // React Router client-side routes (e.g. /apps, /onboard) have no matching
    // file on disk; hand them the SPA shell so the router can take over.
    // Never for /api/*, so an unmatched API route still 404s as JSON below.
    app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(path.join(frontendDir, 'index.html')));
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
