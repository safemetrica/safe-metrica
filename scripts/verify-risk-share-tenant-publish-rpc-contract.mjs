import fs from "node:fs";
import { execFileSync } from "node:child_process";

const TENANT_MIGRATION_FILE =
  "supabase/migrations/20260719010000_add_tenant_risk_share_publish_rpc.sql";
const OWNER_CORRECTION_FILE =
  "supabase/migrations/20260719020000_align_risk_share_publish_lock_order.sql";
const OWNER_BASELINE_FILE =
  "supabase/migrations/20260717010000_snapshot_owner_created_risk_share_versions.sql";
const VERIFIER_FILE = "scripts/verify-risk-share-tenant-publish-rpc-contract.mjs";

const REQUIRED_FILES = [
  TENANT_MIGRATION_FILE,
  OWNER_CORRECTION_FILE,
  OWNER_BASELINE_FILE,
];

for (const file of REQUIRED_FILES) {
  if (!fs.existsSync(file)) {
    console.error(`FAIL: missing required file: ${file}`);
    process.exit(1);
  }
}

const tenantSrc = fs.readFileSync(TENANT_MIGRATION_FILE, "utf8");
const ownerCorrectionSrc = fs.readFileSync(OWNER_CORRECTION_FILE, "utf8");
const ownerBaselineSrc = fs.readFileSync(OWNER_BASELINE_FILE, "utf8");
const checks = [];

function check(name, condition) {
  checks.push({ name, ok: Boolean(condition) });
}

function count(text, needle) {
  if (!needle) return 0;
  return text.split(needle).length - 1;
}

function extractFunction(text, marker) {
  const start = text.indexOf(marker);
  if (start < 0) return null;
  const end = text.indexOf("\n$$;", start);
  if (end < 0) return null;
  return text.slice(start, end + 4);
}

