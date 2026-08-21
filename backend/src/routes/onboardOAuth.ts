import { Router } from 'express';
import { z } from 'zod';
import { getPingFederateClient } from '../pingfederate/PingFederateClient';
import { csrfProtection } from '../middleware/csrf';
import { onboardRateLimiter } from '../middleware/rateLimit';
import { ApiErrors } from '../utils/errors';
import { slugify } from '../utils/slugify';
import { generateClientSecret, hashSecret } from '../utils/secret';
import { computeOAuthRuntimeEndpoints } from '../services/runtimeEndpoints';
import { wireMfaForApp } from '../services/mfaPolicyService';
import { logger } from '../utils/logger';

export const onboardOAuthRouter = Router();

const grantTypeEnum = z.enum([
  'authorization_code',
  'client_credentials',
  'refresh_token',
  'implicit',
  'device_code'
]);

const authMethodEnum = z.enum(['client_secret_basic', 'client_secret_post', 'private_key_jwt', 'none']);

const onboardOAuthSchema = z
  .object({
    name: z.string().min(1, 'Application name is required'),
    clientId: z.string().min(1).optional(),
    grantTypes: z.array(grantTypeEnum).min(1, 'At least one grant type is required'),
    redirectUris: z.array(z.string().url()).optional(),
    scopes: z.array(z.string().min(1)).default([]),
    oidcEnabled: z.boolean().default(false),
    tokenEndpointAuthMethod: authMethodEnum,
    accessTokenManagerRef: z.string().min(1, 'An access token manager must be selected'),
    oidcPolicyRef: z.string().min(1).optional(),
    requireProofKeyForCodeExchange: z.boolean().default(false),
    requireMfa: z.boolean().default(false)
  })
  .superRefine((data, ctx) => {
    if (data.grantTypes.includes('authorization_code') && (!data.redirectUris || data.redirectUris.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['redirectUris'],
        message: 'redirectUris is required when grantTypes includes authorization_code'
      });
    }
    if (data.oidcEnabled && !data.oidcPolicyRef) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['oidcPolicyRef'],
        message: 'oidcPolicyRef is required when oidcEnabled is true'
      });
    }
    if (data.requireProofKeyForCodeExchange && data.tokenEndpointAuthMethod !== 'none') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['tokenEndpointAuthMethod'],
        message: 'PKCE public clients must use tokenEndpointAuthMethod=none'
      });
    }
  });

onboardOAuthRouter.post('/', onboardRateLimiter, csrfProtection, async (req, res, next) => {
  try {
    const parsed = onboardOAuthSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(ApiErrors.validation(parsed.error.issues.map((i) => i.message).join('; ')));
    }
    const input = parsed.data;

    const clientId = input.clientId ? slugify(input.clientId) : slugify(input.name);

    const scopes = new Set(input.scopes);
    if (input.oidcEnabled) scopes.add('openid');

    const needsSecret = input.tokenEndpointAuthMethod !== 'none';
    let plaintextSecret: string | undefined;
    let secretHash: string | undefined;
    if (needsSecret) {
      plaintextSecret = generateClientSecret();
      secretHash = hashSecret(plaintextSecret);
    }

    const idp = getPingFederateClient();

    const clientPayload: Record<string, unknown> = {
      clientId,
      name: input.name,
      grantTypes: input.grantTypes,
      redirectUris: input.redirectUris ?? [],
      restrictScopes: false,
      oidcPolicy: input.oidcEnabled ? { policyGroup: { id: input.oidcPolicyRef } } : undefined,
      defaultAccessTokenManagerRef: { id: input.accessTokenManagerRef },
      tokenEndpointAuthMethod: input.tokenEndpointAuthMethod,
      requireProofKeyForCodeExchange: input.requireProofKeyForCodeExchange,
      // Never send the plaintext secret to PF as a logged field name; PF itself stores it.
      ...(plaintextSecret ? { clientSecret: plaintextSecret } : {})
    };

    const created = await idp.createOAuthClient(clientPayload as never);

    let mfaAdapterId: string | undefined;
    if (input.requireMfa) {
      const mfaResult = await wireMfaForApp(idp, { appId: clientId, appName: input.name });
      mfaAdapterId = mfaResult.mfaAdapterId;
    }

    logger.info({ clientId, oidcEnabled: input.oidcEnabled, requireMfa: input.requireMfa }, 'OAuth client onboarded');

    res.status(201).json({
      client: { ...created, clientSecret: undefined, secretIssued: needsSecret, secretHash },
      // The secret is returned exactly once, here, and never persisted in plaintext.
      clientSecret: plaintextSecret,
      scopes: Array.from(scopes),
      runtimeEndpoints: computeOAuthRuntimeEndpoints(),
      mfa: input.requireMfa ? { enabled: true, adapterId: mfaAdapterId } : { enabled: false }
    });
  } catch (err) {
    next(err);
  }
});
