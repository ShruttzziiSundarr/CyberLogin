import { Router } from 'express';
import { z } from 'zod';
import { getPingFederateClient } from '../pingfederate/PingFederateClient';
import { csrfProtection } from '../middleware/csrf';
import { onboardRateLimiter } from '../middleware/rateLimit';
import { ApiErrors } from '../utils/errors';
import { computeSamlRuntimeEndpoints } from '../services/runtimeEndpoints';
import { parseSpMetadataXml } from '../services/samlMetadataParser';
import { wireMfaForApp } from '../services/mfaPolicyService';
import { logger } from '../utils/logger';

export const onboardSamlRouter = Router();

const nameIdFormatEnum = z.enum(['emailAddress', 'unspecified', 'persistent', 'transient']);
const bindingEnum = z.enum(['POST', 'Redirect']);

const attributeMappingSchema = z.object({
  source: z.string().min(1),
  samlAttributeName: z.string().min(1)
});

const onboardSamlSchema = z.object({
  partnerEntityId: z.string().min(1, 'partnerEntityId is required').optional(),
  connectionName: z.string().min(1, 'connectionName is required'),
  acsUrl: z.string().url().optional(),
  acsBinding: bindingEnum.optional(),
  sloEndpoint: z.string().url().optional(),
  metadataXml: z.string().optional(),
  nameIdFormat: nameIdFormatEnum.default('emailAddress'),
  attributeContract: z.array(attributeMappingSchema).default([]),
  spSigningCert: z.string().optional(),
  pfSigningKeyPairRef: z.string().min(1, 'pfSigningKeyPairRef is required'),
  requireMfa: z.boolean().default(false)
});

onboardSamlRouter.post('/', onboardRateLimiter, csrfProtection, async (req, res, next) => {
  try {
    const parsed = onboardSamlSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(ApiErrors.validation(parsed.error.issues.map((i) => i.message).join('; ')));
    }
    const input = parsed.data;

    let entityId = input.partnerEntityId;
    let acsUrl = input.acsUrl;
    let acsBinding = input.acsBinding;
    let spSigningCert = input.spSigningCert;

    if (input.metadataXml) {
      const parsedMeta = parseSpMetadataXml(input.metadataXml);
      entityId = entityId ?? parsedMeta.entityId;
      acsUrl = acsUrl ?? parsedMeta.acsUrl;
      acsBinding = acsBinding ?? parsedMeta.acsBinding;
      spSigningCert = spSigningCert ?? parsedMeta.signingCert;
    }

    if (!entityId) {
      return next(ApiErrors.validation('partnerEntityId is required (directly, or via metadataXml)'));
    }
    if (!acsUrl || !acsBinding) {
      return next(ApiErrors.validation('acsUrl and acsBinding are required (directly, or via metadataXml)'));
    }

    const idp = getPingFederateClient();

    const existing = await idp.listSpConnections();
    if ((existing.items ?? []).some((c) => c.entityId === entityId)) {
      return next(ApiErrors.conflict(`An SP connection with partnerEntityId "${entityId}" already exists`));
    }

    const connectionPayload = {
      id: entityId,
      entityId,
      name: input.connectionName,
      active: true,
      credentials: {
        signingSettings: { signingKeyPairRef: { id: input.pfSigningKeyPairRef } },
        certs: spSigningCert ? [{ x509File: { fileData: spSigningCert } }] : []
      },
      spBrowserSso: {
        protocol: 'SAML20',
        nameIdFormat: input.nameIdFormat,
        assertionConsumerServices: [{ url: acsUrl, binding: acsBinding, index: 0, isDefault: true }],
        sloServiceEndpoints: input.sloEndpoint ? [{ url: input.sloEndpoint, binding: 'POST' }] : [],
        attributeContract: {
          coreAttributes: input.attributeContract.map((m) => ({ name: m.samlAttributeName, source: m.source }))
        }
      }
    };

    const created = await idp.createSpConnection(connectionPayload as never);

    let mfaAdapterId: string | undefined;
    if (input.requireMfa) {
      const mfaResult = await wireMfaForApp(idp, { appId: entityId, appName: input.connectionName });
      mfaAdapterId = mfaResult.mfaAdapterId;
    }

    logger.info({ entityId, requireMfa: input.requireMfa }, 'SAML SP connection onboarded');

    res.status(201).json({
      connection: created,
      runtimeEndpoints: computeSamlRuntimeEndpoints(entityId),
      mfa: input.requireMfa ? { enabled: true, adapterId: mfaAdapterId } : { enabled: false }
    });
  } catch (err) {
    next(err);
  }
});
