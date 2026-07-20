import fs from "node:fs";

const ROUTE_FILE = "src/app/api/risk-share/manager/publish/route.ts";
const HELPER_FILE = "src/lib/risk-share/riskShareTenantPublish.ts";
const PACKAGE_FILE = "package.json";

for (const file of [ROUTE_FILE, HELPER_FILE, PACKAGE_FILE]) {
  if (!fs.existsSync(file)) {
    console.error(`FAIL: missing file - ${file}`);
    process.exit(1);
  }
}

const route = fs.readFileSync(ROUTE_FILE, "utf8");
const helper = fs.readFileSync(HELPER_FILE, "utf8");
const packageJson = JSON.parse(fs.readFileSync(PACKAGE_FILE, "utf8"));
const checks = [];

function check(name, ok) {
  checks.push({ name, ok: Boolean(ok) });
}

function sourceBlock(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  if (start === -1) return "";
  const end = source.indexOf(endMarker, start + startMarker.length);
  return source.slice(start, end === -1 ? undefined : end);
}

// A. Exact request contract and bounded input.
check("route file exists", fs.existsSync(ROUTE_FILE));
check("helper file exists", fs.existsSync(HELPER_FILE));
check("route is dynamic", route.includes('export const dynamic = "force-dynamic"'));
check("route disables revalidation", route.includes("export const revalidate = 0"));
check(
  "plain object body required",
  route.includes('typeof raw !== "object" || Array.isArray(raw)'),
);
check("unknown body keys rejected", route.includes("ALLOWED_BODY_FIELDS.has(key)"));

const allowedFields = [
  "lockMonth", "lockTitle", "notes", "itemIds",
  "expectedReviewRevisions", "idempotencyKey",
];
const allowedBlock = sourceBlock(route, "const ALLOWED_BODY_FIELDS = new Set([", "]);");
for (const field of allowedFields) {
  check(`allowed field: ${field}`, allowedBlock.includes(`"${field}"`));
}
check(
  "allowlist has exactly six entries",
  (allowedBlock.match(/"[A-Za-z]+"/g) ?? []).length === 6,
);

