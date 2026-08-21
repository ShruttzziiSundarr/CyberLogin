import { Router } from 'express';
import { z } from 'zod';
import { getPingFederateClient } from '../pingfederate/PingFederateClient';
import { env } from '../config/env';
import { ApiErrors } from '../utils/errors';
import { csrfProtection } from '../middleware/csrf';

export const platformRouter = Router();

platformRouter.get('/status', async (_req, res, next) => {
  try {
    const idp = getPingFederateClient();
    const [dataStores, pcvs, pingOneConnections, signingKeys] = await Promise.all([
      idp.listDataStores(),
      idp.listPasswordCredentialValidators(),
      idp.listPingOneConnections(),
      idp.listSigningKeyPairs()
    ]);

    res.json({
      dataStoreConfigured: (dataStores.items ?? []).length > 0,
      passwordCredentialValidatorConfigured: (pcvs.items ?? []).length > 0,
      pingOneConnectionConfigured: (pingOneConnections.items ?? []).length > 0,
      signingKeysAvailable: (signingKeys.items ?? []).length > 0,
      mfaPolicyWriteEnabled: env.FEATURE_MFA_POLICY_WRITE
    });
  } catch (err) {
    next(err);
  }
});

const dataStoreSchema = z.object({
  name: z.string().min(1).optional()
});

/** Optional, opt-in guided creation of the LDAP data store from PD_* env values. Read-only remains the default. */
platformRouter.post('/datastore', csrfProtection, async (req, res, next) => {
  try {
    const parsed = dataStoreSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return next(ApiErrors.validation('Invalid request body'));
    }

    if (!env.PD_LDAP_HOST || !env.PD_BIND_DN || !env.PD_SEARCH_BASE) {
      return next(
        ApiErrors.badRequest(
          'PD_LDAP_HOST, PD_BIND_DN and PD_SEARCH_BASE must be configured to guided-create the LDAP data store'
        )
      );
    }

    const idp = getPingFederateClient();
    const created = await idp.createDataStore({
      type: 'LDAP',
      name: parsed.data.name ?? 'PingDirectory',
      ldapType: 'PING_DIRECTORY',
      hostnames: [env.PD_LDAP_HOST],
      bindAnonymously: false,
      userDN: env.PD_BIND_DN,
      password: env.PD_BIND_PASSWORD,
      searchBase: env.PD_SEARCH_BASE
    });

    res.status(201).json({ dataStore: created });
  } catch (err) {
    next(err);
  }
});
