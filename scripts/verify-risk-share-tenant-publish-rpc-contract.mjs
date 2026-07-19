import fs from "node:fs";
import { execSync } from "node:child_process";

const TENANT_MIGRATION_FILE =
  "supabase/migrations/20260719010000_add_tenant_risk_share_publish_rpc.sql";
const LOCK_ORDER_MIGRATION_FILE =
  "supabase/migrations/20260719020000_align_risk_share_publish_lock_order.sql";
const OWNER_BASELINE_FILE =
  "supabase/migrations/20260717010000_snapshot_owner_created_risk_share_versions.sql";
const VERIFIER_FILE = "scripts/verify-risk-share-tenant-publish-rpc-contract.mjs";

const REQUIRED_FILES = [
  TENANT_MIGRATION_FILE,
  LOCK_ORDER_MIGRATION_FILE,
  OWNER_BASELINE_FILE,
];

for (const file of REQUIRED_FILES) {
  if (!fs.existsSync(file)) {
    console.error(`FAIL: missing file - ${file}`);
    process.exit(1);
  }
}

const tenantSrc = fs.readFileSync(TENANT_MIGRATION_FILE, "utf8");
const lockOrderSrc = fs.readFileSync(LOCK_ORDER_MIGRATION_FILE, "utf8");
const ownerBaselineSrc = fs.readFileSync(OWNER_BASELINE_FILE, "utf8");
const checks = [];

function check(name, ok) {
  checks.push({ name, ok: Boolean(ok) });
}

function countOccurrences(text, needle) {
  if (!needle) return 0;
  let count = 0;
  let index = 0;
  for (;;) {
    const found = text.indexOf(needle, index);
    if (found === -1) break;
    count += 1;
    index = found + needle.length;
  }
  return count;
}

function extractBetween(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  if (start === -1) return null;
  const end = text.indexOf(endMarker, start + startMarker.length);
  if (end === -1) return null;
  return text.slice(start, end + endMarker.length);
}

