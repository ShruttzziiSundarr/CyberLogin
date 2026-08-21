import { env } from '../config/env';
import { RuntimeOAuthEndpoints, RuntimeSamlEndpoints } from '../types';

function base(): string {
  return env.PF_RUNTIME_BASE_URL.replace(/\/+$/, '');
}

export function computeOAuthRuntimeEndpoints(): RuntimeOAuthEndpoints {
  const b = base();
  return {
    discovery: `${b}/.well-known/openid-configuration`,
    authorization: `${b}/as/authorization.oauth2`,
    token: `${b}/as/token.oauth2`,
    userinfo: `${b}/idp/userinfo.openid`,
    jwks: `${b}/pf/JWKS`,
    introspection: `${b}/as/introspect.oauth2`,
    revocation: `${b}/as/revoke_token.oauth2`
  };
}

export function computeSamlRuntimeEndpoints(entityId: string): RuntimeSamlEndpoints {
  const b = base();
  return {
    sso: `${b}/idp/SSO.saml2`,
    slo: `${b}/idp/SLO.saml2`,
    metadata: `${b}/pf/federation_metadata.ping?PartnerSpId=${encodeURIComponent(entityId)}`
  };
}
