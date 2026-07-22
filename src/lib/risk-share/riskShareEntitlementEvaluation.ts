export const RISK_SHARE_PRODUCT_CODE = "risk_share" as const;

export type RiskShareEntitlementState =
  | "active_effective"
  | "entitlement_missing"
  | "pending"
  | "not_yet_effective"
  | "suspended"
  | "expired"
  | "terminated"
  | "lookup_failed"
  | "invalid_response";

export type RiskShareEntitlementEvaluation = {
  state: Exclude<RiskShareEntitlementState, "lookup_failed">;
  entitlementId: string | null;
  policyVersion: number | null;
};

export type RiskShareEntitlementIdentity = {
  tenantId: string;
  tenantCode: string;
};

type EntitlementRow = Record<string, unknown>;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseTimestamp(value: unknown): number | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function invalidResponse(): RiskShareEntitlementEvaluation {
  return {
    state: "invalid_response",
    entitlementId: null,
    policyVersion: null,
  };
}

/**
 * Evaluates only the entitlement row's objective lifecycle and time state.
 * It does not decide whether any Runtime read or mutation is allowed.
 */
export function evaluateRiskShareEntitlementRows(
  rows: readonly EntitlementRow[],
  expectedIdentity: RiskShareEntitlementIdentity,
  now: Date,
): RiskShareEntitlementEvaluation {
  if (rows.length === 0) {
    return {
      state: "entitlement_missing",
      entitlementId: null,
      policyVersion: null,
    };
  }

  if (rows.length !== 1 || !Number.isFinite(now.getTime())) {
    return invalidResponse();
  }

  const row = rows[0];
  const entitlementId = typeof row.id === "string" ? row.id : "";
  const tenantId = typeof row.tenant_id === "string" ? row.tenant_id : "";
  const tenantCode = typeof row.tenant_code === "string" ? row.tenant_code : "";
  const productCode = typeof row.product_code === "string" ? row.product_code : "";
  const status = typeof row.status === "string" ? row.status : "";
  const policyVersion = row.policy_version;

  if (
    !UUID_PATTERN.test(entitlementId) ||
    tenantId !== expectedIdentity.tenantId ||
    tenantCode !== expectedIdentity.tenantCode ||
    productCode !== RISK_SHARE_PRODUCT_CODE ||
    !Number.isInteger(policyVersion) ||
    (policyVersion as number) < 1
  ) {
    return invalidResponse();
  }

  const base = {
    entitlementId,
    policyVersion: policyVersion as number,
  };

  if (status === "pending") return { state: "pending", ...base };
  if (status === "suspended") return { state: "suspended", ...base };
  if (status === "expired") return { state: "expired", ...base };
  if (status === "terminated") return { state: "terminated", ...base };
  if (status !== "active") return invalidResponse();

  const effectiveAt = parseTimestamp(row.effective_at);
  if (effectiveAt === null) return invalidResponse();

  const expiresAt = row.expires_at === null ? null : parseTimestamp(row.expires_at);
  if (row.expires_at !== null && expiresAt === null) return invalidResponse();
  if (expiresAt !== null && expiresAt <= effectiveAt) return invalidResponse();
  if (effectiveAt > now.getTime()) return { state: "not_yet_effective", ...base };
  if (expiresAt !== null && expiresAt <= now.getTime()) return { state: "expired", ...base };

  return { state: "active_effective", ...base };
}
