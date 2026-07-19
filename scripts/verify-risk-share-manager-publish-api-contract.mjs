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

function blockBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  if (start === -1) return "";
  const end = source.indexOf(endMarker, start + startMarker.length);
  return source.slice(start, end === -1 ? undefined : end);
}

// ---------------------------------------------------------------------
// A. Route and request validation
// ---------------------------------------------------------------------

check("fixed Manager Publish route exists", fs.existsSync(ROUTE_FILE));
check("route is force-dynamic", route.includes('export const dynamic = "force-dynamic"'));
check("route disables revalidation", route.includes("export const revalidate = 0"));
check(
  "object root required",
  route.includes('typeof raw !== "object" || Array.isArray(raw)'),
);
check(
  "unknown body keys rejected through exact allowlist",
  route.includes("ALLOWED_BODY_FIELDS.has(key)"),
);

const allowedFields = [
  "lockMonth",
  "lockTitle",
  "notes",
  "itemIds",
  "idempotencyKey",
];
const allowedBlock = blockBetween(
  route,
  "const ALLOWED_BODY_FIELDS = new Set([",
  "]);",
);
for (const field of allowedFields) {
  check(`allowed request field present: ${field}`, allowedBlock.includes(`"${field}"`));
}
check(
  "allowlist contains exactly five quoted fields",
  (allowedBlock.match(/"[A-Za-z]+"/g) ?? []).length === allowedFields.length,
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
  "serviceRoleKey",
  "supabaseServiceRoleKey",
  "authorization",
  "credential",
  "workerVisible",
  "customerConfirmed",
  "customerCheckStatus",
  "shareStatus",
  "versionLockId",
  "lockedBy",
  "publishAction",
  "previousVersionId",
  "contentSourceVersionId",
  "supersededAt",
  "itemCount",
  "workerVisibleCount",
];
const forbiddenBlock = blockBetween(
  route,
  "const FORBIDDEN_BODY_FIELDS = [",
  "] as const;",
);
for (const field of forbiddenFields) {
  check(`forbidden request field rejected: ${field}`, forbiddenBlock.includes(`"${field}"`));
}
check(
  "forbidden fields are rejected by presence",
  route.includes("forbiddenField in body"),
);
check(
  "16KB body cap checks header and actual UTF-8 bytes",
  route.includes("MAX_BODY_BYTES = 16 * 1024") &&
    route.includes('request.headers.get("content-length")') &&
    route.includes('Buffer.byteLength(rawBodyText, "utf8")'),
);
check(
  "lock month uses exact YYYY-MM month range",
  route.includes("LOCK_MONTH_PATTERN") &&
    route.includes("(0[1-9]|1[0-2])") &&
    route.includes("LOCK_MONTH_PATTERN.test(lockMonth)"),
);
check(
  "lock title is trimmed and bounded 1-160",
  route.includes("const lockTitle = lockTitleRaw.trim()") &&
    route.includes("lockTitle.length < 1") &&
    route.includes("lockTitle.length > 160"),
);
check(
  "lock title control characters rejected",
  route.includes("CONTROL_CHARACTER_PATTERN.test(lockTitle)"),
);
check(
  "notes accepts omitted/null and normalizes blank to null",
  route.includes("body.notes !== undefined && body.notes !== null") &&
    route.includes("notes = normalizedNotes || null"),
);
check(
  "notes bounded at 500 and control characters rejected",
  route.includes("normalizedNotes.length > 500") &&
    route.includes("CONTROL_CHARACTER_PATTERN.test(normalizedNotes)"),
);
check(
  "idempotency key trimmed and bounded 1-200",
  route.includes("idempotencyKeyRaw.trim()") &&
    route.includes("idempotencyKey.length < 1 || idempotencyKey.length > 200"),
);
check(
  "itemIds must be an array",
  route.includes("!Array.isArray(itemIdsRaw)"),
);
check(
  "itemIds must be explicit non-empty and at most 200",
  route.includes("itemIdsRaw.length < 1") &&
    route.includes("itemIdsRaw.length > MAX_ITEM_IDS") &&
    route.includes("MAX_ITEM_IDS = 200"),
);
check(
  "every item ID must be a UUID string",
  route.includes('typeof rawItemId !== "string" || !UUID_PATTERN.test(rawItemId)'),
);
check(
  "duplicate item IDs rejected case-insensitively",
  route.includes("rawItemId.toLowerCase()") &&
    route.includes("seenItemIds.has(normalizedItemId)"),
);
check(
  "no bulk-all mode in route",
  !/itemIds\s*:\s*null/.test(route) && !/p_item_ids\s*:\s*null/.test(route),
);

// ---------------------------------------------------------------------
// B. Same-origin, tenant and membership boundary
// ---------------------------------------------------------------------

