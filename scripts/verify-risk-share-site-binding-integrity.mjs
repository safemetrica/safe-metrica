import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const migration = read("supabase/migrations/20260722010000_add_risk_share_site_binding_integrity.sql");
const publicVersion = read("src/lib/risk-share/riskSharePublicVersion.ts");
const checks = [];
const assert = (condition, label) => {
  if (!condition) throw new Error(`FAIL: ${label}`);
  checks.push(label);
};

for (const table of ["risk_share_sources", "risk_share_item_candidates", "risk_share_items", "risk_share_version_locks", "risk_share_version_items", "field_participation_submissions"]) {
  assert(migration.includes(`alter table public.${table} add column if not exists site_id uuid`), `${table} receives nullable site_id`);
}
assert(migration.includes("on public.tenant_sites (id, tenant_code)"), "Composite tenant/site target exists");
assert(migration.includes("foreign key (site_id, %I)"), "Every site reference is tenant-safe");
assert(migration.includes("n.nspname = 'public' and r.relname = v_table"), "Constraint existence checks are schema/table scoped");
assert(!/\bupdate\s+public\.(risk_share_sources|risk_share_item_candidates|risk_share_items)\b/i.test(migration), "No legacy lineage backfill");
assert(migration.includes("bind_new_risk_share_source_to_default_site"), "Only source resolves canonical default");
assert(migration.includes("bind_new_risk_share_candidate_to_source_site"), "Candidate inherits source site");
assert(migration.includes("bind_new_risk_share_item_to_lineage_site"), "Item validates candidate/source lineage");
assert(migration.includes("rc.source_id = new.source_id"), "Item requires exact candidate/source lineage");
assert(migration.includes("site-bound source item is required"), "Legacy NULL Item publish fails closed");
assert(migration.includes("all Version items must share one site"), "Mixed-site Version fails closed");
assert(migration.includes("snapshot site does not match source item"), "Snapshot inherits source Item site");
assert(migration.includes("Legacy active Version confirmations remain NULL"), "Legacy confirmation continuity is explicit");
assert(migration.includes("confirmation site does not match version"), "Site-bound confirmation inherits Version site");
assert(!migration.includes("bind_new_risk_share_row_to_default_site"), "Per-stage default re-resolution removed");

assert(publicVersion.includes('select: "default_site_id"'), "Public read resolves canonical site server-side");
assert(publicVersion.includes('site_id: `eq.${siteId}`'), "Public Version query is site-scoped first");
assert(publicVersion.includes('query.set("site_id", "is.null")'), "Existing active NULL Version continuity retained");
assert(publicVersion.includes("if (rows[0]) return rows[0]"), "Site-bound Version wins over legacy fallback");
assert(publicVersion.includes('company_code: `eq.${companyCode}`'), "Public Version query remains tenant-scoped");
assert(publicVersion.includes('lock_status: "eq.active"'), "Public Version query remains active-only");

console.log(`PASS: ${checks.length} site-binding integrity contract checks`);
