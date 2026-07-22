import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const migration = read("supabase/migrations/20260722030000_add_public_submission_idempotency.sql");
const helper = read("src/lib/risk-share/riskSharePublicSubmission.ts");

assert.match(migration, /tenant_code, public_submission_kind, public_idempotency_key/);
assert.match(migration, /public_request_digest ~ '\^\[0-9a-f\]\{64\}\$'/);
assert.match(migration, /add constraint field_participation_public_retry_key/);
assert.match(helper, /resolution=ignore-duplicates,return=representation/);
assert.match(helper, /rows\[0\]\?\.public_request_digest === digest/);
assert.match(helper, /idempotency_conflict/);

for (const [name, kind] of [
  ["anonymous", "anonymous_feedback"],
  ["visitor", "visitor_confirmation"],
  ["representative", "representative_confirmation"],
]) {
  const page = read(`src/app/risk-share/${name}/page.tsx`);
  const route = read(`src/app/api/risk-share/${name}/submit/route.ts`);
  assert.match(page, /name="publicIdempotencyKey"/);
  assert.match(page, /randomUUID\(\)/);
  assert.match(route, /resolveActiveRiskSharePublicTenant/);
  assert.match(route, /createHash\("sha256"\)/);
  assert.match(route, new RegExp(`public_submission_kind: "${kind}"`));
  assert.match(route, /insertRiskSharePublicSubmission/);
  assert.doesNotMatch(route, /console\.(log|warn|error)/);
}

console.log("PASS risk share public submission durable replay contract");
