import { Router } from 'express';
import { getPingFederateClient } from '../pingfederate/PingFederateClient';
import { csrfProtection } from '../middleware/csrf';
import { ApiErrors } from '../utils/errors';
import { NormalizedApp } from '../types';
import { computeOAuthRuntimeEndpoints, computeSamlRuntimeEndpoints } from '../services/runtimeEndpoints';

export const appsRouter = Router();

appsRouter.get('/', async (_req, res, next) => {
  try {
    const idp = getPingFederateClient();
    const [clients, connections] = await Promise.all([idp.listOAuthClients(), idp.listSpConnections()]);

    const apps: NormalizedApp[] = [
      ...(clients.items ?? []).map((c) => ({ id: c.clientId, type: 'oauth' as const, name: c.name })),
      ...(connections.items ?? []).map((c) => ({ id: c.id, type: 'saml' as const, name: c.name ?? c.entityId }))
    ];

    res.json({ items: apps });
  } catch (err) {
    next(err);
  }
});

appsRouter.get('/:type/:id', async (req, res, next) => {
  try {
    const { type, id } = req.params;
    const idp = getPingFederateClient();

    if (type === 'oauth') {
      const client = await idp.getOAuthClient(id);
      return res.json({ app: client, runtimeEndpoints: computeOAuthRuntimeEndpoints() });
    }
    if (type === 'saml') {
      const conn = await idp.getSpConnection(id);
      return res.json({ app: conn, runtimeEndpoints: computeSamlRuntimeEndpoints(conn.entityId) });
    }
    return next(ApiErrors.badRequest(`Unknown app type "${type}"`));
  } catch (err) {
    next(err);
  }
});

appsRouter.delete('/:type/:id', csrfProtection, async (req, res, next) => {
  try {
    const { type, id } = req.params;
    const idp = getPingFederateClient();

    if (type === 'oauth') {
      await idp.deleteOAuthClient(id);
      return res.status(204).send();
    }
    if (type === 'saml') {
      await idp.deleteSpConnection(id);
      return res.status(204).send();
    }
    return next(ApiErrors.badRequest(`Unknown app type "${type}"`));
  } catch (err) {
    next(err);
  }
});
