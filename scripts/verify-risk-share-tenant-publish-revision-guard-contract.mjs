import fs from "node:fs";

const LEGACY_TENANT_FILE =
  "supabase/migrations/20260719010000_add_tenant_risk_share_publish_rpc.sql";
const OWNER_CORRECTION_FILE =
  "supabase/migrations/20260719020000_align_risk_share_publish_lock_order.sql";
const REVIEW_CONTRACT_FILE =
  "supabase/migrations/20260716010000_add_risk_share_item_review_contract.sql";
const SNAPSHOT_FOUNDATION_FILE =
  "supabase/migrations/20260717000000_add_risk_share_version_snapshot_foundation.sql";
const CHECKED_MIGRATION_FILE =
  "supabase/migrations/20260720010000_add_tenant_risk_share_publish_revision_guard.sql";
const LEGACY_VERIFIER_FILE =
  "scripts/verify-risk-share-tenant-publish-rpc-contract.mjs";

const REQUIRED_FILES = [
  LEGACY_TENANT_FILE,
  OWNER_CORRECTION_FILE,
  REVIEW_CONTRACT_FILE,
  SNAPSHOT_FOUNDATION_FILE,
  CHECKED_MIGRATION_FILE,
  LEGACY_VERIFIER_FILE,
];

for (const file of REQUIRED_FILES) {
  if (!fs.existsSync(file)) {
    console.error(`FAIL: missing required file: ${file}`);
    process.exit(1);
  }
}

const legacySrc = fs.readFileSync(LEGACY_TENANT_FILE, "utf8");
const ownerSrc = fs.readFileSync(OWNER_CORRECTION_FILE, "utf8");
const reviewSrc = fs.readFileSync(REVIEW_CONTRACT_FILE, "utf8");
const snapshotSrc = fs.readFileSync(SNAPSHOT_FOUNDATION_FILE, "utf8");
const checkedSrc = fs.readFileSync(CHECKED_MIGRATION_FILE, "utf8");
const checks = [];

function check(name, condition) {
  checks.push({ name, ok: Boolean(condition) });
}

function count(text, needle) {
  return needle ? text.split(needle).length - 1 : 0;
}

function extractFunction(text, marker) {
  const start = text.indexOf(marker);
  if (start < 0) return null;
  const end = text.indexOf("\n$$;", start);
  if (end < 0) return null;
  return text.slice(start, end + 4);
}

function canonicalLockColumn(functionBody) {
  const match = functionBody?.match(
    /order\s+by\s+(?:risk_share_items\.|ri\.)(id|created_at)\s+asc\s+for\s+update(?:\s+of\s+(?:risk_share_items|ri))?/i,
  );
  return match?.[1]?.toLowerCase() ?? null;
}

function canonicalizePairs(itemIds, expectedRevisions) {
  if (!Array.isArray(itemIds) || !Array.isArray(expectedRevisions)) return null;
  if (itemIds.length < 1 || itemIds.length > 200) return null;
  if (itemIds.length !== expectedRevisions.length) return null;
  if (new Set(itemIds).size !== itemIds.length) return null;
  if (
    itemIds.some((itemId) => typeof itemId !== "string" || itemId.length === 0) ||
    expectedRevisions.some(
      (revision) => !Number.isInteger(revision) || revision < 1,
    )
  ) {
    return null;
  }

  const pairs = itemIds
    .map((itemId, index) => ({
      itemId,
      expectedRevision: expectedRevisions[index],
    }))
    .sort((left, right) => left.itemId.localeCompare(right.itemId));

  return {
    itemIds: pairs.map((pair) => pair.itemId),
    expectedRevisions: pairs.map((pair) => pair.expectedRevision),
  };
}

function replayMatches(expected, snapshot, live) {
  return (
    JSON.stringify(expected.itemIds) === JSON.stringify(snapshot.itemIds) &&
    JSON.stringify(expected.itemIds) === JSON.stringify(live.itemIds) &&
    JSON.stringify(expected.expectedRevisions) ===
      JSON.stringify(snapshot.reviewRevisions) &&
    JSON.stringify(expected.expectedRevisions) ===
      JSON.stringify(live.reviewRevisions)
  );
}

const legacyFn = extractFunction(
  legacySrc,
  "create or replace function public.publish_risk_share_version_for_tenant(",
);
const ownerFn = extractFunction(
  ownerSrc,
  "create or replace function public.create_risk_share_version_lock(",
);
const checkedFn = extractFunction(
  checkedSrc,
  "create or replace function public.publish_risk_share_version_for_tenant_checked(",
);

