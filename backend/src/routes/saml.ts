import { Router } from 'express';
import { getSamlClient, spCertificate, isIdpConfigured } from '../saml/spConfig';
import { getSamlSettings } from '../saml/samlSettings';
import { generateCsrfToken } from '../middleware/csrf';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export const samlRouter = Router();

// SP metadata: give this XML (or the URL) to PingFederate when creating the
// SP Connection so it knows this app's ACS URL, entity ID, and signing cert.
samlRouter.get('/metadata', (_req, res) => {
  const metadata = getSamlClient().generateServiceProviderMetadata(spCertificate, spCertificate);
  res.type('application/xml').send(metadata);
});

// SP-initiated login: redirects the browser to PingFederate's SSO endpoint.
samlRouter.get('/login', async (req, res, next) => {
  if (!isIdpConfigured()) {
    return res.status(503).json({
      error: {
        code: 'idp_not_configured',
        message: 'The IdP SSO URL / certificate are not set. Import this SP\'s metadata into your IdP and fill in the IdP values on the SSO settings page first.'
      }
    });
  }
  try {
    const requested = req.query.redirect;
    const relayState = typeof requested === 'string' && requested.startsWith('/') ? requested : '/';
    const url = await getSamlClient().getAuthorizeUrlAsync(relayState, undefined, {});
    res.redirect(url);
  } catch (err) {
    next(err);
  }
});

// Assertion Consumer Service: PingFederate POSTs the SAML response here after
// the user authenticates.
samlRouter.post('/acs', async (req, res, next) => {
  try {
    const { profile } = await getSamlClient().validatePostResponseAsync(req.body);
    if (!profile?.nameID) {
      // The response validated (signature/issuer/etc. all checked out), but the
      // assertion itself carries no usable Subject/NameID - almost always means
      // the IdP's SP connection never had SAML_SUBJECT mapped in its attribute
      // contract fulfillment, or the NameID was sent encrypted (EncryptedID)
      // rather than plain, which this library does not decrypt. Log everything
      // node-saml did manage to parse so it's possible to tell which.
      logger.warn(
        { profile, assertionXml: profile?.getAssertionXml?.(), responseXml: profile?.getSamlResponseXml?.() },
        'SAML assertion had no Subject/NameID'
      );
      return res.status(401).json({ error: { code: 'saml_no_subject', message: 'Assertion did not include a subject' } });
    }

    const { requiredAttributes } = getSamlSettings();
    const missingAttributes = requiredAttributes.filter((name) => {
      const value = profile[name];
      return value === undefined || value === null || value === '';
    });
    if (missingAttributes.length > 0) {
      logger.warn({ nameID: profile.nameID, missingAttributes }, 'SAML assertion missing required attributes');
      return res.status(401).json({
        error: {
          code: 'saml_missing_attributes',
          message: `Assertion is missing required attribute(s): ${missingAttributes.join(', ')}`
        }
      });
    }
    const attributes = Object.fromEntries(requiredAttributes.map((name) => [name, profile[name]]));

    req.session.regenerate((err) => {
      if (err) return next(err);
      try {
        req.session.user = { username: profile.nameID as string, attributes };
        // The frontend recovers the session + a fresh CSRF token via GET /api/auth/session
        // once it lands on this redirect (same pattern as a page reload). overwrite: the
        // session ID just changed, so any stale CSRF cookie must not be reused/validated.
        generateCsrfToken(req, res, true);
        const relayState = req.body.RelayState;
        const redirectTo = typeof relayState === 'string' && relayState.startsWith('/') ? relayState : '/';
        logger.info({ nameID: profile.nameID }, 'SAML SSO login succeeded');
        res.redirect(`${env.FRONTEND_BASE_URL}${redirectTo}`);
      } catch (csrfErr) {
        next(csrfErr);
      }
    });
  } catch (err) {
    logger.warn({ err }, 'SAML assertion validation failed');
    res.redirect(`${env.FRONTEND_BASE_URL}/login?error=saml_invalid_response`);
  }
});

// SP-initiated single logout, redirecting to PingFederate's SLO endpoint.
samlRouter.get('/slo', async (req, res, next) => {
  if (!isIdpConfigured()) {
    return res.status(503).json({ error: { code: 'idp_not_configured', message: 'IdP SLO endpoint not configured' } });
  }
  const user = req.session.user;
  try {
    req.session.destroy(async (err) => {
      if (err) return next(err);
      res.clearCookie('connect.sid');
      if (!user) {
        return res.redirect('/');
      }
      const url = await getSamlClient().getLogoutUrlAsync({ nameID: user.username, nameIDFormat: null } as any, '/', {});
      res.redirect(url);
    });
  } catch (err) {
    next(err);
  }
});
