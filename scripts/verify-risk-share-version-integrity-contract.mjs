import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const checks = [];
const assert = (condition, label) => {
  if (!condition) throw new Error(`FAIL: ${label}`);
  checks.push(label);
};

const publicVersion = read("src/lib/risk-share/riskSharePublicVersion.ts");
const participationPage = read("src/app/risk-share/participation/page.tsx");
const submitRoute = read("src/app/api/risk-share/participation/submit/route.ts");
const confirmation = read("src/lib/risk-share/riskShareVersionConfirmation.ts");
const monthlyPage = read("src/app/risk-share/monthly/page.tsx");
const monthlyView = read("src/components/risk-share/monthly/MonthlyDesignerView.tsx");
const migration = read("supabase/migrations/20260720020000_add_worker_confirmation_version_integrity.sql");

assert(publicVersion.includes('"risk_share_version_items"'), "Public Read uses immutable Snapshot table");
assert(!publicVersion.includes('"risk_share_items"'), "Public Read does not query live Items");
assert(publicVersion.includes('version_lock_id: `eq.${versionLockId}`'), "Snapshot is scoped to displayed Version");
assert(publicVersion.includes('company_code: `eq.${companyCode}`'), "Snapshot is scoped to tenant");
assert(publicVersion.includes('worker_visible: "eq.true"'), "Snapshot exposes worker-visible rows only");
assert(publicVersion.includes('order: "position.asc,source_item_id.asc"'), "Snapshot order is deterministic");
assert(publicVersion.includes("workerVisibleCount !== itemRows.length"), "Snapshot count mismatch fails closed");

assert(participationPage.includes('name="versionLockId"'), "Page carries displayed Version ID");
assert(participationPage.includes('name="shareItemId"'), "Page carries displayed Snapshot Item IDs");
assert(participationPage.includes('name="confirmationIdempotencyKey"'), "Page carries one retry identity");

assert(submitRoute.includes("resolveActiveRiskSharePublicVersion(tenant.code)"), "Submit re-resolves active Version for stale-page detection");
assert(submitRoute.includes("submittedVersionLockId !== versionResult.version.lock.id"), "Stale Version fails closed");
assert(submitRoute.includes("submittedShareItemIds.length === expectedItemIds.length"), "Item ID length is checked");
assert(submitRoute.includes("submittedIdSet.size === submittedShareItemIds.length"), "Duplicate Item IDs fail closed");
assert(submitRoute.includes("expectedItemIds.every((id) => submittedIdSet.has(id))"), "Submitted IDs must equal Snapshot IDs");
assert(submitRoute.includes("getFormChecked(formData, `shareItemConfirmed-${id}`)"), "Every displayed Item requires confirmation");
assert(submitRoute.includes("createHash(\"sha256\")"), "Confirmation request has a stable digest");
assert(submitRoute.includes("insertRiskShareVersionConfirmation"), "Monthly confirmation uses Version-aware writer");

assert(confirmation.includes('on_conflict: "tenant_code,confirmation_idempotency_key"'), "Retry identity is tenant-scoped");
assert(confirmation.includes("resolution=ignore-duplicates,return=representation"), "Duplicate retry is non-mutating");
assert(confirmation.includes("existing.version_lock_id === versionLockId"), "Replay must match Version");
assert(confirmation.includes("existing.confirmation_request_digest === digest"), "Replay must match request digest");
assert(confirmation.includes("JSON.stringify(existingItemIds) === JSON.stringify(itemIds)"), "Replay must match canonical Item IDs");
assert(confirmation.includes('"idempotency_conflict"'), "Changed retry payload is rejected");

for (const column of [
  "version_lock_id uuid",
  "confirmed_share_item_ids uuid[]",
  "confirmation_idempotency_key text",
  "confirmation_request_digest text",
]) {
  assert(migration.includes(column), `Migration adds ${column}`);
}
assert(migration.includes("foreign key (version_lock_id, tenant_code)"), "DB ties confirmation to tenant and Version");
assert(migration.includes("references public.risk_share_version_locks (id, company_code)"), "DB Version FK targets immutable lock");
assert(migration.includes("on delete restrict"), "Confirmed Version cannot be deleted through FK");
assert(migration.includes("cardinality(confirmed_share_item_ids) between 1 and 100"), "DB bounds confirmed Item list");
assert(migration.includes("array_position(confirmed_share_item_ids, null) is null"), "DB rejects NULL Item IDs");
assert(migration.includes("unique (tenant_code, confirmation_idempotency_key)"), "DB enforces retry uniqueness");
assert(!/\b(delete|update)\s+public\./i.test(migration), "Migration does not rewrite or delete existing rows");

assert(monthlyPage.includes('query.set("select", "version_lock_id,raw_payload")'), "Monthly read selects Version linkage");
assert(monthlyPage.includes("versionLinkedMonthly"), "Monthly output counts linked confirmations");
assert(monthlyPage.includes("versionUnlinkedMonthly"), "Monthly output counts unlinked confirmations");
assert(monthlyPage.includes("confirmedVersionCount"), "Monthly output counts distinct Versions");
assert(monthlyView.includes("게시 Version 연결"), "Monthly UI exposes Version linkage status");

const touched = process.env.VERSION_INTEGRITY_CHANGED_FILES?.split("\n").filter(Boolean) ?? [];
const forbidden = [
  /^src\/app\/(?!risk-share\/)/,
  /^src\/app\/risk-share\/(daedo|dongwoo|hankookgreen|bubblemon|mons|richi)/,
  /^src\/app\/api\/(?!risk-share\/participation\/submit\/route\.ts$)/,
];
for (const path of touched) {
  assert(!forbidden.some((pattern) => pattern.test(path)), `Scope allowed: ${path}`);
}

console.log(`PASS: ${checks.length} Version integrity contract checks`);
