import { env } from '../config/env';
import { ApiErrors } from '../utils/errors';
import { logger, redactSecrets } from '../utils/logger';
import { AuthenticationPolicyTree, IdentityProvider } from '../pingfederate/IdentityProvider';

/**
 * MFA policy wiring is the highest-risk write this portal performs: it mutates
 * PingFederate's global authentication policy tree. This module is intentionally
 * isolated from the route handlers so it can be reviewed/audited on its own, and
 * it is only reachable when FEATURE_MFA_POLICY_WRITE=true.
 */

export interface WireMfaParams {
  /** Identifier of the app/policy contract this MFA branch is being added for. */
  appId: string;
  appName: string;
}

export interface WireMfaResult {
  updatedTree: AuthenticationPolicyTree;
  mfaAdapterId: string;
}

function assertFeatureEnabled() {
  if (!env.FEATURE_MFA_POLICY_WRITE) {
    throw ApiErrors.featureDisabled(
      'MFA policy wiring is disabled. Set FEATURE_MFA_POLICY_WRITE=true to enable this operation.'
    );
  }
}

function findMfaCapableAdapter(adapters: unknown[]): { id: string } | null {
  for (const raw of adapters) {
    const adapter = raw as Record<string, unknown>;
    const id = (adapter.id as string) ?? '';
    const type = ((adapter.pluginDescriptorRef as Record<string, unknown> | undefined)?.id as string) ?? '';
    if (/mfa|otp|second.?factor/i.test(id) || /mfa|otp/i.test(type)) {
      return { id };
    }
  }
  return null;
}

/** Basic structural validation before we ever consider writing the tree back. */
function validateTreeShape(tree: AuthenticationPolicyTree) {
  if (!tree || typeof tree !== 'object') {
    throw ApiErrors.validation('Authentication policy tree is missing or malformed');
  }
  if (!('rootNode' in tree)) {
    throw ApiErrors.validation('Authentication policy tree is missing rootNode');
  }
}

/**
 * Reads the current authentication policy tree, computes an updated tree that adds
 * (or references) an MFA branch for the given app, validates it, and PUTs it back.
 * Never invents a PingOne connection or an MFA adapter — both must already exist.
 */
export async function wireMfaForApp(idp: IdentityProvider, params: WireMfaParams): Promise<WireMfaResult> {
  assertFeatureEnabled();

  const pingOneConnections = await idp.listPingOneConnections();
  if (!pingOneConnections.items || pingOneConnections.items.length === 0) {
    throw ApiErrors.validation(
      'No PingOne connection is configured. Ask a platform admin to configure a PingOne connection before enabling MFA for applications.'
    );
  }

  const adapters = await idp.listIdpAdapters();
  const mfaAdapter = findMfaCapableAdapter(adapters.items ?? []);
  if (!mfaAdapter) {
    throw ApiErrors.validation(
      'No MFA-capable IdP adapter was found in PingFederate. Configure an MFA adapter before enabling MFA for applications.'
    );
  }

  const currentTree = await idp.getAuthenticationPolicies();
  validateTreeShape(currentTree);

  const updatedTree = addMfaBranch(currentTree, params, mfaAdapter.id);
  validateTreeShape(updatedTree);

  logger.info(
    {
      appId: params.appId,
      appName: params.appName,
      mfaAdapterId: mfaAdapter.id,
      before: redactSecrets(currentTree),
      after: redactSecrets(updatedTree)
    },
    'Applying MFA authentication policy update'
  );

  const written = await idp.putAuthenticationPolicies(updatedTree);
  return { updatedTree: written, mfaAdapterId: mfaAdapter.id };
}

/**
 * Adds (or updates in place) a policy fragment for this app referencing the MFA adapter.
 * Kept deliberately conservative: it appends under a dedicated "portalManagedApps" map on
 * the tree rather than attempting deep structural edits to PF's native policy graph, since
 * the exact shape of that graph is PF-version-specific and out of scope for this diff.
 */
function addMfaBranch(
  tree: AuthenticationPolicyTree,
  params: WireMfaParams,
  mfaAdapterId: string
): AuthenticationPolicyTree {
  const existingManaged = (tree.portalManagedApps as Record<string, unknown> | undefined) ?? {};
  return {
    ...tree,
    portalManagedApps: {
      ...existingManaged,
      [params.appId]: {
        appName: params.appName,
        mfaEnabled: true,
        mfaAdapterId
      }
    }
  };
}
