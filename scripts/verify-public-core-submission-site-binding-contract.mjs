import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const migrationPath =
  "supabase/migrations/20260723010000_bind_public_core_submissions_to_default_site.sql";
const migration = read(migrationPath);
const previousMigration = read(
  "supabase/migrations/20260722010000_add_risk_share_site_binding_integrity.sql",
);
const checks = [];
const assert = (condition, label) => {
  if (!condition) throw new Error(`FAIL: ${label}`);
  checks.push(label);
};

assert(
  migration.includes("create or replace function public.bind_new_confirmation_to_version_site()"),
  "Existing site-binding trigger function is replaced in place",
);
assert(
  !/create\s+(?:or\s+replace\s+)?trigger/i.test(migration),
  "Existing trigger identity is preserved",
);
assert(
  migration.includes("if new.version_lock_id is null then"),
  "Non-Version path is handled explicitly",
);

for (const kind of [
  "anonymous_feedback",
  "visitor_confirmation",
  "representative_confirmation",
]) {
  assert(migration.includes(`'${kind}'`), `${kind} is in the exact public Core allowlist`);
}

assert(
  migration.includes("join public.tenant_sites ts") &&
    migration.includes("ts.id = tr.default_site_id") &&
    migration.includes("ts.tenant_id = tr.id") &&
    migration.includes("ts.tenant_code = tr.company_code") &&
    migration.includes("ts.status = 'active'") &&
    migration.includes("ts.is_default = true"),
  "Canonical site pointer is revalidated against the active tenant default",
);
assert(
  migration.includes("where tr.company_code = new.tenant_code"),
  "Canonical site resolution is tenant-scoped",
);
assert(
  migration.includes("canonical active default site is required for public Core submission"),
  "Missing canonical site fails closed",
);
assert(
  migration.includes("public Core submission site does not match canonical tenant default"),
  "Cross-site caller input fails closed",
);
assert(
  migration.includes("new.site_id := v_site_id"),
  "Supported new Public Core rows inherit the canonical site",
);
assert(
  migration.includes("site requires a version or supported public Core submission kind"),
  "Unsupported non-Version rows cannot inject a site",
);

for (const contract of [
  "tenant-matched version is required",
  "Legacy active Version confirmations remain NULL",
  "legacy version cannot accept a site",
  "confirmation site does not match version",
]) {
  assert(migration.includes(contract), `Version-linked contract retained: ${contract}`);
  assert(previousMigration.includes(contract), `Version-linked contract matches prior migration: ${contract}`);
}

assert(
  !/\b(update|delete|insert)\s+(?:into\s+|from\s+)?public\.field_participation_submissions\b/i.test(
    migration,
  ),
  "Existing submission rows are not mutated or backfilled",
);
assert(
  !/^\s*(?:alter\s+(?:table|policy)|create\s+policy|grant)\b/im.test(migration),
  "Schema, RLS, and grants are not expanded",
);
assert(
  migration.includes(
    "revoke execute on function public.bind_new_confirmation_to_version_site() from anon, authenticated",
  ),
  "Direct public-role execution remains denied",
);
assert(
  migration.includes("security definer") &&
    migration.includes("set search_path = public, pg_temp"),
  "Trigger function security boundary remains explicit",
);
assert(
  migration.includes("Production preflight (read-only)") &&
    migration.includes("Production post-check (read-only)") &&
    migration.includes("Rollback definition (separate approval required)"),
  "Preflight, post-check, and rollback boundaries are documented",
);

console.log(`PASS: ${checks.length} Public Core site-binding contract checks`);
