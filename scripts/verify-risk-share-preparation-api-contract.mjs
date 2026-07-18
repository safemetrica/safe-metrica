import fs from "node:fs";

const ROUTE_FILE = "src/app/api/risk-share/manager/preparation/route.ts";
const LIB_FILE = "src/lib/supabaseServer.ts";

for (const file of [ROUTE_FILE, LIB_FILE]) {
  if (!fs.existsSync(file)) {
    console.error(`FAIL: missing file - ${file}`);
    process.exit(1);
  }
}

const route = fs.readFileSync(ROUTE_FILE, "utf8");
const lib = fs.readFileSync(LIB_FILE, "utf8");

const checks = [];

function check(name, ok) {
  checks.push({ name, ok: Boolean(ok) });
}

// ---------------------------------------------------------------------
// A. Request validation
// ---------------------------------------------------------------------

check(
  "object root required (non-object/array root rejected)",
  route.includes('typeof raw !== "object" || Array.isArray(raw)'),
);
check(
  "unknown body key rejected via allowlist",
  route.includes("ALLOWED_BODY_FIELDS.has(key)"),
);

const forbiddenFields = [
  "company",
  "companyCode",
  "tenantCode",
  "tenantId",
  "actorMembershipId",
  "membershipId",
  "userId",
  "email",
  "role",
  "actorRole",
  "policyVersion",
  "correlationId",
  "serviceRoleKey",
  "supabaseServiceRoleKey",
  "authorization",
  "credential",
  "workerVisible",
  "customerConfirmed",
  "shareStatus",
  "customerCheckStatus",
  "versionLockId",
];

for (const field of forbiddenFields) {
  check(
    `forbidden field rejected: ${field}`,
    new RegExp(`["']${field}["']`).test(route.match(/FORBIDDEN_BODY_FIELDS = \[[\s\S]*?\] as const;/)?.[0] ?? ""),
  );
}

