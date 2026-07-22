import type { RiskShareEntitlementState } from "./riskShareEntitlementEvaluation";

export const RISK_SHARE_ENTITLEMENT_SHADOW_BOUNDARIES = [
  { id: "saas.manager.page", kind: "authenticated_read", priority: "high" },
  { id: "saas.monthly.page", kind: "authenticated_read", priority: "medium" },
  { id: "saas.publish.mutation", kind: "authenticated_mutation", priority: "critical" },
  { id: "saas.preparation.mutation", kind: "authenticated_mutation", priority: "high" },
  { id: "saas.share_review.mutation", kind: "authenticated_mutation", priority: "high" },
  { id: "public.participation.submit", kind: "public_mutation", priority: "critical" },
  { id: "public.anonymous.submit", kind: "public_mutation", priority: "critical" },
  { id: "public.visitor.submit", kind: "public_mutation", priority: "critical" },
  { id: "public.representative.submit", kind: "public_mutation", priority: "critical" },
  { id: "legacy.manager.page", kind: "legacy_read", priority: "high" },
  { id: "legacy.field_participation.submit", kind: "legacy_mutation", priority: "critical" },
] as const;

export type RiskShareEntitlementShadowBoundaryId =
  (typeof RISK_SHARE_ENTITLEMENT_SHADOW_BOUNDARIES)[number]["id"];

const RISK_SHARE_ENTITLEMENT_SHADOW_BOUNDARY_IDS = new Set<string>(
  RISK_SHARE_ENTITLEMENT_SHADOW_BOUNDARIES.map((boundary) => boundary.id),
);

/** Static inventory only: no reader, logger, metric client, or access policy. */
export function isRiskShareEntitlementShadowBoundaryId(
  value: string,
): value is RiskShareEntitlementShadowBoundaryId {
  return RISK_SHARE_ENTITLEMENT_SHADOW_BOUNDARY_IDS.has(value);
}

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
  boundaryId: RiskShareEntitlementShadowBoundaryId;
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
  if (!isRiskShareEntitlementShadowBoundaryId(input.boundaryId)) return null;
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