// A. Additive identity and scope.
check("legacy tenant migration exists", fs.existsSync(LEGACY_TENANT_FILE));
check("Owner lock-order migration exists", fs.existsSync(OWNER_CORRECTION_FILE));
check("checked migration exists", fs.existsSync(CHECKED_MIGRATION_FILE));
check("legacy tenant function found", legacyFn !== null);
check("Owner function found", ownerFn !== null);
check("checked function found", checkedFn !== null);
check(
  "checked migration defines exactly one checked RPC",
  count(
    checkedSrc,
    "create or replace function public.publish_risk_share_version_for_tenant_checked(",
  ) === 1,
);
check(
  "checked migration does not replace the legacy tenant RPC",
  count(
    checkedSrc,
    "create or replace function public.publish_risk_share_version_for_tenant(",
  ) === 0,
);
check(
  "checked migration does not replace the Owner RPC",
  !checkedSrc.includes(
    "create or replace function public.create_risk_share_version_lock(",
  ),
);
check(
  "checked migration has exact additive signature",
  checkedSrc.includes(
    "create or replace function public.publish_risk_share_version_for_tenant_checked(\n" +
      "  p_company_code text,\n" +
      "  p_actor_membership_id uuid,\n" +
      "  p_lock_month text,\n" +
      "  p_lock_title text,\n" +
      "  p_notes text,\n" +
      "  p_item_ids uuid[],\n" +
      "  p_expected_review_revisions bigint[],\n" +
      "  p_idempotency_key text\n" +
      ")",
  ),
);
check(
  "checked RPC preserves legacy return shape",
  checkedSrc.includes(
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
  "checked migration fail-closes unexpected overloads",
  checkedSrc.includes("unexpected overload exists") &&
    checkedSrc.includes("v_total_count = 0") &&
    checkedSrc.includes("v_total_count = 1 and v_exact_count = 1"),
);

// A1. Actual revision-ledger and Owner prerequisites.
check(
  "canonical review revision SSOT is bigint",
  reviewSrc.includes(
    "add column if not exists review_revision bigint not null default 1;",
  ) && reviewSrc.includes("p_expected_revision bigint"),
);
check(
  "canonical snapshot revision SSOT is bigint NOT NULL",
  snapshotSrc.includes("source_review_revision bigint not null"),
);
check(
  "checked RPC uses bigint revision arrays end-to-end",
  checkedSrc.includes("p_expected_review_revisions bigint[]") &&
    checkedSrc.includes("v_expected_review_revisions bigint[]") &&
    checkedSrc.includes("v_stored_review_revisions bigint[]") &&
    checkedSrc.includes("v_replay_live_review_revisions bigint[]") &&
    checkedSrc.includes("v_eligible_review_revisions bigint[]") &&
    checkedSrc.includes("v_final_snapshot_review_revisions bigint[]") &&
    checkedSrc.includes("v_final_live_review_revisions bigint[]") &&
    checkedSrc.includes("'{}'::bigint[]") &&
    !checkedSrc.includes("integer[]"),
);
check(
  "checked migration validates actual bigint NOT NULL revision columns",
  checkedSrc.includes("from pg_attribute a") &&
    checkedSrc.includes("c.relname = 'risk_share_items'") &&
    checkedSrc.includes("a.attname = 'review_revision'") &&
    checkedSrc.includes("c.relname = 'risk_share_version_items'") &&
    checkedSrc.includes("a.attname = 'source_review_revision'") &&
    checkedSrc.includes("is distinct from 'bigint'::regtype::oid") &&
    checkedSrc.includes("is distinct from true"),
);
check(
  "checked migration validates the exact live Owner RPC prerequisite",
  checkedSrc.includes(
    "public.create_risk_share_version_lock(text,text,text,text,text,text,text,boolean,uuid[],text)",
  ) &&
    checkedSrc.includes("v_owner_total_count <> 1") &&
    checkedSrc.includes("v_owner_oid is null") &&
    checkedSrc.includes("v_owner_definition := pg_get_functiondef(v_owner_oid)") &&
    checkedSrc.includes(
      "risk_share_items\\.id[[:space:]]+asc[[:space:]]+for update of risk_share_items",
    ),
);

// B. SECURITY DEFINER and tenant boundary.
check("checked RPC language is plpgsql", checkedFn?.includes("language plpgsql"));
check("checked RPC is SECURITY DEFINER", checkedFn?.includes("security definer"));
check(
  "checked RPC has fixed search_path",
  checkedFn?.includes("set search_path = public, pg_temp"),
);
check(
  "checked RPC re-derives and locks membership",
  checkedFn?.includes("from public.tenant_membership tm") &&
    checkedFn?.includes("for share;"),
);
check(
  "checked RPC requires active tenant admin or manager",
  checkedFn?.includes("v_membership_status <> 'active'") &&
    checkedFn?.includes(
      "v_membership_role not in ('tenant_admin', 'tenant_manager')",
    ) &&
    checkedFn?.includes("v_membership_tenant_code <> v_company_code"),
);
check(
  "checked and legacy tenant RPCs share the same advisory namespace",
  checkedFn?.includes(
    "'publish_risk_share_version_for_tenant:' || v_company_code",
  ) &&
    legacyFn?.includes(
      "'publish_risk_share_version_for_tenant:' || v_company_code",
    ),
);
check(
  "checked advisory functions are pg_catalog-qualified",
  checkedFn?.includes("pg_catalog.pg_advisory_xact_lock(") &&
    checkedFn?.includes("pg_catalog.hashtextextended("),
);

// C. Parallel Item/revision input contract.
check(
  "checked RPC rejects null empty multidimensional and null-element arrays",
  checkedFn?.includes("p_item_ids is null") &&
    checkedFn?.includes("p_expected_review_revisions is null") &&
    checkedFn?.includes("array_ndims(p_item_ids)") &&
    checkedFn?.includes("array_ndims(p_expected_review_revisions)") &&
    checkedFn?.includes("array_position(p_item_ids, null)") &&
    checkedFn?.includes("array_position(p_expected_review_revisions, null)"),
);
check(
  "checked RPC requires equal Item and revision lengths",
  checkedFn?.includes("v_requested_raw_count <> v_revision_raw_count"),
);
check(
  "checked RPC canonicalizes Item/revision pairs together",
  checkedFn?.includes("from unnest(\n    p_item_ids,\n    p_expected_review_revisions") &&
    checkedFn?.includes("array_agg(requested_id order by requested_id)") &&
    checkedFn?.includes("array_agg(expected_revision order by requested_id)"),
);
check(
  "checked RPC rejects duplicate Items and enforces 1-200",
  checkedFn?.includes("count(distinct requested_id)::integer") &&
    checkedFn?.includes("v_distinct_item_count <> v_requested_raw_count") &&
    checkedFn?.includes("v_requested_count not between 1 and 200"),
);
check(
  "checked RPC requires positive integer revisions",
  checkedFn?.includes("from unnest(v_expected_review_revisions)") &&
    checkedFn?.includes("where revision.value < 1"),
);

const canonical = canonicalizePairs(["item-b", "item-a"], [4, 2]);
check(
  "mirror canonicalizes unsorted Item/revision pairs",
  JSON.stringify(canonical) ===
    JSON.stringify({
      itemIds: ["item-a", "item-b"],
      expectedRevisions: [2, 4],
    }),
);
check(
  "mirror rejects mismatched array lengths",
  canonicalizePairs(["item-a"], [1, 2]) === null,
);
check(
  "mirror rejects duplicate Item ids",
  canonicalizePairs(["item-a", "item-a"], [1, 1]) === null,
);
check(
  "mirror rejects non-positive revisions",
  canonicalizePairs(["item-a"], [0]) === null,
);
check(
  "mirror preserves a revision above the int4 maximum",
  JSON.stringify(canonicalizePairs(["item-a"], [2147483648])) ===
    JSON.stringify({ itemIds: ["item-a"], expectedRevisions: [2147483648] }),
);
check(
  "mirror rejects over-200 selection",
  canonicalizePairs(
    Array.from({ length: 201 }, (_, index) => `item-${index}`),
    Array.from({ length: 201 }, () => 1),
  ) === null,
);

// D. Transaction-time revision lock and eligibility.
const checkedSelection = checkedFn?.slice(
  checkedFn.indexOf("with requested as ("),
  checkedFn.indexOf("-- 6. Create the Version"),
);
check(
  "checked selection is scoped to canonical tenant and explicit requested ids",
  checkedSelection?.includes("ri.company_code = v_company_code") &&
    checkedSelection?.includes("ri.id = requested.requested_id"),
);
check(
  "checked selection requires the same publish eligibility contract",
  checkedSelection?.includes("ri.share_status = 'customer_confirmed'") &&
    checkedSelection?.includes("ri.customer_check_status = 'confirmed'") &&
    checkedSelection?.includes("ri.customer_confirmed = true") &&
    checkedSelection?.includes("ri.version_lock_id is null") &&
    checkedSelection?.includes("btrim(coalesce(ri.task_name, '')) <> ''") &&
    checkedSelection?.includes("btrim(coalesce(ri.hazard, '')) <> ''") &&
    checkedSelection?.includes("ri.worker_visible is not null"),
);
check(
  "checked selection compares transaction-time review revision",
  checkedSelection?.includes(
    "ri.review_revision = requested.expected_revision",
  ),
);
check(
  "checked selection locks Items in canonical id order",
  canonicalLockColumn(checkedFn) === "id",
);
check(
  "legacy tenant and Owner paths retain canonical id lock order",
  canonicalLockColumn(legacyFn) === "id" &&
    canonicalLockColumn(ownerFn) === "id",
);
check(
  "all three publish paths use the same Item lock order",
  canonicalLockColumn(checkedFn) === canonicalLockColumn(legacyFn) &&
    canonicalLockColumn(checkedFn) === canonicalLockColumn(ownerFn),
);
check(
  "fresh revision mismatch fails as selection_mismatch",
  checkedFn?.includes(
    "v_eligible_review_revisions <> v_expected_review_revisions",
  ) && count(checkedFn ?? "", "'selection_mismatch'::text") === 1,
);

// E. Exact replay includes immutable and live revision parity.
check(
  "replay derives snapshot Item and review-revision arrays",
  checkedFn?.includes("v_stored_item_ids") &&
    checkedFn?.includes("v_stored_review_revisions") &&
    checkedFn?.includes(
      "array_agg(vi.source_review_revision order by vi.source_item_id)",
    ),
);
check(
  "replay derives live Item and review-revision arrays",
  checkedFn?.includes("v_replay_live_item_ids") &&
    checkedFn?.includes("v_replay_live_review_revisions") &&
    checkedFn?.includes("array_agg(ri.review_revision order by ri.id)"),
);
check(
  "replay compares exact Item and revision arrays",
  checkedFn?.includes("v_stored_item_ids = v_item_ids") &&
    checkedFn?.includes("v_replay_live_item_ids = v_item_ids") &&
    checkedFn?.includes(
      "v_stored_review_revisions = v_expected_review_revisions",
    ) &&
    checkedFn?.includes(
      "v_replay_live_review_revisions = v_expected_review_revisions",
    ),
);
check(
  "same-key revision drift returns idempotency_conflict",
  count(checkedFn ?? "", "'idempotency_conflict'::text") === 1,
);

const expectedReplay = {
  itemIds: ["item-a", "item-b"],
  expectedRevisions: [2, 4],
};
check(
  "mirror accepts exact snapshot/live revision replay",
  replayMatches(
    expectedReplay,
    { itemIds: ["item-a", "item-b"], reviewRevisions: [2, 4] },
    { itemIds: ["item-a", "item-b"], reviewRevisions: [2, 4] },
  ),
);
check(
  "mirror rejects snapshot revision drift",
  !replayMatches(
    expectedReplay,
    { itemIds: ["item-a", "item-b"], reviewRevisions: [3, 4] },
    { itemIds: ["item-a", "item-b"], reviewRevisions: [2, 4] },
  ),
);
check(
  "mirror rejects live revision drift",
  !replayMatches(
    expectedReplay,
    { itemIds: ["item-a", "item-b"], reviewRevisions: [2, 4] },
    { itemIds: ["item-a", "item-b"], reviewRevisions: [2, 5] },
  ),
);
check(
  "mirror rejects Item-set drift",
  !replayMatches(
    expectedReplay,
    { itemIds: ["item-a", "item-c"], reviewRevisions: [2, 4] },
    { itemIds: ["item-a", "item-b"], reviewRevisions: [2, 4] },
  ),
);

// F. Atomic snapshot/live postconditions preserve revision parity.
check(
  "checked snapshot stores source review revision",
  checkedFn?.includes("source_review_revision") &&
    checkedFn?.includes("ri.review_revision"),
);
check(
  "final snapshot parity includes expected revisions",
  checkedFn?.includes("v_final_snapshot_review_revisions") &&
    checkedFn?.includes(
      "v_final_snapshot_review_revisions <>\n       v_expected_review_revisions",
    ),
);
check(
  "final live parity includes expected revisions",
  checkedFn?.includes("v_final_live_review_revisions") &&
    checkedFn?.includes(
      "v_final_live_review_revisions <>\n       v_expected_review_revisions",
    ),
);
check(
  "snapshot and live mutation counts are enforced",
  checkedFn?.includes("v_snapshot_insert_count <> v_item_count") &&
    checkedFn?.includes("v_item_update_count <> v_item_count"),
);
check(
  "live Item update does not alter review content revision or visibility",
  (() => {
    const start = checkedFn?.indexOf("update public.risk_share_items ri") ?? -1;
    const end = checkedFn?.indexOf(
      "get diagnostics v_item_update_count",
      start,
    ) ?? -1;
    if (start < 0 || end < 0) return false;
    const update = checkedFn.slice(start, end);
    return (
      update.includes("version_lock_id = v_lock_id") &&
      !update.includes("review_revision") &&
      !update.includes("worker_visible") &&
      !update.includes("task_name") &&
      !update.includes("hazard")
    );
  })(),
);

// G. Apply-time identity, compatibility, and ACL checks.
check(
  "apply-time checks exact checked and legacy function counts",
  checkedSrc.includes("v_checked_total_count <> 1") &&
    checkedSrc.includes("v_checked_exact_count <> 1") &&
    checkedSrc.includes("v_legacy_total_count <> 1") &&
    checkedSrc.includes("v_legacy_exact_count <> 1"),
);
check(
  "apply-time checks exact checked arguments and result",
  checkedSrc.includes("pg_get_function_identity_arguments(v_checked_oid)") &&
    checkedSrc.includes("pg_get_function_result(v_checked_oid)"),
);
check(
  "apply-time checks postgres owner security definer and search_path",
  checkedSrc.includes("r.rolname = 'postgres'") &&
    checkedSrc.includes("p.prosecdef") &&
    checkedSrc.includes(
      "p.proconfig = array['search_path=public, pg_temp']::text[]",
    ),
);
check(
  "checked RPC is service-role-only with no grant option",
  checkedSrc.includes(
    "from anon, authenticated, service_role;",
  ) &&
    checkedSrc.includes("to service_role;") &&
    checkedSrc.includes("acl.grantee = 0") &&
    checkedSrc.includes(
      "grantee_role.rolname is distinct from 'service_role'",
    ) &&
    checkedSrc.includes("acl.is_grantable"),
);
check(
  "apply-time checks shared advisory namespace and lock order",
  checkedSrc.includes("advisory namespace mismatch") &&
    checkedSrc.includes("Item lock order mismatch"),
);
check(
  "apply-time checks fresh and replay revision guards",
  checkedSrc.includes("revision guard mismatch") &&
    checkedSrc.includes(
      "ri.review_revision = requested.expected_revision",
    ) &&
    checkedSrc.includes(
      "v_stored_review_revisions = v_expected_review_revisions",
    ) &&
    checkedSrc.includes(
      "v_replay_live_review_revisions = v_expected_review_revisions",
    ),
);

// H. Response and forbidden-scope boundaries.
const normalCodes = [
  "ok",
  "validation_failed",
  "forbidden",
  "selection_mismatch",
  "active_month_exists",
  "idempotency_conflict",
];
for (const code of normalCodes) {
  check(`checked normal response code present: ${code}`, checkedFn?.includes(`'${code}'`));
}
check(
  "checked RPC has no unexpected normal response code",
  [...(checkedFn ?? "").matchAll(/'([a-z_]+)'::text/g)].every((match) =>
    normalCodes.includes(match[1]),
  ),
);
check(
  "checked migration introduces no RLS or schema-table change",
  !/create\s+policy|alter\s+table|create\s+table/i.test(checkedSrc),
);
check(
  "checked migration drops no function or table",
  !/drop\s+function|drop\s+table/i.test(checkedSrc),
);
check(
  "checked RPC does not implement republish rollback supersede or reactivation",
  !/'republish'|'rollback'/.test(checkedFn ?? "") &&
    !/update\s+public\.risk_share_version_locks/i.test(checkedFn ?? "") &&
    !/delete\s+from\s+public\.risk_share_version_locks/i.test(checkedFn ?? ""),
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

console.log("\nAll tenant publish revision-guard contract checks passed.");