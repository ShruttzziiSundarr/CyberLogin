import { Router } from 'express';
import { getPingFederateClient } from '../pingfederate/PingFederateClient';

export const catalogRouter = Router();

catalogRouter.get('/oauth-atms', async (_req, res, next) => {
  try {
    const idp = getPingFederateClient();
    res.json(await idp.listAccessTokenManagers());
  } catch (err) {
    next(err);
  }
});

catalogRouter.get('/oidc-policies', async (_req, res, next) => {
  try {
    const idp = getPingFederateClient();
    res.json(await idp.listOidcPolicies());
  } catch (err) {
    next(err);
  }
});

catalogRouter.get('/signing-keys', async (_req, res, next) => {
  try {
    const idp = getPingFederateClient();
    res.json(await idp.listSigningKeyPairs());
  } catch (err) {
    next(err);
  }
});