check(
  "invalid sourceId rejected (UUID pattern check)",
  route.includes("UUID_PATTERN.test(sourceId)"),
);
check(
  "idempotencyKey missing/non-string rejected",
  route.includes('typeof idempotencyKeyRaw !== "string"'),
);
check(
  "idempotencyKey trimmed exactly once before length check",
  route.includes("idempotencyKeyRaw.trim()") && route.includes("idempotencyKey.length < 1 || idempotencyKey.length > 200"),
);
check(
  "candidateIds omitted/null rejected (non-array check)",
  route.includes("!Array.isArray(candidateIdsRaw)"),
);
check(
  "candidateIds empty array rejected",
  route.includes("candidateIdsRaw.length < 1"),
);
check(
  "candidateIds over-200 rejected",
  route.includes("candidateIdsRaw.length") && route.includes("> MAX_CANDIDATE_IDS") && route.includes("MAX_CANDIDATE_IDS = 200"),
);
check(
  "non-string / null candidateIds element rejected",
  route.includes('typeof rawId !== "string" || !UUID_PATTERN.test(rawId)'),
);
check(
  "duplicate candidateIds rejected, case-insensitive comparison",
  route.includes("rawId.toLowerCase()") && route.includes("seenCandidateIds.has(normalizedId)"),
);
check(
  "16KB body size contract present (content-length and actual byte length)",
  route.includes("MAX_BODY_BYTES = 16 * 1024") &&
    route.includes('request.headers.get("content-length")') &&
    route.includes('Buffer.byteLength(rawBodyText, "utf8")'),
);
check(
  "policyVersion cannot be supplied by client (forbidden field + hardcoded p_policy_version)",
  /["']policyVersion["']/.test(route) && lib.includes("p_policy_version: 1,"),
);
check(
  "p_candidate_ids is never sent as null (always explicit array, non-empty enforced)",
  lib.includes("p_candidate_ids: params.candidateIds,") &&
    lib.includes("params.candidateIds.length === 0") &&
    !/p_candidate_ids:\s*null/.test(lib),
);

// ---------------------------------------------------------------------
// B. Authorization wiring
// ---------------------------------------------------------------------

check(
  "current-session tenant access guard is used",
  route.includes("requireTenantAccessForCurrentSession("),
);
check(
  "only tenant_admin and tenant_manager allowed",
  route.includes('allowedRoles: ["tenant_admin", "tenant_manager"]'),
);
check(
  "owner_internal is not in the allowed role set",
  !route.includes('"owner_internal"'),
);
check(
  "defensive re-check of tenant/role after guard call",
  route.includes("selectedTenantCode !== tenantCode") &&
    route.includes('role !== "tenant_admin" && role !== "tenant_manager"'),
);
check(
  "membershipId derived only from server-side tenant access context",
  route.includes("tenantAccessResult.context.membership.membershipId"),
);
check(
  "companyCode/membershipId/role never read from parsed body",
  !/validatedBody\.(companyCode|membershipId|role|actorMembershipId)/.test(route),
);
check(
  "cross-site / same-origin protection present",
  route.includes("isCrossSiteRequest(request)") &&
    route.includes('request.headers.get("sec-fetch-site")') &&
    route.includes('secFetchSite === "cross-site"'),
);
check(
  "active Risk Share tenant resolver is used",
  route.includes("resolveActiveRiskSharePublicTenant("),
);
check(
  "unauthenticated maps to 401 forbidden",
  route.includes('tenantAccessResult.reason === "unauthenticated"') && route.includes('jsonError(401, "forbidden")'),
);

// ---------------------------------------------------------------------
// C. RPC wiring
// ---------------------------------------------------------------------

check(
  "exact RPC name used",
  lib.includes("/rest/v1/rpc/prepare_risk_share_items_for_tenant"),
);
check(
  "policy version fixed to 1 in the RPC payload",
  lib.includes("p_policy_version: 1,"),
);
check(
  "verified company code (selectedTenantCode) passed through, not a raw body field",
  route.includes("companyCode: selectedTenantCode,"),
);
check(
  "server-derived membership ID passed to the RPC helper",
  route.includes("actorMembershipId,") && route.includes("const actorMembershipId = tenantAccessResult.context.membership.membershipId;"),
);
check(
  "explicit candidate UUID array passed to the RPC helper",
  route.includes("candidateIds: validatedBody.candidateIds,"),
);
check(
  "service-role key only read server-side via getSupabaseServiceRoleKey",
  lib.includes("getSupabaseServiceRoleKey()") && lib.includes('import "server-only"'),
);
check(
  "no direct INSERT/UPDATE/PATCH/DELETE/UPSERT against risk_share_items or risk_share_preparation_decisions in the new helper",
  (() => {
    const start = lib.indexOf("export async function prepareRiskShareItemsForTenant");
    if (start === -1) return false;
    const body = lib.slice(start);
    const writeVerbPattern = /\/rest\/v1\/(risk_share_items|risk_share_preparation_decisions|risk_share_item_candidates|risk_share_version_locks)/;
    return !writeVerbPattern.test(body);
  })(),
);

// ---------------------------------------------------------------------
// D. Response contract
// ---------------------------------------------------------------------

check(
  "raw RPC result is not returned outward (results are remapped, not passed through)",
  route.includes("results: result.results.map((row) => ({") &&
    route.includes("candidateId: row.candidateId,") &&
    route.includes("resultCode: row.resultCode,"),
);
check(
  "itemId omitted from outward result mapping",
  (() => {
    const start = route.indexOf("results: result.results.map((row) => ({");
    if (start === -1) return false;
    const end = route.indexOf("}));", start);
    const block = route.slice(start, end === -1 ? undefined : end);
    return !block.includes("itemId");
  })(),
);
check(
  "decisionId omitted from outward result mapping",
  (() => {
    const start = route.indexOf("results: result.results.map((row) => ({");
    if (start === -1) return false;
    const end = route.indexOf("}));", start);
    const block = route.slice(start, end === -1 ? undefined : end);
    return !block.includes("decisionId");
  })(),
);
check(
  "all known structural result codes handled in the HTTP mapping switch",
  ["forbidden", "source_not_found", "invalid_request", "too_many_candidates", "request_failed", "invalid_response"].every(
    (code) => route.includes(`case "${code}":`) || route.includes(`case "${code}"\n`),
  ),
);
check(
  "unknown/malformed RPC response becomes invalid_response",
  lib.includes('console.error("[prepare-risk-share-items-rpc] unexpected response shape"') &&
    lib.includes('return failClosed("invalid_response");'),
);
check(
  "structural failure single-row mapping is explicit and distinct from per-candidate rows",
  lib.includes("PREPARE_RISK_SHARE_ITEMS_STRUCTURAL_CODES.has(resultCode)") &&
    lib.includes("data.length === 1"),
);
check(
  "mixed candidate outcomes preserved in a results array under one HTTP 200",
  route.includes('{ status: 200 }') && route.includes("results: result.results.map"),
);
check(
  "summary counters derived from validated rows via a switch over resultCode",
  route.includes("for (const row of result.results) {") && route.includes("switch (row.resultCode) {"),
);
check(
  "owner_exception_required preserved as a distinct decision, not folded into success-only wording",
  route.includes('summary.ownerExceptionRequired += 1;') && lib.includes('"owner_exception_required"'),
);
check(
  "candidate result rows validated against the requested candidateIds set (completeness + no foreign rows)",
  lib.includes("requestedIdSet.has(candidateId)") && lib.includes("results.length !== requestedIdSet.size"),
);
check(
  "duplicate candidate_id rows rejected in the RPC response validator",
  lib.includes("seenCandidateIds.has(candidateId)"),
);
check(
  "response row count over 200 rejected",
  lib.includes("data.length > PREPARE_RISK_SHARE_ITEMS_MAX_CANDIDATES"),
);
check(
  "auto_prepared requires a valid item_id and decision_id (created/replayed linkage check)",
  lib.includes('if (decision === "auto_prepared") {') &&
    lib.includes("!isPrepareRiskShareItemsUuid(itemIdRaw)"),
);
check(
  "owner_exception_required rejects a populated item_id",
  lib.includes("if (itemIdRaw !== null) {"),
);

// ---------------------------------------------------------------------
// E. Log safety
// ---------------------------------------------------------------------

check(
  "no raw idempotencyKey logging (only requestedCandidateCount / length-style metadata logged)",
  !/console\.(error|log|warn)\([^)]*idempotencyKey/i.test(lib) &&
    !/console\.(error|log|warn)\([^)]*idempotencyKey/i.test(route),
);
check(
  "no raw candidateIds array logging (only counts)",
  !/console\.(error|log|warn)\([\s\S]{0,200}candidateIds[\s\S]{0,80}\)/i.test(route) &&
    lib.includes("requestedCandidateCount: params.candidateIds.length,"),
);
check(
  "no sourceId/tenant code/membership ID logging",
  (() => {
    const start = lib.indexOf("export async function prepareRiskShareItemsForTenant");
    if (start === -1) return false;
    const newHelperSource = lib.slice(start);
    return !/console\.(error|log|warn)\([\s\S]{0,300}(sourceId|companyCode|tenantCode|actorMembershipId)[\s\S]{0,120}\)/i.test(
      newHelperSource,
    );
  })(),
);
check(
  "no task_name/hazard logging (route never reads candidate content at all)",
  !/task_name|hazard/i.test(route),
);
check(
  "errors are redacted via the existing shared scrubber before logging",
  lib.includes("scrubSupabaseRpcErrorMessage(rawMessage)"),
);
check(
  "error responses never include results/backend message fields",
  route.includes('function jsonError(status: number, code: string) {') &&
    route.includes("NextResponse.json({ ok: false, code }, { status })"),
);

// ---------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------

const failed = checks.filter((c) => !c.ok);

for (const c of checks) {
  console.log(`${c.ok ? "PASS" : "FAIL"}: ${c.name}`);
}

console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);

if (failed.length > 0) {
  console.error(`\nFAILED CHECKS (${failed.length}):`);
  for (const c of failed) {
    console.error(`  - ${c.name}`);
  }
  process.exit(1);
}

console.log("\nAll risk-share preparation API contract checks passed.");
