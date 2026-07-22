import "server-only";

import { SupabaseReadError, selectSupabaseExportRows } from "@/lib/supabaseServer";
import {
  evaluateRiskShareEntitlementRows,
  RISK_SHARE_PRODUCT_CODE,
  type RiskShareEntitlementEvaluation,
  type RiskShareEntitlementIdentity,
} from "@/lib/risk-share/riskShareEntitlementEvaluation";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const COMPANY_CODE_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;

type EntitlementLookupRow = {
  id?: unknown;
  tenant_id?: unknown;
  tenant_code?: unknown;
  product_code?: unknown;
  status?: unknown;
  policy_version?: unknown;
  effective_at?: unknown;
  expires_at?: unknown;
};

export type ReadRiskShareEntitlementResult =
  | RiskShareEntitlementEvaluation
  | {
      state: "lookup_failed";
      entitlementId: null;
      policyVersion: null;
      failureClass: "missing_config" | "upstream_error";
    };

/**
 * Read-only factual entitlement lookup. Callers must supply the exact
 * server-derived tenant_registry id/code pair. This reader does not check
 * tenant lifecycle, membership, site profile, or any Runtime allow policy.
 */
export async function readRiskShareEntitlementAccess(
  identity: RiskShareEntitlementIdentity,
  now = new Date(),
): Promise<ReadRiskShareEntitlementResult> {
  if (
    !UUID_PATTERN.test(identity.tenantId) ||
    !COMPANY_CODE_PATTERN.test(identity.tenantCode)
  ) {
    return {
      state: "invalid_response",
      entitlementId: null,
      policyVersion: null,
    };
  }

  const query = new URLSearchParams({
    select:
      "id,tenant_id,tenant_code,product_code,status,policy_version,effective_at,expires_at",
    tenant_id: `eq.${identity.tenantId}`,
    tenant_code: `eq.${identity.tenantCode}`,
    product_code: `eq.${RISK_SHARE_PRODUCT_CODE}`,
    limit: "2",
  });

  try {
    const rows = await selectSupabaseExportRows<EntitlementLookupRow>(
      "tenant_product_entitlements",
      query,
    );
    return evaluateRiskShareEntitlementRows(rows, identity, now);
  } catch (error) {
    return {
      state: "lookup_failed",
      entitlementId: null,
      policyVersion: null,
      failureClass:
        error instanceof SupabaseReadError &&
        error.statusText === "missing_supabase_server_config"
          ? "missing_config"
          : "upstream_error",
    };
  }
}