function normalizeSql(text) {
  return text
    .replace(/--[^\n]*/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function canonicalLockColumn(functionBody) {
  const match = functionBody?.match(
    /order\s+by\s+(?:risk_share_items\.|ri\.)(id|created_at)\s+asc\s+for\s+update(?:\s+of\s+(?:risk_share_items|ri))?/i,
  );
  return match?.[1]?.toLowerCase() ?? null;
}

function commandOutput(command, args) {
  return execFileSync(command, args, { encoding: "utf8" }).trim();
}

const tenantFn = extractFunction(
  tenantSrc,
  "create or replace function public.publish_risk_share_version_for_tenant(",
);
const ownerFn = extractFunction(
  ownerCorrectionSrc,
  "create or replace function public.create_risk_share_version_lock(",
);
const ownerBaselineFn = extractFunction(
  ownerBaselineSrc,
  "create or replace function public.create_risk_share_version_lock(",
);

// A. Exact identities and scope.
check("tenant migration exists", fs.existsSync(TENANT_MIGRATION_FILE));
check("Owner correction migration exists", fs.existsSync(OWNER_CORRECTION_FILE));
check("Owner baseline exists", fs.existsSync(OWNER_BASELINE_FILE));
check("tenant function body found", tenantFn !== null);
check("Owner correction function body found", ownerFn !== null);
check("Owner baseline function body found", ownerBaselineFn !== null);

check(
  "exact tenant argument signature",
  tenantSrc.includes(
    "create or replace function public.publish_risk_share_version_for_tenant(\n" +
      "  p_company_code text,\n" +
      "  p_actor_membership_id uuid,\n" +
      "  p_lock_month text,\n" +
      "  p_lock_title text,\n" +
      "  p_notes text,\n" +
      "  p_item_ids uuid[],\n" +
      "  p_idempotency_key text\n" +
      ")",
  ),
);
check(
  "exact tenant return shape",
  tenantSrc.includes(
    "returns table (\n" +
      "  ok boolean,\n" +
      "  code text,\n" +
      "  replayed boolean,\n" +
      "  version_lock_id uuid,\n" +
      "  item_count integer,\n" +
      "  worker_visible_count integer\n" +
      ")",
  ),
);
check(
  "only one tenant RPC definition in migration",
  count(
    tenantSrc,
    "create or replace function public.publish_risk_share_version_for_tenant(",
  ) === 1,
);
check(
  "tenant migration fail-closes unexpected overloads",
  tenantSrc.includes("unexpected overload exists") &&
    tenantSrc.includes("v_total_count = 0") &&
    tenantSrc.includes("v_total_count = 1 and v_exact_count = 1"),
);

// B. SECURITY DEFINER and tenant boundary.
check("tenant RPC language is plpgsql", tenantFn?.includes("language plpgsql"));
check("tenant RPC is SECURITY DEFINER", tenantFn?.includes("security definer"));
check(
  "tenant RPC has fixed search_path",
  tenantFn?.includes("set search_path = public, pg_temp"),
);
check(
  "membership row is locked FOR SHARE",
  tenantFn?.includes("from public.tenant_membership tm") &&
    tenantFn?.includes("for share;"),
);
check(
  "active tenant_admin or tenant_manager membership required",
  tenantFn?.includes("v_membership_status <> 'active'") &&
    tenantFn?.includes("v_membership_role not in ('tenant_admin', 'tenant_manager')"),
);
check(
  "membership tenant must equal canonical company",
  tenantFn?.includes("v_membership_tenant_code <> v_company_code"),
);
check(
  "membership failures collapse to forbidden",
  count(tenantFn ?? "", "'forbidden'::text") === 1,
);
check(
  "SECURITY DEFINER advisory functions are pg_catalog-qualified",
  tenantFn?.includes("pg_catalog.pg_advisory_xact_lock(") &&
    tenantFn?.includes("pg_catalog.hashtextextended("),
);
check(
  "advisory lock is namespaced by canonical company",
  tenantFn?.includes(
    "'publish_risk_share_version_for_tenant:' || v_company_code",
  ),
);

// C. Input validation.
check(
  "company code canonicalization and allowlist",
  tenantFn?.includes("lower(btrim(coalesce(p_company_code, '')))") &&
    tenantFn?.includes("^[a-z0-9][a-z0-9-]{0,63}$"),
);
check(
  "lock month validates YYYY-MM and month range",
  tenantFn?.includes("^[0-9]{4}-(0[1-9]|1[0-2])$"),
);
check(
  "lock title is 1-160 characters",
  tenantFn?.includes("char_length(v_lock_title) not between 1 and 160"),
);
check(
  "lock title rejects control characters",
  tenantFn?.includes("v_lock_title ~ v_control_char_pattern"),
);
check(
  "notes are null-or-500 and reject control characters",
  tenantFn?.includes("char_length(v_notes) > 500") &&
    tenantFn?.includes("v_notes ~ v_control_char_pattern"),
);
check(
  "idempotency key is canonical 1-200",
  tenantFn?.includes("btrim(coalesce(p_idempotency_key, ''))") &&
    tenantFn?.includes("char_length(v_idempotency_key) not between 1 and 200"),
);
check(
  "selection rejects null empty multidimensional and null elements",
  tenantFn?.includes("p_item_ids is null") &&
    tenantFn?.includes("array_length(p_item_ids, 1)") &&
    tenantFn?.includes("array_ndims(p_item_ids)") &&
    tenantFn?.includes("array_position(p_item_ids, null)"),
);
check(
  "selection rejects duplicates and enforces 1-200",
  tenantFn?.includes("array_agg(distinct requested_id order by requested_id)") &&
    tenantFn?.includes("v_requested_count <> v_requested_raw_count") &&
    tenantFn?.includes("v_requested_count not between 1 and 200"),
);
check(
  "empty selection never means publish all",
  !/v_requested_count\s*=\s*0\s+or\s+(?:risk_share_items\.|ri\.)id\s*=\s*any/i.test(
    tenantFn ?? "",
  ),
);

// D. Item selection, cross-tenant fail-closed, and lock order.
const tenantSelection = tenantFn?.slice(
  tenantFn.indexOf("with locked_items as ("),
  tenantFn.indexOf("-- 6. Create the Version"),
);
check(
  "selection is scoped to canonical tenant and explicit ids",
  tenantSelection?.includes("ri.company_code = v_company_code") &&
    tenantSelection?.includes("ri.id = any(v_item_ids)"),
);
check(
  "selection requires customer-confirmed unlocked state",
  tenantSelection?.includes("ri.share_status = 'customer_confirmed'") &&
    tenantSelection?.includes("ri.customer_check_status = 'confirmed'") &&
    tenantSelection?.includes("ri.customer_confirmed = true") &&
    tenantSelection?.includes("ri.version_lock_id is null"),
);
check(
  "selection requires structural and revision validity",
  tenantSelection?.includes("btrim(coalesce(ri.task_name, '')) <> ''") &&
    tenantSelection?.includes("btrim(coalesce(ri.hazard, '')) <> ''") &&
    tenantSelection?.includes("ri.review_revision >= 1") &&
    tenantSelection?.includes("ri.worker_visible is not null"),
);
check(
  "eligible count exactly equals requested count",
  tenantFn?.includes("v_item_count <> v_requested_count") &&
    count(tenantFn ?? "", "'selection_mismatch'::text") === 1,
);
check(
  "tenant publish locks Items in id ASC",
  canonicalLockColumn(tenantFn) === "id",
);
check(
  "Owner publish locks Items in id ASC",
  canonicalLockColumn(ownerFn) === "id",
);
check(
  "tenant and Owner lock orders match",
  canonicalLockColumn(tenantFn) !== null &&
    canonicalLockColumn(tenantFn) === canonicalLockColumn(ownerFn),
);
check(
  "neither publish path locks by created_at",
  canonicalLockColumn(tenantFn) !== "created_at" &&
    canonicalLockColumn(ownerFn) !== "created_at",
);

const tenantLockMutant = (tenantFn ?? "").replace(
  /order\s+by\s+ri\.id\s+asc/i,
  "order by ri.created_at asc",
);
const ownerLockMutant = (ownerFn ?? "").replace(
  /order\s+by\s+risk_share_items\.id\s+asc/i,
  "order by risk_share_items.created_at asc",
);
check(
  "regression catches tenant-only lock-order reversal",
  canonicalLockColumn(tenantLockMutant) !== canonicalLockColumn(ownerFn),
);
check(
  "regression catches Owner-only lock-order reversal",
  canonicalLockColumn(tenantFn) !== canonicalLockColumn(ownerLockMutant),
);

const expectedOwner = normalizeSql(
  (ownerBaselineFn ?? "").replace(
    /order\s+by\s+risk_share_items\.created_at\s+asc/i,
    "order by risk_share_items.id asc",
  ),
);
check(
  "Owner replacement differs only by canonical row-lock order",
  ownerBaselineFn !== null &&
    ownerFn !== null &&
    normalizeSql(ownerFn) === expectedOwner,
);
check(
  "Owner correction preserves security and service-role-only contract",
  ownerFn?.includes("security definer") &&
    ownerFn?.includes("set search_path = public, pg_temp") &&
    ownerCorrectionSrc.includes("owner to postgres") &&
    ownerCorrectionSrc.includes("from anon, authenticated, service_role") &&
    ownerCorrectionSrc.includes("to service_role;"),
);

// E. Durable idempotency.
check(
  "idempotency lookup is tenant-key scoped",
  tenantFn?.includes("vl.company_code = v_company_code") &&
    tenantFn?.includes("vl.idempotency_key = v_idempotency_key"),
);
check(
  "exact replay requires active publish action and matching actor metadata",
  tenantFn?.includes("v_existing_lock.lock_status = 'active'") &&
    tenantFn?.includes("v_existing_lock.publish_action = 'publish'") &&
    tenantFn?.includes("v_existing_lock.actor_membership_id = p_actor_membership_id") &&
    tenantFn?.includes("v_existing_lock.lock_month = v_lock_month") &&
    tenantFn?.includes("v_existing_lock.lock_title = v_lock_title") &&
    tenantFn?.includes("coalesce(v_existing_lock.notes, '') = coalesce(v_notes, '')"),
);
check(
  "replay re-derives snapshot count worker-visible count and Item set",
  tenantFn?.includes("v_replay_snapshot_count") &&
    tenantFn?.includes("v_replay_snapshot_worker_visible_count") &&
    tenantFn?.includes("v_stored_item_ids"),
);
check(
  "replay re-derives live locked count worker-visible count and Item set",
  tenantFn?.includes("v_replay_live_item_count") &&
    tenantFn?.includes("v_replay_live_worker_visible_count") &&
    tenantFn?.includes("v_replay_live_item_ids"),
);
check(
  "replay compares stored counts to durable counts",
  tenantFn?.includes("v_existing_lock.item_count = v_replay_snapshot_count") &&
    tenantFn?.includes("v_existing_lock.item_count = v_replay_live_item_count") &&
    tenantFn?.includes(
      "v_existing_lock.worker_visible_count =\n         v_replay_snapshot_worker_visible_count",
    ) &&
    tenantFn?.includes(
      "v_existing_lock.worker_visible_count =\n         v_replay_live_worker_visible_count",
    ),
);
check(
  "replay compares exact snapshot and live Item sets",
  tenantFn?.includes("v_stored_item_ids = v_item_ids") &&
    tenantFn?.includes("v_replay_live_item_ids = v_item_ids"),
);
check(
  "same-key durable mismatch returns idempotency conflict",
  count(tenantFn ?? "", "'idempotency_conflict'::text") === 1,
);

// F. Atomic Version, snapshot, live Item linkage, and actor audit.
check(
  "Version stores verified role actor and idempotency metadata",
  tenantFn?.includes("locked_by,") &&
    tenantFn?.includes("v_membership_role,") &&
    tenantFn?.includes("actor_membership_id,") &&
    tenantFn?.includes("idempotency_key,") &&
    tenantFn?.includes("publish_action,") &&
    tenantFn?.includes("'publish',"),
);
check(
  "v1 Version leaves chain and rollback fields null",
  tenantFn?.includes("previous_version_id,") &&
    tenantFn?.includes("content_source_version_id,") &&
    tenantFn?.includes("superseded_at,") &&
    count(tenantFn ?? "", "    null,") >= 3,
);
check(
  "active month conflict is atomic",
  tenantFn?.includes(
    "on conflict (company_code, lock_month)\n    where lock_status = 'active'",
  ) && tenantFn?.includes("'active_month_exists'::text"),
);
check(
  "snapshot copies existing per-Item worker_visible and review revision",
  tenantFn?.includes("ri.worker_visible,") &&
    tenantFn?.includes("ri.review_revision") &&
    !tenantFn?.includes("p_worker_visible"),
);
check(
  "live Item update never overwrites worker_visible or review content",
  (() => {
    const start = tenantFn?.indexOf("update public.risk_share_items ri") ?? -1;
    const end = tenantFn?.indexOf("get diagnostics v_item_update_count", start) ?? -1;
    if (start < 0 || end < 0) return false;
    const update = tenantFn.slice(start, end);
    return (
      !update.includes("worker_visible") &&
      !update.includes("task_name") &&
      !update.includes("hazard") &&
      !update.includes("review_revision") &&
      update.includes("version_lock_id = v_lock_id")
    );
  })(),
);
check(
  "snapshot and Item write row counts are enforced",
  tenantFn?.includes("v_snapshot_insert_count <> v_item_count") &&
    tenantFn?.includes("v_item_update_count <> v_item_count"),
);
check(
  "success re-derives exact snapshot count visibility and Item set",
  tenantFn?.includes("v_final_snapshot_count") &&
    tenantFn?.includes("v_final_snapshot_worker_visible_count") &&
    tenantFn?.includes("v_final_snapshot_item_ids") &&
    tenantFn?.includes("v_final_snapshot_item_ids <> v_item_ids"),
);
check(
  "success re-derives live locked count confirmation linkage and Item set",
  tenantFn?.includes("v_final_live_item_count") &&
    tenantFn?.includes("v_final_live_customer_confirmed_count") &&
    tenantFn?.includes("v_final_live_item_ids") &&
    tenantFn?.includes("ri.version_lock_id = v_lock_id") &&
    tenantFn?.includes("ri.share_status = 'locked'") &&
    tenantFn?.includes("ri.customer_check_status = 'confirmed'") &&
    tenantFn?.includes("v_final_live_customer_confirmed_count <> v_item_count"),
);
check(
  "success proves selected worker_visible values did not change",
  tenantFn?.includes("v_final_live_worker_visible_ids") &&
    tenantFn?.includes("v_eligible_worker_visible_ids") &&
    tenantFn?.includes("v_final_live_worker_visible_ids <> v_eligible_worker_visible_ids"),
);
check(
  "impossible postcondition mismatches abort by exception",
  count(tenantFn ?? "", "raise exception") >= 4,
);

// G. Apply-time identity and privilege postconditions.
check(
  "migration checks exact overload count and signature",
  tenantSrc.includes("v_total_count <> 1 or v_exact_count <> 1") &&
    tenantSrc.includes("overload/signature mismatch"),
);
check(
  "migration checks exact identity arguments and return contract",
  tenantSrc.includes("pg_get_function_identity_arguments(v_rpc_oid)") &&
    tenantSrc.includes("pg_get_function_result(v_rpc_oid)") &&
    tenantSrc.includes("argument/return mismatch"),
);
check(
  "migration checks postgres owner SECURITY DEFINER and search_path",
  tenantSrc.includes("r.rolname = 'postgres'") &&
    tenantSrc.includes("p.prosecdef") &&
    tenantSrc.includes("p.proconfig = array['search_path=public, pg_temp']::text[]"),
);
check(
  "migration checks service_role-only direct execution",
  tenantSrc.includes("has_function_privilege('service_role', v_rpc_oid, 'EXECUTE')") &&
    tenantSrc.includes("has_function_privilege('anon', v_rpc_oid, 'EXECUTE')") &&
    tenantSrc.includes("has_function_privilege('authenticated', v_rpc_oid, 'EXECUTE')"),
);
check(
  "migration rejects PUBLIC unexpected grantees and grant option",
  tenantSrc.includes("aclexplode(coalesce(p.proacl, acldefault('f', p.proowner)))") &&
    tenantSrc.includes("acl.grantee = 0") &&
    tenantSrc.includes("grantee_role.rolname is distinct from 'service_role'") &&
    tenantSrc.includes("acl.is_grantable"),
);
check(
  "tenant RPC explicitly owned by postgres and granted only to service_role",
  tenantSrc.includes(") owner to postgres;") &&
    tenantSrc.includes(") from public;") &&
    tenantSrc.includes(") from anon, authenticated, service_role;") &&
    tenantSrc.includes(") to service_role;"),
);

// H. Response and scope boundaries.
const normalCodes = [
  "ok",
  "validation_failed",
  "forbidden",
  "selection_mismatch",
  "active_month_exists",
  "idempotency_conflict",
];
for (const code of normalCodes) {
  check(`normal response code present: ${code}`, tenantFn?.includes(`'${code}'`));
}
check(
  "no unexpected normal response code",
  [...(tenantFn ?? "").matchAll(/'([a-z_]+)'::text/g)].every((match) =>
    normalCodes.includes(match[1]),
  ),
);
check(
  "tenant RPC does not implement republish rollback supersede or reactivation",
  !/'republish'|'rollback'/.test(tenantFn ?? "") &&
    !/update\s+public\.risk_share_version_locks/i.test(tenantFn ?? "") &&
    !/delete\s+from\s+public\.risk_share_version_locks/i.test(tenantFn ?? ""),
);
check(
  "migrations introduce no RLS policy DDL",
  !/create\s+policy/i.test(tenantSrc) &&
    !/create\s+policy/i.test(ownerCorrectionSrc),
);
check(
  "migrations drop no functions or tables",
  !/drop\s+function|drop\s+table/i.test(tenantSrc) &&
    !/drop\s+function|drop\s+table/i.test(ownerCorrectionSrc),
);
check(
  "Owner correction replaces only the Owner Version Lock RPC",
  count(
    ownerCorrectionSrc,
    "create or replace function public.create_risk_share_version_lock(",
  ) === 1 &&
    !ownerCorrectionSrc.includes("review_risk_share_item(") &&
    !ownerCorrectionSrc.includes("prepare_risk_share_items_for_tenant("),
);

const changedFiles = commandOutput("git", [
  "diff",
  "--name-only",
  "origin/main...HEAD",
])
  .split("\n")
  .filter(Boolean);
const allowedFiles = new Set([
  "package.json",
  VERIFIER_FILE,
  TENANT_MIGRATION_FILE,
  OWNER_CORRECTION_FILE,
]);
check(
  "only the four approved PR files changed",
  changedFiles.length === 4 && changedFiles.every((file) => allowedFiles.has(file)),
);

const changedMigrations = commandOutput("git", [
  "diff",
  "--name-only",
  "origin/main...HEAD",
  "--",
  "supabase/migrations/",
])
  .split("\n")
  .filter(Boolean);
check(
  "no existing main migration modified",
  changedMigrations.length === 2 &&
    changedMigrations.every((file) =>
      [TENANT_MIGRATION_FILE, OWNER_CORRECTION_FILE].includes(file),
    ),
);

const failures = checks.filter(({ ok }) => !ok);
for (const { name, ok } of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
}
console.log(`\n${checks.length - failures.length}/${checks.length} checks passed`);

if (failures.length > 0) {
  console.error(`\nFAILED CHECKS (${failures.length})`);
  for (const { name } of failures) console.error(`  - ${name}`);
  process.exit(1);
}

console.log("\nAll tenant publish RPC and cross-path contract checks passed.");
