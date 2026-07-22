import type { RiskShareEntitlementState } from "./riskShareEntitlementEvaluation";

export type LegacyRiskShareDecision = "allow" | "deny" | "error";
export type RiskShareShadowClass =
  | "match_allow"
  | "match_deny"
  | "legacy_allow_entitlement_missing"
  | "legacy_allow_entitlement_inactive"
  | "legacy_deny_entitlement_active"
  | "lookup_failed"
  | "invalid_response"
  | "legacy_error";

export type RiskShareShadowObservation = {
  boundaryId: string;
  legacyDecision: LegacyRiskShareDecision;
  entitlementState: RiskShareEntitlementState;
  comparisonClass: RiskShareShadowClass;
  policyVersion: number | null;
  correlationId: string;
  observedAt: string;
};

export function classifyRiskShareEntitlementShadow(
  legacyDecision: LegacyRiskShareDecision,
  entitlementState: RiskShareEntitlementState,
): RiskShareShadowClass {
  if (legacyDecision === "error") return "legacy_error";
  if (entitlementState === "lookup_failed") return "lookup_failed";
  if (entitlementState === "invalid_response") return "invalid_response";
  if (legacyDecision === "allow") {
    if (entitlementState === "active_effective") return "match_allow";
    if (entitlementState === "entitlement_missing") return "legacy_allow_entitlement_missing";
    return "legacy_allow_entitlement_inactive";
  }
  return entitlementState === "active_effective"
    ? "legacy_deny_entitlement_active"
    : "match_deny";
}

export function createRiskShareShadowObservation(input: {
  boundaryId: string;
  legacyDecision: LegacyRiskShareDecision;
  entitlementState: RiskShareEntitlementState;
  policyVersion: number | null;
  correlationId: string;
  observedAt: Date;
}): RiskShareShadowObservation | null {
  if (!/^[a-z0-9][a-z0-9_.-]{0,63}$/.test(input.boundaryId)) return null;
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(input.correlationId)) return null;
  if (!Number.isFinite(input.observedAt.getTime())) return null;
  return {
    boundaryId: input.boundaryId,
    legacyDecision: input.legacyDecision,
    entitlementState: input.entitlementState,
    comparisonClass: classifyRiskShareEntitlementShadow(
      input.legacyDecision,
      input.entitlementState,
    ),
    policyVersion: input.policyVersion,
    correlationId: input.correlationId,
    observedAt: input.observedAt.toISOString(),
  };
}
