import "server-only";

import { randomUUID } from "node:crypto";

import { readRiskShareEntitlementAccess } from "./riskShareEntitlementAccess";
import {
  createRiskShareShadowObservation,
  type LegacyRiskShareDecision,
  type RiskShareEntitlementShadowBoundaryId,
} from "./riskShareEntitlementShadow";

const INTERNAL_TEST_TENANT_CODE = "test-risk-pack-01";
const SHADOW_LOOKUP_TIMEOUT_MS = 750;

type ObserveRuntimeShadowInput = {
  boundaryId: RiskShareEntitlementShadowBoundaryId;
  legacyDecision: LegacyRiskShareDecision;
  tenantId: string;
  tenantCode: string;
};

/**
 * Temporary, non-enforcing Runtime shadow for the approved internal test tenant.
 * The emitted observation deliberately excludes tenant identity and user/request data.
 */
export async function observeInternalTestRiskShareEntitlementShadow(
  input: ObserveRuntimeShadowInput,
): Promise<void> {
  if (input.tenantCode !== INTERNAL_TEST_TENANT_CODE) return;

  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    const evaluation = await Promise.race([
      readRiskShareEntitlementAccess({
        tenantId: input.tenantId,
        tenantCode: input.tenantCode,
      }),
      new Promise<{
        state: "lookup_failed";
        entitlementId: null;
        policyVersion: null;
      }>((resolve) => {
        timeout = setTimeout(
          () => resolve({ state: "lookup_failed", entitlementId: null, policyVersion: null }),
          SHADOW_LOOKUP_TIMEOUT_MS,
        );
      }),
    ]);

    const observation = createRiskShareShadowObservation({
      boundaryId: input.boundaryId,
      legacyDecision: input.legacyDecision,
      entitlementState: evaluation.state,
      policyVersion: evaluation.policyVersion,
      correlationId: randomUUID(),
      observedAt: new Date(),
    });

    if (observation) {
      console.info("[risk-share-entitlement-shadow]", observation);
    }
  } catch {
    // Shadow observation must never change the existing Runtime access result.
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