check(
  "same-origin protection checks sec-fetch-site",
  route.includes('request.headers.get("sec-fetch-site")') &&
    route.includes('secFetchSite === "cross-site"'),
);
check(
  "same-origin protection compares Origin with request origin",
  route.includes('request.headers.get("origin")') &&
    route.includes("origin !== request.nextUrl.origin"),
);
check(
  "active Risk Share tenant resolver is used",
  route.includes("resolveActiveRiskSharePublicTenant(rawCompanyCode)"),
);
check(
  "current-session tenant access guard is used",
  route.includes("requireTenantAccessForCurrentSession({"),
);
check(
  "only tenant_admin and tenant_manager are allowed",
  route.includes('allowedRoles: ["tenant_admin", "tenant_manager"]'),
);
check(
  "owner_internal is absent from route role contract",
  !route.includes('"owner_internal"'),
);
check(
  "selected tenant is defensively compared with resolved tenant",
  route.includes("selectedTenantCode !== tenantCode"),
);
check(
  "exact role is defensively rechecked",
  route.includes('role !== "tenant_admin" && role !== "tenant_manager"'),
);
check(
  "membership ID comes from server-derived access context",
  route.includes("tenantAccessResult.context.membership.membershipId"),
);
check(
  "body cannot supply tenant, membership or role",
  !/validatedBody\.(company|companyCode|tenantCode|tenantId|membershipId|actorMembershipId|role)/.test(route),
);
check(
  "unauthenticated is safely mapped to 401 forbidden",
  route.includes('tenantAccessResult.reason === "unauthenticated"') &&
    route.includes('jsonError(401, "forbidden")'),
);
check(
  "resolved but unauthorized access is 403",
  route.includes('jsonError(403, "forbidden")'),
);

// ---------------------------------------------------------------------
// C. Server-only RPC helper
// ---------------------------------------------------------------------

check("helper is server-only", helper.startsWith('import "server-only";'));
check(
  "route imports the dedicated publish helper",
  route.includes('from "@/lib/risk-share/riskShareTenantPublish"'),
);
check(
  "exact tenant Publish RPC endpoint used",
  helper.includes("/rest/v1/rpc/publish_risk_share_version_for_tenant"),
);
check(
  "service-role key is read only in server helper",
  helper.includes("getSupabaseServiceRoleKey()") &&
    !route.includes("SUPABASE_SERVICE_ROLE_KEY"),
);
check(
  "verified tenant and membership are passed to helper",
  route.includes("companyCode: selectedTenantCode") &&
    route.includes("actorMembershipId,"),
);

const rpcPayloadBlock = blockBetween(
  helper,
  "body: JSON.stringify({",
  "}),\n        cache:",
);
const expectedRpcFields = [
  "p_company_code",
  "p_actor_membership_id",
  "p_lock_month",
  "p_lock_title",
  "p_notes",
  "p_item_ids",
  "p_idempotency_key",
];
for (const field of expectedRpcFields) {
  check(`RPC payload contains exact field: ${field}`, rpcPayloadBlock.includes(`${field}:`));
}
check(
  "RPC payload has no client-derived actor role or publish state",
  !/p_(actor_role|worker_visible|publish_action|version_lock_id|previous_version_id)/.test(rpcPayloadBlock),
);
check(
  "helper never sends a null item array",
  helper.includes("p_item_ids: params.itemIds") &&
    helper.includes("params.itemIds.length < 1") &&
    !/p_item_ids\s*:\s*null/.test(helper),
);
check(
  "helper has no direct write path to publish tables",
  !/\/rest\/v1\/(risk_share_items|risk_share_version_locks|risk_share_version_items|tenant_membership)/.test(helper),
);
check(
  "RPC request is no-store and asks for representation",
  helper.includes('Prefer: "return=representation"') &&
    helper.includes('cache: "no-store"'),
);

// ---------------------------------------------------------------------
// D. Fail-closed RPC response validation
// ---------------------------------------------------------------------

check(
  "response must be an exact one-row array",
  helper.includes("!Array.isArray(data) || data.length !== 1"),
);
check(
  "response row must be a plain object",
  helper.includes('typeof rawRow !== "object" || Array.isArray(rawRow)'),
);
check(
  "ok and replayed must be booleans",
  helper.includes('typeof row.ok !== "boolean"') &&
    helper.includes('typeof row.replayed !== "boolean"'),
);
const businessCodes = [
  "ok",
  "validation_failed",
  "forbidden",
  "selection_mismatch",
  "active_month_exists",
  "idempotency_conflict",
];
for (const code of businessCodes) {
  check(`known RPC code allowlisted: ${code}`, helper.includes(`"${code}"`));
}
check(
  "ok boolean must agree with code",
  helper.includes('ok !== (code === "ok")'),
);
check(
  "counts must be integers",
  helper.includes("Number.isInteger(itemCount)") &&
    helper.includes("Number.isInteger(workerVisibleCount)"),
);
check(
  "successful response requires a valid Version UUID",
  helper.includes('typeof row.version_lock_id !== "string"') &&
    helper.includes("!UUID_PATTERN.test(row.version_lock_id)"),
);
check(
  "successful item count must match explicit request count",
  helper.includes("itemCount !== requestedItemCount"),
);
check(
  "successful item count remains within 1-200",
  helper.includes("itemCount < 1") && helper.includes("itemCount > 200"),
);
check(
  "worker-visible count is bounded by item count",
  helper.includes("workerVisibleCount < 0") &&
    helper.includes("workerVisibleCount > itemCount"),
);
check(
  "failed response cannot claim replay",
  helper.includes("if (\n    replayed ||"),
);
check(
  "failed response must carry null Version ID and zero counts",
  helper.includes("row.version_lock_id !== null") &&
    helper.includes("itemCount !== 0") &&
    helper.includes("workerVisibleCount !== 0"),
);
check(
  "network and backend HTTP failures fail closed",
  helper.includes('return failClosed("request_failed")'),
);
check(
  "malformed response fails closed",
  helper.includes('return failClosed("invalid_response")'),
);

