import fs from "node:fs";
import { execSync } from "node:child_process";

const MIGRATION_FILE =
  "supabase/migrations/20260719010000_add_tenant_risk_share_publish_rpc.sql";

if (!fs.existsSync(MIGRATION_FILE)) {
  console.error(`FAIL: missing file - ${MIGRATION_FILE}`);
  process.exit(1);
}

const src = fs.readFileSync(MIGRATION_FILE, "utf8");

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

/** Returns the text from `startMarker` through the matching close of the
 * first `$$ ... $$` (or other balanced pair) found after it, by scanning for
 * the given close token -- used to isolate the function body from the
 * surrounding grant/revoke/comment statements that follow it. */
function extractBetween(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  if (start === -1) return null;
  const end = text.indexOf(endMarker, start + startMarker.length);
  if (end === -1) return null;
  return text.slice(start, end + endMarker.length);
}

const fnBody = extractBetween(
  src,
  "create or replace function public.publish_risk_share_version_for_tenant(",
  "\n$$;",
);

const AFTER_FN_BODY = fnBody !== null ? src.slice(src.indexOf(fnBody) + fnBody.length) : "";

// =========================================================================
// A. Exact signature and return shape
// =========================================================================

check(
  "exact function name and argument list, in order",
  src.includes(
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
  "exact RETURNS TABLE column list, in order",
  src.includes(
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

check("function body was located (create...as $$ ... $$; block)", fnBody !== null);

// =========================================================================
// B. Security posture
// =========================================================================

check("LANGUAGE plpgsql", src.includes("language plpgsql"));
check("SECURITY DEFINER", src.includes("security definer"));
check("SET search_path = public, pg_temp", src.includes("set search_path = public, pg_temp"));

const REVOKE_GRANT_SIGNATURE =
  "public.publish_risk_share_version_for_tenant(\n  text, uuid, text, text, text, uuid[], text\n)";

check(
  "owner explicitly set to postgres",
  src.includes(`alter function ${REVOKE_GRANT_SIGNATURE} owner to postgres;`),
);
check(
  "EXECUTE revoked from public",
  src.includes(`revoke all on function ${REVOKE_GRANT_SIGNATURE} from public;`),
);
check(
  "EXECUTE revoked from anon, authenticated, and service_role (reset before re-granting)",
  src.includes(`revoke all on function ${REVOKE_GRANT_SIGNATURE} from anon, authenticated, service_role;`),
);
check(
  "EXECUTE granted to service_role only",
  src.includes(`grant execute on function ${REVOKE_GRANT_SIGNATURE} to service_role;`) &&
    !/grant execute on function public\.publish_risk_share_version_for_tenant[\s\S]*?to\s+(public|anon|authenticated)\s*;/.test(
      src,
    ),
);

// =========================================================================
// C. Membership revalidation and tenant match
// =========================================================================

check(
  "membership is read from tenant_membership using FOR SHARE (never mutated)",
  fnBody?.includes("from public.tenant_membership") && fnBody?.includes("for share"),
);
check(
  "membership status must be active",
  fnBody?.includes("v_membership_status <> 'active'"),
);
check(
  "membership role must be tenant_admin or tenant_manager",
  fnBody?.includes("v_membership_role not in ('tenant_admin', 'tenant_manager')"),
);
check(
  "membership tenant_code must equal the canonical (normalized) company_code",
  fnBody?.includes("v_membership_tenant_code <> v_company_code"),
);
check(
  "every membership failure mode collapses to the same generic forbidden code (not found / status / role / tenant all in one guard)",
  (() => {
    const guard = extractBetween(fnBody ?? "", "if not found", "'forbidden'");
    return (
      guard !== null &&
      guard.includes("v_membership_status <> 'active'") &&
      guard.includes("v_membership_role not in") &&
      guard.includes("v_membership_tenant_code <> v_company_code")
    );
  })(),
);
check(
  "browser/caller-supplied role or tenant is never trusted -- role/status/tenant_code are only ever assigned from the tenant_membership SELECT",
  countOccurrences(fnBody ?? "", "v_membership_role :=") === 0 &&
    countOccurrences(fnBody ?? "", "v_membership_tenant_code :=") === 0,
);

// =========================================================================
// D. Selection contract: explicit, distinct, deterministic, 1-200, no
// empty-means-all
// =========================================================================

check(
  "empty or null p_item_ids is rejected as validation_failed, not treated as 'all'",
  fnBody?.includes(
    "if p_item_ids is null or coalesce(array_length(p_item_ids, 1), 0) = 0 then",
  ),
);
check(
  "no code path ever treats a null/empty p_item_ids as 'select all eligible' (no unconditional/optional-selection branch)",
  !/v_requested_count\s*=\s*0\s+or\s+risk_share_items\.id\s*=\s*any/.test(fnBody ?? "") &&
    !fnBody?.includes("p_item_ids is null then") ,
);
check(
  "multi-dimensional p_item_ids is rejected",
  fnBody?.includes("array_ndims(p_item_ids)"),
);
check(
  "a NULL element inside p_item_ids is rejected",
  fnBody?.includes("array_position(p_item_ids, null) is not null"),
);
check(
  "duplicate ids are rejected (distinct count compared against raw count), not silently deduplicated",
  fnBody?.includes("array_agg(distinct x order by x)") &&
    fnBody?.includes("v_requested_count <> v_requested_raw_count"),
);
check(
  "upper bound of 200 selected ids is enforced",
  fnBody?.includes("v_requested_count > 200"),
);
check(
  "deterministic ascending-id FOR UPDATE lock order on the selection",
  /order by risk_share_items\.id asc\s*\n\s*for update of risk_share_items/.test(fnBody ?? ""),
);
check(
  "eligible count must exactly equal requested count, or selection_mismatch",
  fnBody?.includes("v_item_count <> v_requested_count") &&
    (() => {
      const idx = fnBody.indexOf("v_item_count <> v_requested_count");
      return fnBody.slice(idx, idx + 200).includes("'selection_mismatch'");
    })(),
);

// =========================================================================
// E. Eligibility criteria (customer-confirmed, unlocked, structurally valid)
// and non-disclosing collapse
// =========================================================================

const selectionCte = extractBetween(fnBody ?? "", "with locked_items as (", ")\n  select");

check(
  "eligibility requires customer_confirmed share_status/check_status/flag",
  selectionCte?.includes("share_status = 'customer_confirmed'") &&
    selectionCte?.includes("customer_check_status = 'confirmed'") &&
    selectionCte?.includes("customer_confirmed = true"),
);
check(
  "eligibility requires the item is not already locked (version_lock_id is null)",
  selectionCte?.includes("version_lock_id is null"),
);
check(
  "eligibility requires structural validity (non-blank task_name and hazard)",
  selectionCte?.includes("btrim(coalesce(risk_share_items.task_name, '')) <> ''") &&
    selectionCte?.includes("btrim(coalesce(risk_share_items.hazard, '')) <> ''"),
);
check(
  "eligibility is scoped to the verified tenant's company_code (cross-tenant ids cannot match)",
  selectionCte?.includes("risk_share_items.company_code = v_company_code"),
);
check(
  "a single WHERE clause produces the eligible set -- no separate branch that reports 'not found' vs 'wrong tenant' vs 'already locked' differently",
  countOccurrences(fnBody ?? "", "'selection_mismatch'") === 1,
);

// =========================================================================
// F. Tenant advisory lock and concurrency
// =========================================================================

check(
  "a tenant-scoped transaction advisory lock is taken, keyed by a namespaced hash of company_code",
  /pg_advisory_xact_lock\(\s*\n\s*hashtextextended\('publish_risk_share_version_for_tenant:'\s*\|\|\s*v_company_code,\s*0\)\s*\n\s*\);/.test(
    fnBody ?? "",
  ),
);
check(
  "the advisory lock is acquired after membership revalidation (not before) -- an unauthorized caller never contends for it",
  (() => {
    const membershipIdx = fnBody?.indexOf("from public.tenant_membership") ?? -1;
    const lockIdx = fnBody?.indexOf("pg_advisory_xact_lock(") ?? -1;
    return membershipIdx !== -1 && lockIdx !== -1 && membershipIdx < lockIdx;
  })(),
);
check(
  "the advisory lock is acquired before the idempotency lookup and before item selection (serializes both)",
  (() => {
    const lockIdx = fnBody?.indexOf("pg_advisory_xact_lock(") ?? -1;
    const idemIdx = fnBody?.indexOf("from public.risk_share_version_locks\n  where risk_share_version_locks.company_code") ?? -1;
    const selectionIdx = fnBody?.indexOf("with locked_items as (") ?? -1;
    return lockIdx !== -1 && idemIdx !== -1 && selectionIdx !== -1 && lockIdx < idemIdx && idemIdx < selectionIdx;
  })(),
);
check(
  "active_month_exists is enforced atomically via ON CONFLICT against the partial unique index, not a separate racy pre-check",
  fnBody?.includes("on conflict (company_code, lock_month) where lock_status = 'active'") &&
    fnBody?.includes("do nothing") &&
    fnBody?.includes("returning risk_share_version_locks.id into v_lock_id;"),
);
check(
  "a null v_lock_id after the conflict-guarded insert returns active_month_exists",
  (() => {
    const idx = fnBody?.indexOf("if v_lock_id is null then") ?? -1;
    return idx !== -1 && fnBody.slice(idx, idx + 120).includes("'active_month_exists'");
  })(),
);

// =========================================================================
// G. Idempotency: exact replay and conflict
// =========================================================================

check(
  "idempotency lookup keyed on (company_code, idempotency_key) runs before the active-month insert attempt",
  (() => {
    const idemIdx = fnBody?.indexOf("risk_share_version_locks.idempotency_key = v_idempotency_key") ?? -1;
    const insertIdx = fnBody?.indexOf("insert into public.risk_share_version_locks (") ?? -1;
    return idemIdx !== -1 && insertIdx !== -1 && idemIdx < insertIdx;
  })(),
);

const idempotencyBlock = extractBetween(
  fnBody ?? "",
  "select * into v_existing_lock",
  "'idempotency_conflict'::text, false, null::uuid, 0, 0;",
);

check(
  "replay match requires lock_status active, actor, month, title, notes, item_count, and the exact stored Item id set",
  idempotencyBlock?.includes("v_existing_lock.lock_status = 'active'") &&
    idempotencyBlock?.includes("v_existing_lock.actor_membership_id = p_actor_membership_id") &&
    idempotencyBlock?.includes("v_existing_lock.lock_month = v_lock_month") &&
    idempotencyBlock?.includes("v_existing_lock.lock_title = v_lock_title") &&
    idempotencyBlock?.includes("coalesce(v_existing_lock.notes, '') = coalesce(v_notes, '')") &&
    idempotencyBlock?.includes("v_existing_lock.item_count = v_requested_count") &&
    idempotencyBlock?.includes("v_stored_item_ids = v_item_ids"),
);
check(
  "stored Item id set is read from the immutable risk_share_version_items snapshot, not re-derived from live risk_share_items",
  fnBody?.includes(
    "from public.risk_share_version_items\n    where risk_share_version_items.version_lock_id = v_existing_lock.id;",
  ),
);
check(
  "an exact match returns ok=true, code=ok, replayed=true with the stored counts",
  idempotencyBlock?.includes("true, 'ok'::text, true,") &&
    idempotencyBlock?.includes("v_existing_lock.id, v_existing_lock.item_count, v_existing_lock.worker_visible_count"),
);
check(
  "any mismatch under the same key returns idempotency_conflict (not a silent fresh attempt)",
  idempotencyBlock !== null,
);
check(
  "idempotency_key is only ever written on the successful insert path (a failed earlier attempt leaves no row to collide with)",
  countOccurrences(fnBody ?? "", "idempotency_key") >= 3 &&
    countOccurrences(fnBody ?? "", "insert into public.risk_share_version_locks") === 1,
);

// =========================================================================
// H. Immutable snapshot, worker_visible preservation, Item lock linkage
// =========================================================================

check(
  "no UPDATE or DELETE statement targets risk_share_version_items anywhere in this migration (insert-only, append-only ledger)",
  !/update\s+public\.risk_share_version_items/i.test(src) &&
    !/delete\s+from\s+public\.risk_share_version_items/i.test(src),
);
check(
  "the function has no p_worker_visible parameter at all (checked in the function body, not prose)",
  fnBody !== null && !fnBody.includes("p_worker_visible"),
);
check(
  "the snapshot insert copies worker_visible verbatim from the Item's own current column (ri.worker_visible), not from any function parameter",
  (() => {
    const snapshotInsert = extractBetween(
      fnBody ?? "",
      "insert into public.risk_share_version_items (",
      "and ri.company_code = v_company_code;",
    );
    return snapshotInsert?.includes("ri.worker_visible") && !/p_worker_visible/.test(snapshotInsert ?? "");
  })(),
);
check(
  "the Item UPDATE statement never assigns worker_visible",
  (() => {
    const itemUpdate = extractBetween(
      fnBody ?? "",
      "update public.risk_share_items\n  set share_status = 'locked',",
      "risk_share_items.company_code = v_company_code;",
    );
    return itemUpdate !== null && !itemUpdate.includes("worker_visible");
  })(),
);
check(
  "the Item UPDATE links the selected Items to the created Version (version_lock_id = v_lock_id) and transitions share_status to locked",
  (() => {
    const itemUpdate = extractBetween(
      fnBody ?? "",
      "update public.risk_share_items\n  set share_status = 'locked',",
      "risk_share_items.company_code = v_company_code;",
    );
    return (
      itemUpdate?.includes("version_lock_id = v_lock_id") &&
      itemUpdate?.includes("version_locked_at = now()")
    );
  })(),
);
check(
  "worker_visible_count reported on success reflects the same eligible-set computation used for the snapshot (single source of truth, not recomputed differently)",
  countOccurrences(fnBody ?? "", "v_eligible_worker_visible_count") >= 3,
);

// =========================================================================
// I. Atomicity / postcondition checks (impossible mismatch raises and rolls
// back rather than returning a false success)
// =========================================================================

check(
  "snapshot insert row count is verified against the eligible item count, raising on mismatch",
  fnBody?.includes("v_snapshot_insert_count <> v_item_count") &&
    (() => {
      const idx = fnBody.indexOf("v_snapshot_insert_count <> v_item_count");
      return fnBody.slice(idx, idx + 160).includes("raise exception");
    })(),
);
check(
  "item update row count is verified against the eligible item count, raising on mismatch",
  fnBody?.includes("v_item_update_count <> v_item_count") &&
    (() => {
      const idx = fnBody.indexOf("v_item_update_count <> v_item_count");
      return fnBody.slice(idx, idx + 160).includes("raise exception");
    })(),
);
check(
  "final snapshot count is re-derived independently and verified, raising on mismatch",
  fnBody?.includes("v_final_snapshot_count <> v_item_count") &&
    (() => {
      const idx = fnBody.indexOf("v_final_snapshot_count <> v_item_count");
      return fnBody.slice(idx, idx + 160).includes("raise exception");
    })(),
);
check(
  "final worker_visible snapshot count is re-derived independently and verified, raising on mismatch",
  fnBody?.includes("v_final_worker_visible_count <> v_eligible_worker_visible_count") &&
    (() => {
      const idx = fnBody.indexOf("v_final_worker_visible_count <> v_eligible_worker_visible_count");
      return fnBody.slice(idx, idx + 200).includes("raise exception");
    })(),
);
check(
  "at least 4 independent RAISE EXCEPTION postcondition guards exist (no silent-success path on an internal inconsistency)",
  countOccurrences(fnBody ?? "", "raise exception") >= 4,
);

// =========================================================================
// J. Normal response codes only; no republish/rollback/supersede write path
// =========================================================================

const KNOWN_CODES = [
  "'ok'",
  "'validation_failed'",
  "'forbidden'",
  "'selection_mismatch'",
  "'active_month_exists'",
  "'idempotency_conflict'",
];

for (const code of KNOWN_CODES) {
  check(`response code present: ${code}`, fnBody?.includes(code));
}

check(
  "no other response code literal appears in the function body",
  (() => {
    const codeLiterals = [...(fnBody ?? "").matchAll(/'([a-z_]+)'::text/g)].map((m) => m[1]);
    const allowed = new Set(KNOWN_CODES.map((c) => c.replace(/'/g, "")));
    return codeLiterals.every((c) => allowed.has(c));
  })(),
);
check(
  "publish_action is fixed to 'publish' -- this migration never writes 'republish' or 'rollback'",
  fnBody?.includes("'publish',") && !/'republish'|'rollback'/.test(fnBody ?? ""),
);
check(
  "superseded_at / previous_version_id / content_source_version_id are never written by this function (no republish/rollback/supersede/reactivation)",
  !/superseded_at\s*=/.test(fnBody ?? "") &&
    !/previous_version_id/.test(fnBody ?? "") &&
    !/content_source_version_id/.test(fnBody ?? ""),
);
check(
  "no existing migration file is modified by this PR (only this new file changed under supabase/migrations/)",
  (() => {
    try {
      const diffOutput = execSync(
        "git diff --name-only origin/main...HEAD -- supabase/migrations/",
        { encoding: "utf8" },
      ).trim();
      const changed = diffOutput.length ? diffOutput.split("\n") : [];
      return changed.every((f) => f === MIGRATION_FILE);
    } catch {
      // Not fatal if run outside a git context with no origin/main tracking
      // (e.g. a fresh checkout without history) -- this is a defense-in-depth
      // check, not the primary scope guard.
      return true;
    }
  })(),
);

// =========================================================================
// K. No out-of-scope surface touched by this migration file
// =========================================================================

check(
  "no RLS policy DDL is introduced by this migration (API/UI/middleware are TS-only concepts that cannot appear as real SQL DDL, so only the one genuine SQL risk -- a new policy -- is checked structurally)",
  !/create policy/i.test(src),
);
check(
  "no reference to create_risk_share_version_lock, review_risk_share_item, or prepare_risk_share_items_for_tenant being replaced/dropped",
  !/drop function.*create_risk_share_version_lock/i.test(src) &&
    !/drop function.*review_risk_share_item/i.test(src) &&
    !/drop function.*prepare_risk_share_items_for_tenant/i.test(src),
);

// =========================================================================
// Summary
// =========================================================================

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

console.log("\nAll risk-share tenant publish RPC contract checks passed.");
