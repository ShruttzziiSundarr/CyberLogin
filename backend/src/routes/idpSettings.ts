import { Router } from 'express';
import { z } from 'zod';
import { csrfProtection } from '../middleware/csrf';
import { ApiErrors } from '../utils/errors';
import { getSamlSettings, updateSamlSettings } from '../saml/samlSettings';
import { isIdpConfigured } from '../saml/spConfig';

export const idpSettingsRouter = Router();

idpSettingsRouter.get('/', (_req, res) => {
  res.json({ settings: getSamlSettings(), idpConfigured: isIdpConfigured() });
});

function optionalUrl(message: string) {
  return z
    .string()
    .optional()
    .default('')
    .refine((v) => v === '' || z.string().url().safeParse(v).success, message);
}

const updateSchema = z.object({
  spEntityId: z.string().min(1, 'SP entity ID is required'),
  idpEntityId: z.string().optional().default(''),
  idpSsoUrl: optionalUrl('IdP SSO URL must be a valid URL'),
  idpSloUrl: optionalUrl('IdP SLO URL must be a valid URL'),
  idpCert: z.string().optional().default('')
});

idpSettingsRouter.put('/', csrfProtection, (req, res, next) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return next(ApiErrors.validation(parsed.error.issues.map((i) => i.message).join('; ')));
  }
  const updated = updateSamlSettings(parsed.data);
  res.json({ settings: updated, idpConfigured: isIdpConfigured() });
});
