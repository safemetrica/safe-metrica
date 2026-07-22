import assert from "node:assert/strict";
import fs from "node:fs";
import {
  evaluateRiskShareEntitlementRows,
} from "../src/lib/risk-share/riskShareEntitlementEvaluation.ts";

const readerPath = "src/lib/risk-share/riskShareEntitlementAccess.ts";
const reader = fs.readFileSync(readerPath, "utf8");
const identity = {
  tenantId: "11111111-1111-4111-8111-111111111111",
  tenantCode: "test-tenant",
};
const now = new Date("2026-07-22T00:00:00.000Z");
const baseRow = {
  id: "22222222-2222-4222-8222-222222222222",
  tenant_id: identity.tenantId,
  tenant_code: identity.tenantCode,
  product_code: "risk_share",
  status: "active",
  policy_version: 1,
  effective_at: "2026-07-21T00:00:00.000Z",
  expires_at: null,
};

const evaluate = (rows) => evaluateRiskShareEntitlementRows(rows, identity, now).state;

const evaluationCases = [
  ["active_effective", [baseRow], "active_effective"],
  ["entitlement_missing", [], "entitlement_missing"],
  ["pending", [{ ...baseRow, status: "pending", effective_at: null }], "pending"],
  ["not_yet_effective", [{ ...baseRow, effective_at: "2026-07-23T00:00:00.000Z" }], "not_yet_effective"],
  ["suspended", [{ ...baseRow, status: "suspended" }], "suspended"],
  ["expired status", [{ ...baseRow, status: "expired" }], "expired"],
  ["expired by time", [{ ...baseRow, expires_at: "2026-07-22T00:00:00.000Z" }], "expired"],
  ["terminated", [{ ...baseRow, status: "terminated" }], "terminated"],
  ["cross-tenant id", [{ ...baseRow, tenant_id: "33333333-3333-4333-8333-333333333333" }], "invalid_response"],
  ["cross-tenant code", [{ ...baseRow, tenant_code: "other-tenant" }], "invalid_response"],
  ["product substitution", [{ ...baseRow, product_code: "other" }], "invalid_response"],
  ["duplicate response", [baseRow, baseRow], "invalid_response"],
  ["malformed active time", [{ ...baseRow, effective_at: null }], "invalid_response"],
];

for (const [name, rows, expected] of evaluationCases) {
  const actual = evaluate(rows);
  console.log(`${actual === expected ? "PASS" : "FAIL"} pure evaluation: ${name}`);
  assert.equal(actual, expected);
}

const readerChecks = [
  ["server-only boundary", reader.startsWith('import "server-only";')],
  ["read-only shared SELECT helper", reader.includes("selectSupabaseExportRows<EntitlementLookupRow>")],
  ["fixed entitlement table", reader.includes('"tenant_product_entitlements"')],
  ["fixed risk_share product", reader.includes('product_code: `eq.${RISK_SHARE_PRODUCT_CODE}`')],
  ["composite tenant filters", reader.includes('tenant_id: `eq.${identity.tenantId}`') && reader.includes('tenant_code: `eq.${identity.tenantCode}`')],
  ["duplicate detection fetch limit", reader.includes('limit: "2"')],
  ["lookup failures stay distinct", reader.includes('state: "lookup_failed"')],
  ["missing config classified without secret values", reader.includes('failureClass:') && reader.includes('"missing_config"')],
  ["upstream failures classified without error payload", reader.includes('"upstream_error"')],
  ["no write or RPC boundary", !/\b(POST|PATCH|PUT|DELETE)\b/.test(reader) && !/\/rest\/v1\/rpc\//.test(reader)],
  ["no service_mode fallback", !/service_mode|serviceMode/.test(reader)],
  ["no tenant, membership, site, or historical policy", !/from ["'][^"']*(tenantRegistry|tenantMembership|tenantSite)/i.test(reader) && !/historical_authenticated_read|current_public_read/.test(reader)],
];

for (const [name, ok] of readerChecks) {
  console.log(`${ok ? "PASS" : "FAIL"} server lookup: ${name}`);
  assert.equal(ok, true, name);
}

console.log("PASS risk share entitlement access reader contract");
