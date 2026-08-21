import { Router } from 'express';
import { authRouter } from './auth';
import { platformRouter } from './platform';
import { catalogRouter } from './catalog';
import { onboardOAuthRouter } from './onboardOAuth';
import { onboardSamlRouter } from './onboardSaml';
import { appsRouter } from './apps';
import { requireAuth } from '../middleware/auth';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);

// Everything below requires an authenticated session.
apiRouter.use(requireAuth);

apiRouter.use('/platform', platformRouter);
apiRouter.use('/catalog', catalogRouter);
apiRouter.use('/onboard/oauth', onboardOAuthRouter);
apiRouter.use('/onboard/saml', onboardSamlRouter);
apiRouter.use('/apps', appsRouter);