// ---------------------------------------------------------------------
// E. HTTP and outward data minimization
// ---------------------------------------------------------------------

const expectedStatuses = {
  ok: 200,
  validation_failed: 422,
  forbidden: 403,
  selection_mismatch: 409,
  active_month_exists: 409,
  idempotency_conflict: 409,
  request_failed: 503,
  invalid_response: 503,
};
for (const [code, status] of Object.entries(expectedStatuses)) {
  check(
    `HTTP mapping ${code} -> ${status}`,
    new RegExp(`${code}:\\s*${status}`).test(route),
  );
}
check(
  "error response has only safe outcome fields",
  route.includes("{ ok: false, code, replayed: false }"),
);
const successBlock = blockBetween(
  route,
  "return NextResponse.json(\n    {\n      ok: true,",
  "    { status: 200 },",
);
check("success response includes replay flag", successBlock.includes("replayed: result.replayed"));
check("success response includes item count", successBlock.includes("itemCount: result.itemCount"));
check(
  "success response includes worker-visible count",
  successBlock.includes("workerVisibleCount: result.workerVisibleCount"),
);
check(
  "Version UUID is not exposed in success response",
  !successBlock.includes("versionLockId"),
);
check(
  "raw RPC object is never returned",
  !route.includes("NextResponse.json(result") && !route.includes("NextResponse.json({ ...result"),
);

// ---------------------------------------------------------------------
// F. Log and credential safety
// ---------------------------------------------------------------------

check(
  "backend error messages are scrubbed before logging",
  helper.includes("scrubRpcErrorMessage(rawMessage)"),
);
check(
  "logs use requested item count rather than Item UUID array",
  helper.includes("requestedItemCount: params.itemIds.length") &&
    !/console\.(error|warn|log)\([\s\S]{0,260}itemIds\s*:/i.test(helper),
);
check(
  "raw idempotency key is not logged",
  !/console\.(error|warn|log)\([\s\S]{0,300}idempotencyKey/i.test(helper) &&
    !/console\.(error|warn|log)\([\s\S]{0,300}idempotencyKey/i.test(route),
);
check(
  "tenant and membership identifiers are not logged",
  !/console\.(error|warn|log)\([\s\S]{0,300}(companyCode|tenantCode|actorMembershipId|membershipId)/i.test(helper) &&
    !/console\.(error|warn|log)\([\s\S]{0,300}(companyCode|tenantCode|actorMembershipId|membershipId)/i.test(route),
);
check(
  "lock title and notes are not logged",
  !/console\.(error|warn|log)\([\s\S]{0,300}(lockTitle|notes)/i.test(helper),
);
check(
  "service-role credential is never returned or logged",
  !/NextResponse[\s\S]{0,300}(serviceRole|authorization|credential)/i.test(route) &&
    !/console\.(error|warn|log)\([\s\S]{0,300}(supabaseServiceRoleKey|Authorization)/i.test(helper),
);

// ---------------------------------------------------------------------
// G. Scope and script registration
// ---------------------------------------------------------------------

check(
  "package script is registered exactly",
  packageJson.scripts?.["verify:risk-share-manager-publish-api"] ===
    "node scripts/verify-risk-share-manager-publish-api-contract.mjs",
);
check(
  "route contains no migration, RLS or direct SQL logic",
  !/(create\s+table|alter\s+table|create\s+policy|enable\s+row\s+level\s+security|select\s+.+from\s+public\.)/i.test(route),
);
check(
  "helper contains no publish eligibility reimplementation",
  !/(share_status|customer_check_status|customer_confirmed|review_revision|version_lock_id\s+is\s+null)/i.test(helper),
);
check(
  "API does not implement republish, rollback or supersede",
  !/(republish|rollback|supersede)/i.test(route + helper),
);

const failed = checks.filter((entry) => !entry.ok);
for (const entry of checks) {
  console.log(`${entry.ok ? "PASS" : "FAIL"}: ${entry.name}`);
}
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);

if (failed.length > 0) {
  console.error(`\nFAILED CHECKS (${failed.length}):`);
  for (const entry of failed) {
    console.error(`  - ${entry.name}`);
  }
  process.exit(1);
}

console.log("\nAll Manager Publish API contract checks passed.");
