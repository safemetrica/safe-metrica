import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const contract = read("docs/product/SAFEMETRICA_RISK_SHARE_VERSION_LIFECYCLE_CONTRACT_V1.md");
const foundation = read("supabase/migrations/20260717000000_add_risk_share_version_snapshot_foundation.sql");
const publish = read("supabase/migrations/20260720010000_add_tenant_risk_share_publish_revision_guard.sql");
const publicVersion = read("src/lib/risk-share/riskSharePublicVersion.ts");
const confirmation = read("supabase/migrations/20260720020000_add_worker_confirmation_version_integrity.sql");
const preflight = read("docs/operations/RISK_SHARE_VERSION_LIFECYCLE_PRODUCTION_PREFLIGHT.sql");

let passed = 0;
const checks = [];

function check(label, condition) {
  if (!condition) throw new Error(`FAIL: ${label}`);
  passed += 1;
  checks.push(`PASS: ${label}`);
}

for (const column of [
  "previous_version_id",
  "content_source_version_id",
  "actor_membership_id",
  "idempotency_key",
  "superseded_at",
  "publish_action",
]) {
  check(`foundation contains ${column}`, foundation.includes(column));
}

check(
  "version action values reserve republish and rollback",
  foundation.includes("'legacy', 'publish', 'republish', 'rollback'"),
);
check(
  "existing publish remains publish-only",
  publish.includes("publish_action") &&
    publish.includes("'publish'") &&
    !publish.includes("'republish'::text") &&
    !publish.includes("'rollback'::text"),
);
check(
  "public resolver reads active rows newest first",
  publicVersion.includes('lock_status: "eq.active"') &&
    publicVersion.includes('order: "created_at.desc"') &&
    publicVersion.includes('limit: "1"'),
);
check(
  "confirmation is durably linked to version",
  confirmation.includes("version_lock_id uuid") &&
    confirmation.includes("foreign key (version_lock_id, tenant_code)"),
);
check(
  "contract forbids historical reactivation",
  contract.includes("reactivate a historical row") &&
    contract.includes("reveal an older active version as an accidental fallback"),
);
check(
  "contract preserves old confirmations",
  contract.includes("preserving all earlier confirmations") &&
    contract.includes("confirmation of new content"),
);
check(
  "contract requires tenant and site transaction scope",
  contract.includes("tenant and site scope is re-derived inside the transaction"),
);
check(
  "contract requires lifecycle idempotency conflict",
  contract.includes("returns an idempotency conflict"),
);
check(
  "contract holds production writes",
  contract.includes("actual customer-data transition or backfill") &&
    contract.includes("lifecycle migration or Production SQL execution"),
);
check(
  "preflight is explicitly read-only and count-only",
  preflight.includes("begin transaction read only") &&
    preflight.includes("count(*)") &&
    !/\b(insert|update|delete|truncate|alter|drop|create|grant|revoke)\b/i.test(
      preflight.replace(/^--.*$/gm, ""),
    ),
);
check(
  "preflight does not select sensitive payload fields",
  !/select\s+(raw_payload|worker_name|signature_url|confirmed_share_item_ids)\b/i.test(preflight) &&
    !/jsonb_(agg|build_object)/i.test(preflight),
);

console.log(checks.join("\n"));
console.log(`\n${passed}/${passed} lifecycle inspect contract checks passed.`);
