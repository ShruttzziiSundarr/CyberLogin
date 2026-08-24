import { Router } from 'express';
import { authRouter } from './auth';
import { platformRouter } from './platform';
import { catalogRouter } from './catalog';
import { onboardOAuthRouter } from './onboardOAuth';
import { onboardSamlRouter } from './onboardSaml';
import { appsRouter } from './apps';
import { samlRouter } from './saml';
import { requireAuth } from '../middleware/auth';
import { env } from '../config/env';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);

// This app acting as a SAML SP: metadata/login/acs/slo must stay reachable
// without an existing session, since they're what *creates* the session.
apiRouter.use('/saml', samlRouter);

// Everything below requires an authenticated session.
apiRouter.use(requireAuth);

apiRouter.use('/platform', platformRouter);
apiRouter.use('/catalog', catalogRouter);
// SAML-only deployments (FEATURE_OAUTH_ONBOARDING off, the default) don't
// mount this route at all, so onboarding OAuth clients 404s rather than
// silently succeeding against a config that isn't meant to support it.
if (env.FEATURE_OAUTH_ONBOARDING) {
  apiRouter.use('/onboard/oauth', onboardOAuthRouter);
}
apiRouter.use('/onboard/saml', onboardSamlRouter);
apiRouter.use('/apps', appsRouter);
