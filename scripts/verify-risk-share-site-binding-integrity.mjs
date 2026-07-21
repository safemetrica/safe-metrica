import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const migration = read("supabase/migrations/20260722010000_add_risk_share_site_binding_integrity.sql");
const publicVersion = read("src/lib/risk-share/riskSharePublicVersion.ts");
const checks = [];
const assert = (condition, label) => {
  if (!condition) throw new Error(`FAIL: ${label}`);
  checks.push(label);
};

for (const table of [
  "risk_share_sources",
  "risk_share_item_candidates",
  "risk_share_items",
  "risk_share_version_locks",
  "risk_share_version_items",
  "field_participation_submissions",
]) {
  assert(
    migration.includes(`alter table public.${table} add column if not exists site_id uuid`),
    `${table} receives nullable site_id`,
  );
}

assert(migration.includes("on public.tenant_sites (id, tenant_code)"), "Composite tenant/site target exists");
assert(migration.includes("foreign key (site_id, %I)"), "Every site reference is tenant-safe");
assert(!/\bupdate\s+public\.(risk_share|field_participation)/i.test(migration), "No legacy row backfill");
assert(migration.includes("ts.status = 'active'"), "Canonical resolver requires active site");
assert(migration.includes("ts.is_default = true"), "Canonical resolver requires default site");
assert(migration.includes("site does not match canonical tenant default"), "Caller site mismatch fails closed");
assert(migration.includes("snapshot site does not match version"), "Snapshot inherits Version site");
assert(migration.includes("confirmation site does not match version"), "Confirmation inherits Version site");

assert(publicVersion.includes('select: "default_site_id"'), "Public read resolves canonical site server-side");
assert(publicVersion.includes('site_id: `eq.${siteId}`'), "Public Version query is site-scoped");
assert(publicVersion.includes('company_code: `eq.${companyCode}`'), "Public Version query remains tenant-scoped");
assert(publicVersion.includes('lock_status: "eq.active"'), "Public Version query remains active-only");
assert(publicVersion.includes('query.delete("site_id")'), "Pre-migration deployment compatibility is explicit");

console.log(`PASS: ${checks.length} site-binding integrity contract checks`);
