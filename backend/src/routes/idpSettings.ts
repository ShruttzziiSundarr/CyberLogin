import { Router } from 'express';
import { z } from 'zod';
import { csrfProtection } from '../middleware/csrf';
import { ApiErrors } from '../utils/errors';
import { getSamlSettings, updateSamlSettings } from '../saml/samlSettings';
import { isIdpConfigured } from '../saml/spConfig';
import { parseIdpMetadataXml } from '../services/samlMetadataParser';

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
  idpCert: z.string().optional().default(''),
  requiredAttributes: z.array(z.string().min(1)).optional().default([])
});

idpSettingsRouter.put('/', csrfProtection, (req, res, next) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return next(ApiErrors.validation(parsed.error.issues.map((i) => i.message).join('; ')));
  }
  const updated = updateSamlSettings(parsed.data);
  res.json({ settings: updated, idpConfigured: isIdpConfigured() });
});

const parseMetadataSchema = z.object({
  metadataXml: z.string().min(1, 'Metadata XML is required')
});

// Parses uploaded/pasted IdP metadata for prefill only - never writes to
// settings itself, so the admin can review/edit before clicking Save.
idpSettingsRouter.post('/parse-metadata', csrfProtection, (req, res, next) => {
  const parsed = parseMetadataSchema.safeParse(req.body);
  if (!parsed.success) {
    return next(ApiErrors.validation(parsed.error.issues.map((i) => i.message).join('; ')));
  }
  try {
    res.json(parseIdpMetadataXml(parsed.data.metadataXml));
  } catch (err) {
    next(err);
  }
});
