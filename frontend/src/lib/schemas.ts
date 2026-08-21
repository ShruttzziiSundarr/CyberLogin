import { z } from 'zod';

export const grantTypeEnum = z.enum([
  'authorization_code',
  'client_credentials',
  'refresh_token',
  'implicit',
  'device_code',
]);

export const tokenEndpointAuthMethodEnum = z.enum([
  'client_secret_basic',
  'client_secret_post',
  'private_key_jwt',
  'none',
]);

export const oauthOnboardSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    clientId: z.string().optional(),
    grantTypes: z.array(grantTypeEnum).min(1, 'Select at least one grant type'),
    redirectUris: z.array(z.string().url('Must be a valid URL')).default([]),
    scopes: z.array(z.string().min(1)).min(1, 'Select or add at least one scope'),
    oidcEnabled: z.boolean().default(false),
    tokenEndpointAuthMethod: tokenEndpointAuthMethodEnum,
    accessTokenManagerRef: z.string().min(1, 'Access token manager is required'),
    oidcPolicyRef: z.string().optional(),
    requireMfa: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    if (data.grantTypes.includes('authorization_code') && data.redirectUris.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['redirectUris'],
        message: 'At least one redirect URI is required for the authorization_code grant',
      });
    }
    if (data.oidcEnabled && !data.oidcPolicyRef) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['oidcPolicyRef'],
        message: 'OIDC policy is required when OIDC is enabled',
      });
    }
  });

export type OAuthOnboardFormValues = z.infer<typeof oauthOnboardSchema>;

export const acsBindingEnum = z.enum(['POST', 'Redirect']);
export const nameIdFormatEnum = z.enum(['emailAddress', 'unspecified', 'persistent', 'transient']);

export const attributeContractEntrySchema = z.object({
  source: z.string().min(1, 'Source is required'),
  samlAttributeName: z.string().min(1, 'SAML attribute name is required'),
});

export const samlOnboardSchema = z.object({
  partnerEntityId: z.string().min(1, 'Partner entity ID is required'),
  connectionName: z.string().min(1, 'Connection name is required'),
  acsUrl: z.string().url('Must be a valid URL'),
  acsBinding: acsBindingEnum,
  sloEndpoint: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  metadataXml: z.string().optional(),
  nameIdFormat: nameIdFormatEnum,
  attributeContract: z.array(attributeContractEntrySchema).default([]),
  spSigningCert: z.string().optional(),
  pfSigningKeyPairRef: z.string().min(1, 'Signing key is required'),
  requireMfa: z.boolean().default(false),
});

export type SamlOnboardFormValues = z.infer<typeof samlOnboardSchema>;

export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
