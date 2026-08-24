import { Router } from 'express';
import { sp, spCertificate, isIdpConfigured } from '../saml/spConfig';
import { generateCsrfToken } from '../middleware/csrf';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export const samlRouter = Router();

// SP metadata: give this XML (or the URL) to PingFederate when creating the
// SP Connection so it knows this app's ACS URL, entity ID, and signing cert.
samlRouter.get('/metadata', (_req, res) => {
  const metadata = sp.generateServiceProviderMetadata(spCertificate, spCertificate);
  res.type('application/xml').send(metadata);
});

// SP-initiated login: redirects the browser to PingFederate's SSO endpoint.
samlRouter.get('/login', async (req, res, next) => {
  if (!isIdpConfigured()) {
    return res.status(503).json({
      error: {
        code: 'idp_not_configured',
        message: 'PF_IDP_SSO_URL / PF_IDP_CERT are not set. Import this SP\'s metadata into PingFederate and fill in the IdP values first.'
      }
    });
  }
  try {
    const requested = req.query.redirect;
    const relayState = typeof requested === 'string' && requested.startsWith('/') ? requested : '/';
    const url = await sp.getAuthorizeUrlAsync(relayState, undefined, {});
    res.redirect(url);
  } catch (err) {
    next(err);
  }
});

// Assertion Consumer Service: PingFederate POSTs the SAML response here after
// the user authenticates.
samlRouter.post('/acs', async (req, res, next) => {
  try {
    const { profile } = await sp.validatePostResponseAsync(req.body);
    if (!profile?.nameID) {
      return res.status(401).json({ error: { code: 'saml_no_subject', message: 'Assertion did not include a subject' } });
    }

    req.session.regenerate((err) => {
      if (err) return next(err);
      try {
        req.session.user = { username: profile.nameID as string };
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
      const url = await sp.getLogoutUrlAsync({ nameID: user.username, nameIDFormat: null } as any, '/', {});
      res.redirect(url);
    });
  } catch (err) {
    next(err);
  }
});
