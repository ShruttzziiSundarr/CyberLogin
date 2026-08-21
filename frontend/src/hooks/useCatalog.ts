import { useQuery } from '@tanstack/react-query';
import { getOAuthAtms, getOidcPolicies, getSigningKeys } from '../lib/api';

export function useOAuthAtms() {
  return useQuery({ queryKey: ['catalog', 'oauth-atms'], queryFn: getOAuthAtms });
}

export function useOidcPolicies() {
  return useQuery({ queryKey: ['catalog', 'oidc-policies'], queryFn: getOidcPolicies });
}

export function useSigningKeys() {
  return useQuery({ queryKey: ['catalog', 'signing-keys'], queryFn: getSigningKeys });
}
