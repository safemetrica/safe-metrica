import "server-only";

import { randomUUID } from "node:crypto";

import { readRiskShareEntitlementAccess } from "./riskShareEntitlementAccess";
import {
  createRiskShareShadowObservation,
  type LegacyRiskShareDecision,
  type RiskShareEntitlementShadowBoundaryId,
} from "./riskShareEntitlementShadow";

const INTERNAL_TEST_TENANT_CODE = "test-risk-pack-01";
// Internal-test-only shadow reads have shown intermittent success/timeout pairs
// in Production. Keep the observation bounded without retrying or affecting the
// legacy access decision, while allowing one normal upstream latency spike.
const SHADOW_LOOKUP_TIMEOUT_MS = 1_500;

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
        failureClass: "timeout";
      }>((resolve) => {
        timeout = setTimeout(
          () => resolve({
            state: "lookup_failed",
            entitlementId: null,
            policyVersion: null,
            failureClass: "timeout",
          }),
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
      failureClass: evaluation.state === "lookup_failed" ? evaluation.failureClass : null,
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