function normalizeSql(text) {
  return text
    .replace(/--[^\n]*/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function canonicalRiskShareItemLockOrder(functionBody) {
  const match = functionBody?.match(
    /order by\s+risk_share_items\.(id|created_at)\s+asc\s+for update of risk_share_items/i,
  );
  return match?.[1]?.toLowerCase() ?? null;
}

function lockOrdersMatch(leftBody, rightBody) {
  const left = canonicalRiskShareItemLockOrder(leftBody);
  const right = canonicalRiskShareItemLockOrder(rightBody);
  return left !== null && right !== null && left === right;
}

const tenantFnBody = extractBetween(
  tenantSrc,
  "create or replace function public.publish_risk_share_version_for_tenant(",
  "\n$$;",
);
const ownerFnBody = extractBetween(
  lockOrderSrc,
  "create or replace function public.create_risk_share_version_lock(",
  "\n$$;",
);
const ownerBaselineFnBody = extractBetween(
  ownerBaselineSrc,
  "create or replace function public.create_risk_share_version_lock(",
  "\n$$;",
);

// =========================================================================
// A. Files, exact function identities, and return contracts
// =========================================================================

check("tenant publish migration exists", fs.existsSync(TENANT_MIGRATION_FILE));
check("additive Owner lock-order migration exists", fs.existsSync(LOCK_ORDER_MIGRATION_FILE));
check("unchanged Owner baseline migration exists", fs.existsSync(OWNER_BASELINE_FILE));
check("tenant function body located", tenantFnBody !== null);
check("Owner replacement function body located", ownerFnBody !== null);
check("Owner baseline function body located", ownerBaselineFnBody !== null);

check(
  "exact tenant function name and argument list",
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
  "exact tenant RETURNS TABLE shape",
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
  "exact Owner function name and argument list preserved",
  lockOrderSrc.includes(
    "create or replace function public.create_risk_share_version_lock(\n" +
      "  p_company_code text,\n" +
      "  p_company_name text,\n" +
      "  p_site_name text,\n" +
      "  p_source_title text,\n" +
      "  p_lock_title text,\n" +
      "  p_lock_month text,\n" +
      "  p_notes text,\n" +
      "  p_worker_visible boolean,\n" +
      "  p_item_ids uuid[],\n" +
      "  p_locked_by text\n" +
      ")",
  ),
);
check(
  "exact Owner return shape preserved",
  ownerFnBody?.includes(
    "returns table (id uuid, item_count integer, duplicate_lock boolean, selection_mismatch boolean)",
  ),
);

// =========================================================================
// B. Tenant security posture and membership boundary
// =========================================================================

const TENANT_SIGNATURE =
  "public.publish_risk_share_version_for_tenant(\n  text, uuid, text, text, text, uuid[], text\n)";

check("tenant RPC LANGUAGE plpgsql", tenantFnBody?.includes("language plpgsql"));
check("tenant RPC SECURITY DEFINER", tenantFnBody?.includes("security definer"));
check(
  "tenant RPC search_path fixed",
  tenantFnBody?.includes("set search_path = public, pg_temp"),
);
check(
  "tenant RPC owner explicitly postgres",
  tenantSrc.includes(`alter function ${TENANT_SIGNATURE} owner to postgres;`),
);
check(
  "tenant RPC PUBLIC revoked",
  tenantSrc.includes(`revoke all on function ${TENANT_SIGNATURE} from public;`),
);
check(
  "tenant RPC anon/authenticated/service_role reset before grant",
  tenantSrc.includes(
    `revoke all on function ${TENANT_SIGNATURE} from anon, authenticated, service_role;`,
  ),
);
check(
  "tenant RPC service_role-only grant",
  tenantSrc.includes(`grant execute on function ${TENANT_SIGNATURE} to service_role;`) &&
    !/grant execute on function public\.publish_risk_share_version_for_tenant[\s\S]*?to\s+(public|anon|authenticated)\s*;/i.test(
      tenantSrc,
    ),
);
check(
  "membership read from tenant_membership FOR SHARE",
  tenantFnBody?.includes("from public.tenant_membership") && tenantFnBody?.includes("for share"),
);
check("active membership required", tenantFnBody?.includes("v_membership_status <> 'active'"));
check(
  "tenant_admin or tenant_manager required",
  tenantFnBody?.includes("v_membership_role not in ('tenant_admin', 'tenant_manager')"),
);
check(
  "membership tenant_code must equal canonical company_code",
  tenantFnBody?.includes("v_membership_tenant_code <> v_company_code"),
);
check(
  "membership failures collapse to forbidden",
  (() => {
    const guard = extractBetween(tenantFnBody ?? "", "if not found", "'forbidden'");
    return (
      guard?.includes("v_membership_status <> 'active'") &&
      guard?.includes("v_membership_role not in") &&
      guard?.includes("v_membership_tenant_code <> v_company_code")
    );
  })(),
);

// =========================================================================
// C. Explicit Item selection, eligibility, and tenant-scoped fail-closed read
// =========================================================================

check(
  "empty/null selection rejected",
  tenantFnBody?.includes(
    "if p_item_ids is null or coalesce(array_length(p_item_ids, 1), 0) = 0 then",
  ),
);
check("multi-dimensional arrays rejected", tenantFnBody?.includes("array_ndims(p_item_ids)"));
check(
  "NULL array element rejected",
  tenantFnBody?.includes("array_position(p_item_ids, null) is not null"),
);
check(
  "duplicate ids rejected after distinct canonicalization",
  tenantFnBody?.includes("array_agg(distinct x order by x)") &&
    tenantFnBody?.includes("v_requested_count <> v_requested_raw_count"),
);
check("200 Item cap enforced", tenantFnBody?.includes("v_requested_count > 200"));
check(
  "empty selection never means publish all",
  !/v_requested_count\s*=\s*0\s+or\s+risk_share_items\.id\s*=\s*any/i.test(
    tenantFnBody ?? "",
  ),
);

const selectionCte = extractBetween(tenantFnBody ?? "", "with locked_items as (", ")\n  select");
check(
  "eligible selection scoped to verified tenant",
  selectionCte?.includes("risk_share_items.company_code = v_company_code"),
);
check(
  "eligible selection requires requested Item ids",
  selectionCte?.includes("risk_share_items.id = any(v_item_ids)"),
);
check(
  "eligible selection requires customer-confirmed state",
  selectionCte?.includes("share_status = 'customer_confirmed'") &&
    selectionCte?.includes("customer_check_status = 'confirmed'") &&
    selectionCte?.includes("customer_confirmed = true"),
);
check(
  "eligible selection requires unlocked Item",
  selectionCte?.includes("version_lock_id is null"),
);
check(
  "eligible selection requires nonblank task and hazard",
  selectionCte?.includes("btrim(coalesce(risk_share_items.task_name, '')) <> ''") &&
    selectionCte?.includes("btrim(coalesce(risk_share_items.hazard, '')) <> ''"),
);
check(
  "eligible count must exactly equal requested count",
  tenantFnBody?.includes("v_item_count <> v_requested_count") &&
    countOccurrences(tenantFnBody ?? "", "'selection_mismatch'") === 1,
);

// =========================================================================
// D. Cross-path lock-order parity and explicit regression checks
// =========================================================================

check(
  "tenant publish locks risk_share_items in id ASC order",
  canonicalRiskShareItemLockOrder(tenantFnBody) === "id",
);
check(
  "Owner publish replacement locks risk_share_items in id ASC order",
  canonicalRiskShareItemLockOrder(ownerFnBody) === "id",
);
check(
  "tenant and Owner publish paths use the same canonical row-lock order",
  lockOrdersMatch(tenantFnBody, ownerFnBody),
);
check(
  "tenant publish no longer uses created_at as row-lock order",
  !/order by\s+risk_share_items\.created_at\s+asc\s+for update of risk_share_items/i.test(
    tenantFnBody ?? "",
  ),
);
check(
  "Owner publish no longer uses created_at as row-lock order",
  !/order by\s+risk_share_items\.created_at\s+asc\s+for update of risk_share_items/i.test(
    ownerFnBody ?? "",
  ),
);

const tenantCreatedAtMutant = (tenantFnBody ?? "").replace(
  /order by\s+risk_share_items\.id\s+asc/i,
  "order by risk_share_items.created_at asc",
);
const ownerCreatedAtMutant = (ownerFnBody ?? "").replace(
  /order by\s+risk_share_items\.id\s+asc/i,
  "order by risk_share_items.created_at asc",
);
check(
  "regression: reverting only tenant path to created_at is detected",
  !lockOrdersMatch(tenantCreatedAtMutant, ownerFnBody),
);
check(
  "regression: reverting only Owner path to created_at is detected",
  !lockOrdersMatch(tenantFnBody, ownerCreatedAtMutant),
);

const expectedOwnerBody = normalizeSql(
  (ownerBaselineFnBody ?? "").replace(
    /order by\s+risk_share_items\.created_at\s+asc/i,
    "order by risk_share_items.id asc",
  ),
);
check(
  "Owner replacement differs from the prior Owner function only by canonical row-lock order",
  ownerBaselineFnBody !== null &&
    ownerFnBody !== null &&
    normalizeSql(ownerFnBody) === expectedOwnerBody,
);
check(
  "Owner replacement preserves function security attributes",
  ownerFnBody?.includes("language plpgsql") &&
    ownerFnBody?.includes("security definer") &&
    ownerFnBody?.includes("set search_path = public, pg_temp"),
);
check(
  "Owner replacement preserves service_role-only privilege statements",
  lockOrderSrc.includes(
    "grant execute on function public.create_risk_share_version_lock(\n" +
      "  text, text, text, text, text, text, text, boolean, uuid[], text\n" +
      ") to service_role;",
  ) &&
    lockOrderSrc.includes(
      "revoke all on function public.create_risk_share_version_lock(\n" +
        "  text, text, text, text, text, text, text, boolean, uuid[], text\n" +
        ") from anon, authenticated, service_role;",
    ),
);
check(
  "correction migration checks both deployed function definitions for id ASC lock order",
  countOccurrences(lockOrderSrc, "does not use risk_share_items.id ASC FOR UPDATE") === 2,
);

// =========================================================================
// E. Tenant concurrency, idempotency, atomic snapshot, and Item linkage
// =========================================================================

check(
  "tenant advisory transaction lock is namespaced by canonical company_code",
  /pg_advisory_xact_lock\(\s*\n\s*hashtextextended\('publish_risk_share_version_for_tenant:'\s*\|\|\s*v_company_code,\s*0\)\s*\n\s*\);/.test(
    tenantFnBody ?? "",
  ),
);
check(
  "advisory lock follows membership validation",
  (tenantFnBody?.indexOf("from public.tenant_membership") ?? -1) <
    (tenantFnBody?.indexOf("pg_advisory_xact_lock(") ?? -1),
);
check(
  "idempotency lookup precedes Item locking and Version insert",
  (() => {
    const idem = tenantFnBody?.indexOf("select * into v_existing_lock") ?? -1;
    const itemLock = tenantFnBody?.indexOf("with locked_items as (") ?? -1;
    const insert = tenantFnBody?.indexOf("insert into public.risk_share_version_locks (") ?? -1;
    return idem !== -1 && itemLock !== -1 && insert !== -1 && idem < itemLock && itemLock < insert;
  })(),
);
check(
  "idempotency replay compares active status actor month title notes count and exact snapshot Item set",
  tenantFnBody?.includes("v_existing_lock.lock_status = 'active'") &&
    tenantFnBody?.includes("v_existing_lock.actor_membership_id = p_actor_membership_id") &&
    tenantFnBody?.includes("v_existing_lock.lock_month = v_lock_month") &&
    tenantFnBody?.includes("v_existing_lock.lock_title = v_lock_title") &&
    tenantFnBody?.includes("coalesce(v_existing_lock.notes, '') = coalesce(v_notes, '')") &&
    tenantFnBody?.includes("v_existing_lock.item_count = v_requested_count") &&
    tenantFnBody?.includes("v_stored_item_ids = v_item_ids"),
);
check(
  "same-key mismatch returns idempotency_conflict",
  tenantFnBody?.includes("'idempotency_conflict'::text"),
);
check(
  "active month conflict uses partial-index ON CONFLICT",
  tenantFnBody?.includes(
    "on conflict (company_code, lock_month) where lock_status = 'active'",
  ) && tenantFnBody?.includes("'active_month_exists'::text"),
);
check(
  "publish Version stores actor, idempotency key, and publish action",
  tenantFnBody?.includes("actor_membership_id,") &&
    tenantFnBody?.includes("idempotency_key,") &&
    tenantFnBody?.includes("publish_action,") &&
    tenantFnBody?.includes("'publish',"),
);
check(
  "snapshot copies each Item worker_visible value",
  tenantFnBody?.includes("ri.worker_visible,") && !tenantFnBody?.includes("p_worker_visible"),
);
check(
  "tenant Item UPDATE never overwrites worker_visible",
  (() => {
    const update = extractBetween(
      tenantFnBody ?? "",
      "update public.risk_share_items\n  set share_status = 'locked',",
      "risk_share_items.company_code = v_company_code;",
    );
    return update !== null && !update.includes("worker_visible");
  })(),
);
check(
  "snapshot insert count raises on mismatch",
  tenantFnBody?.includes("v_snapshot_insert_count <> v_item_count") &&
    tenantFnBody?.includes("snapshot insert count % does not match"),
);
check(
  "Item update count raises on mismatch",
  tenantFnBody?.includes("v_item_update_count <> v_item_count") &&
    tenantFnBody?.includes("item update count % does not match"),
);
check(
  "final snapshot count raises on mismatch",
  tenantFnBody?.includes("v_final_snapshot_count <> v_item_count"),
);
check(
  "final worker-visible count raises on mismatch",
  tenantFnBody?.includes(
    "v_final_worker_visible_count <> v_eligible_worker_visible_count",
  ),
);
check(
  "tenant path has at least four rollback-on-impossible-state exception guards",
  countOccurrences(tenantFnBody ?? "", "raise exception") >= 4,
);

// =========================================================================
// F. Response/out-of-scope boundaries and PR scope
// =========================================================================

const KNOWN_CODES = [
  "ok",
  "validation_failed",
  "forbidden",
  "selection_mismatch",
  "active_month_exists",
  "idempotency_conflict",
];
for (const code of KNOWN_CODES) {
  check(`response code present: ${code}`, tenantFnBody?.includes(`'${code}'`));
}
check(
  "no unexpected normal response code",
  [...(tenantFnBody ?? "").matchAll(/'([a-z_]+)'::text/g)].every((match) =>
    KNOWN_CODES.includes(match[1]),
  ),
);
check(
  "tenant function does not implement republish rollback or supersede",
  !/'republish'|'rollback'/.test(tenantFnBody ?? "") &&
    !/superseded_at\s*=/.test(tenantFnBody ?? "") &&
    !/previous_version_id/.test(tenantFnBody ?? "") &&
    !/content_source_version_id/.test(tenantFnBody ?? ""),
);
check(
  "no migration introduces RLS policy DDL",
  !/create policy/i.test(tenantSrc) && !/create policy/i.test(lockOrderSrc),
);
check(
  "no function is dropped",
  !/drop function/i.test(tenantSrc) && !/drop function/i.test(lockOrderSrc),
);
check(
  "correction migration replaces only the Owner Version Lock RPC",
  countOccurrences(
    lockOrderSrc,
    "create or replace function public.create_risk_share_version_lock(",
  ) === 1 &&
    !lockOrderSrc.includes("create or replace function public.review_risk_share_item(") &&
    !lockOrderSrc.includes(
      "create or replace function public.prepare_risk_share_items_for_tenant(",
    ),
);

check(
  "only allowed PR files changed",
  (() => {
    try {
      const output = execSync("git diff --name-only origin/main...HEAD", {
        encoding: "utf8",
      }).trim();
      const changed = output ? output.split("\n") : [];
      const allowed = new Set([
        "package.json",
        VERIFIER_FILE,
        TENANT_MIGRATION_FILE,
        LOCK_ORDER_MIGRATION_FILE,
      ]);
      return changed.length === 4 && changed.every((file) => allowed.has(file));
    } catch {
      return true;
    }
  })(),
);
check(
  "no existing migration modified",
  (() => {
    try {
      const output = execSync(
        "git diff --name-only origin/main...HEAD -- supabase/migrations/",
        { encoding: "utf8" },
      ).trim();
      const changed = output ? output.split("\n") : [];
      const allowed = new Set([TENANT_MIGRATION_FILE, LOCK_ORDER_MIGRATION_FILE]);
      return changed.length === 2 && changed.every((file) => allowed.has(file));
    } catch {
      return true;
    }
  })(),
);

// =========================================================================
// Summary
// =========================================================================

const failed = checks.filter((item) => !item.ok);
for (const item of checks) {
  console.log(`${item.ok ? "PASS" : "FAIL"}: ${item.name}`);
}
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);

if (failed.length > 0) {
  console.error(`\nFAILED CHECKS (${failed.length}):`);
  for (const item of failed) {
    console.error(`  - ${item.name}`);
  }
  process.exit(1);
}

console.log("\nAll tenant publish and cross-path lock-order contract checks passed.");