const forbiddenFields = [
  "company", "companyCode", "tenantCode", "tenantId",
  "actorMembershipId", "membershipId", "userId", "email", "role", "actorRole",
  "serviceRoleKey", "supabaseServiceRoleKey", "authorization", "credential",
  "workerVisible", "customerConfirmed", "customerCheckStatus", "shareStatus",
  "versionLockId", "lockedBy", "publishAction", "previousVersionId",
  "contentSourceVersionId", "supersededAt", "itemCount", "workerVisibleCount",
];
const forbiddenBlock = sourceBlock(
  route,
  "const FORBIDDEN_BODY_FIELDS = [",
  "] as const;",
);
for (const field of forbiddenFields) {
  check(`forbidden field: ${field}`, forbiddenBlock.includes(`"${field}"`));
}
check("forbidden presence is rejected", route.includes("forbiddenField in body"));
check(
  "16KB header and actual-byte body cap",
  route.includes("MAX_BODY_BYTES = 16 * 1024") &&
    route.includes('request.headers.get("content-length")') &&
    route.includes('Buffer.byteLength(rawBodyText, "utf8")'),
);
check(
  "exact valid YYYY-MM required",
  route.includes("LOCK_MONTH_PATTERN") &&
    route.includes("(0[1-9]|1[0-2])") &&
    route.includes("LOCK_MONTH_PATTERN.test(lockMonth)"),
);
check(
  "lock title trim and 1-160 bound",
  route.includes("lockTitleRaw.trim()") &&
    route.includes("lockTitle.length < 1") &&
    route.includes("lockTitle.length > 160"),
);
check("lock title control chars rejected", route.includes("CONTROL_CHARACTER_PATTERN.test(lockTitle)"));
check(
  "notes omitted/null allowed and blank normalized",
  route.includes("body.notes !== undefined && body.notes !== null") &&
    route.includes("notes = normalizedNotes || null"),
);
check(
  "notes max 500 and control chars rejected",
  route.includes("normalizedNotes.length > 500") &&
    route.includes("CONTROL_CHARACTER_PATTERN.test(normalizedNotes)"),
);
check(
  "idempotency key trim and 1-200 bound",
  route.includes("idempotencyKeyRaw.trim()") &&
    route.includes("idempotencyKey.length < 1 || idempotencyKey.length > 200"),
);
check("itemIds must be array", route.includes("!Array.isArray(itemIdsRaw)"));
check(
  "revision array required and paired by length",
  route.includes("!Array.isArray(expectedReviewRevisionsRaw)") &&
    route.includes("expectedReviewRevisionsRaw.length !== itemIdsRaw.length"),
);
check(
  "revision decimal strings validated without number conversion",
  route.includes('typeof rawRevision !== "string"') &&
    route.includes('!/^[1-9][0-9]*$/.test(rawRevision)') &&
    route.includes('BigInt(rawRevision) > BigInt("9223372036854775807")'),
);
check(
  "explicit item selection 1-200",
  route.includes("itemIdsRaw.length < 1") &&
    route.includes("itemIdsRaw.length > MAX_ITEM_IDS") &&
    route.includes("MAX_ITEM_IDS = 200"),
);
check(
  "item UUID validation",
  route.includes('typeof rawItemId !== "string" || !UUID_PATTERN.test(rawItemId)'),
);
check(
  "case-insensitive duplicate item rejection",
  route.includes("rawItemId.toLowerCase()") &&
    route.includes("seenItemIds.has(normalizedItemId)"),
);
check(
  "bulk-all mode absent",
  !/itemIds\s*:\s*null/.test(route) && !/p_item_ids\s*:\s*null/.test(helper),
);

// B. Same-origin, session, tenant and role boundary.
check(
  "sec-fetch-site cross-site rejected",
  route.includes('request.headers.get("sec-fetch-site")') &&
    route.includes('secFetchSite === "cross-site"'),
);
check(
  "Origin mismatch rejected",
  route.includes('request.headers.get("origin")') &&
    route.includes("origin !== request.nextUrl.origin"),
);
check(
  "canonical active tenant resolver used",
  route.includes("resolveActiveRiskSharePublicTenant(rawCompanyCode)"),
);
check(
  "current session access guard used",
  route.includes("requireTenantAccessForCurrentSession({"),
);
check(
  "exact tenant roles allowed",
  route.includes('allowedRoles: ["tenant_admin", "tenant_manager"]'),
);
check("owner_internal excluded", !route.includes('"owner_internal"'));
check("selected tenant rechecked", route.includes("selectedTenantCode !== tenantCode"));
check(
  "exact role defensively rechecked",
  route.includes('role !== "tenant_admin" && role !== "tenant_manager"'),
);
check(
  "membership PK derived from server context",
  route.includes("tenantAccessResult.context.membership.membershipId"),
);
check(
  "body never supplies tenant/membership/role",
  !/validatedBody\.(company|companyCode|tenantCode|tenantId|membershipId|actorMembershipId|role)/.test(route),
);
check(
  "unauthenticated safely returns 401 forbidden",
  route.includes('tenantAccessResult.reason === "unauthenticated"') &&
    route.includes('jsonError(401, "forbidden")'),
);

// C. Dedicated server-only service-role RPC boundary.
check("helper is server-only", helper.startsWith('import "server-only";'));
check(
  "route imports dedicated helper",
  route.includes('from "@/lib/risk-share/riskShareTenantPublish"'),
);
check(
  "exact checked publish RPC endpoint",
  helper.includes("/rest/v1/rpc/publish_risk_share_version_for_tenant_checked") &&
    !helper.includes("`/rest/v1/rpc/publish_risk_share_version_for_tenant`"),
);
check(
  "service-role key remains helper-only",
  helper.includes("getSupabaseServiceRoleKey()") &&
    !route.includes("SUPABASE_SERVICE_ROLE_KEY"),
);
check(
  "server-confirmed tenant and membership passed",
  route.includes("companyCode: selectedTenantCode") && route.includes("actorMembershipId,"),
);

const payloadBlock = sourceBlock(helper, "body: JSON.stringify({", "}),\n        cache:");
const rpcFields = [
  "p_company_code", "p_actor_membership_id", "p_lock_month", "p_lock_title",
  "p_notes", "p_item_ids", "p_expected_review_revisions", "p_idempotency_key",
];
for (const field of rpcFields) {
  check(`RPC field: ${field}`, payloadBlock.includes(`${field}:`));
}
check(
  "no caller actor-role or publish-state RPC field",
  !/p_(actor_role|worker_visible|publish_action|version_lock_id|previous_version_id|content_source_version_id)/.test(payloadBlock),
);
check(
  "helper sends explicit item array only",
  helper.includes("p_item_ids: params.itemIds") &&
    helper.includes("p_expected_review_revisions: params.expectedReviewRevisions") &&
    helper.includes("params.itemIds.length < 1") &&
    !/p_item_ids\s*:\s*null/.test(helper),
);
check(
  "no direct table write endpoint",
  !/\/rest\/v1\/(risk_share_items|risk_share_version_locks|risk_share_version_items|tenant_membership)/.test(helper),
);
check(
  "no-store representation RPC call",
  helper.includes('Prefer: "return=representation"') && helper.includes('cache: "no-store"'),
);

// D. Strict response parser and durable outcome checks.
check(
  "exact one-row response required",
  helper.includes("!Array.isArray(data) || data.length !== 1"),
);
check(
  "plain response object required",
  helper.includes('typeof rawRow !== "object" || Array.isArray(rawRow)'),
);
check(
  "exact response field allowlist",
  helper.includes("RAW_RESPONSE_FIELDS") &&
    helper.includes("rawKeys.length !== RAW_RESPONSE_FIELDS.size") &&
    helper.includes("rawKeys.some((key) => !RAW_RESPONSE_FIELDS.has(key))"),
);
for (const field of ["ok", "code", "replayed", "version_lock_id", "item_count", "worker_visible_count"]) {
  check(`response field allowlisted: ${field}`, helper.includes(`"${field}"`));
}
check(
  "ok and replayed booleans",
  helper.includes('typeof row.ok !== "boolean"') &&
    helper.includes('typeof row.replayed !== "boolean"'),
);
const businessCodes = [
  "ok", "validation_failed", "forbidden", "selection_mismatch",
  "active_month_exists", "idempotency_conflict",
];
for (const code of businessCodes) {
  check(`business code allowlisted: ${code}`, helper.includes(`"${code}"`));
}
check("ok/code agreement enforced", helper.includes('ok !== (code === "ok")'));
check(
  "integer counts required",
  helper.includes("Number.isInteger(itemCount)") &&
    helper.includes("Number.isInteger(workerVisibleCount)"),
);
check(
  "success requires Version UUID",
  helper.includes('typeof row.version_lock_id !== "string"') &&
    helper.includes("!UUID_PATTERN.test(row.version_lock_id)"),
);
check("success count equals requested count", helper.includes("itemCount !== requestedItemCount"));
check(
  "success count bounded 1-200",
  helper.includes("itemCount < 1") && helper.includes("itemCount > 200"),
);
check(
  "worker-visible count bounded",
  helper.includes("workerVisibleCount < 0") &&
    helper.includes("workerVisibleCount > itemCount"),
);
check("failure cannot replay", /if \(\s*replayed \|\|/.test(helper));
check(
  "failure requires null Version and zero counts",
  helper.includes("row.version_lock_id !== null") &&
    helper.includes("itemCount !== 0") &&
    helper.includes("workerVisibleCount !== 0"),
);
check("request failures fail closed", helper.includes('failClosed("request_failed")'));
check("malformed responses fail closed", helper.includes('failClosed("invalid_response")'));

// E. HTTP mapping and browser data minimization.
const statusMap = {
  ok: 200,
  validation_failed: 422,
  forbidden: 403,
  selection_mismatch: 409,
  active_month_exists: 409,
  idempotency_conflict: 409,
  request_failed: 503,
  invalid_response: 503,
};
for (const [code, status] of Object.entries(statusMap)) {
  check(`HTTP ${code} -> ${status}`, new RegExp(`${code}:\\s*${status}`).test(route));
}
check(
  "safe error envelope only",
  route.includes("{ ok: false, code, replayed: false }"),
);
const successBlock = sourceBlock(
  route,
  "return NextResponse.json(\n    {\n      ok: true,",
  "    { status: 200 },",
);
check("success returns replayed", successBlock.includes("replayed: result.replayed"));
check("success returns item count", successBlock.includes("itemCount: result.itemCount"));
check(
  "success returns worker-visible count",
  successBlock.includes("workerVisibleCount: result.workerVisibleCount"),
);
check("Version UUID not exposed", !successBlock.includes("versionLockId"));
check(
  "raw helper result not exposed",
  !route.includes("NextResponse.json(result") && !route.includes("NextResponse.json({ ...result"),
);

// F. Log, secret and scope safety.
check(
  "global UUID redaction pattern used",
  helper.includes("UUID_REDACTION_PATTERN") &&
    helper.includes('.replace(UUID_REDACTION_PATTERN, "[uuid]")'),
);
check("backend message scrubbed", helper.includes("scrubRpcErrorMessage(rawMessage)"));
check(
  "only item count logged",
  helper.includes("requestedItemCount: params.itemIds.length") &&
    !/console\.(error|warn|log)\([\s\S]{0,260}itemIds\s*:/i.test(helper),
);
check(
  "idempotency key not logged",
  !/console\.(error|warn|log)\([\s\S]{0,300}idempotencyKey/i.test(helper + route),
);
check(
  "tenant/membership IDs not logged",
  !/console\.(error|warn|log)\([\s\S]{0,300}(companyCode|tenantCode|actorMembershipId|membershipId)/i.test(helper + route),
);
check(
  "title and notes not logged",
  !/console\.(error|warn|log)\([\s\S]{0,300}(lockTitle|notes)/i.test(helper),
);
check(
  "credential not returned or logged",
  !/NextResponse[\s\S]{0,300}(serviceRole|authorization|credential)/i.test(route) &&
    !/console\.(error|warn|log)\([\s\S]{0,300}(supabaseServiceRoleKey|Authorization)/i.test(helper),
);
check(
  "no SQL/migration/RLS implementation in route",
  !/(create\s+table|alter\s+table|create\s+policy|enable\s+row\s+level\s+security|select\s+.+from\s+public\.)/i.test(route),
);
check(
  "no eligibility algorithm in helper",
  !/(share_status|customer_check_status|customer_confirmed|worker_visible\s+is\s+not\s+null)/i.test(helper),
);
check(
  "no republish/rollback/supersede RPC arguments",
  !/(p_publish_action|p_previous_version_id|p_content_source_version_id|p_superseded_at)/i.test(helper),
);
check(
  "package verifier registered",
  packageJson.scripts?.["verify:risk-share-manager-publish-api"] ===
    "node scripts/verify-risk-share-manager-publish-api-contract.mjs",
);

const failed = checks.filter((entry) => !entry.ok);
for (const entry of checks) {
  console.log(`${entry.ok ? "PASS" : "FAIL"}: ${entry.name}`);
}
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);

if (failed.length > 0) {
  console.error(`\nFAILED CHECKS (${failed.length}):`);
  for (const entry of failed) console.error(`  - ${entry.name}`);
  process.exit(1);
}

console.log("\nAll Manager Publish API contract checks passed.");
