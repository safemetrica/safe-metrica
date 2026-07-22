import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const migration = read("supabase/migrations/20260722040000_add_public_submission_rate_limit.sql");
const helper = read("src/lib/risk-share/riskSharePublicRateLimit.ts");

assert.match(migration, /primary key \(tenant_code, submission_kind, requester_digest\)/);
assert.match(migration, /requester_digest ~ '\^\[0-9a-f\]\{64\}\$'/);
assert.match(migration, /security definer/);
assert.match(migration, /from public, anon, authenticated/);
assert.match(migration, /expires_at < v_now - interval '1 day'/);
assert.match(migration, /least\(b\.request_count \+ 1, p_limit \+ 1\)/);
assert.doesNotMatch(migration, /ip_address|form_payload|raw_payload/);
assert.match(helper, /createHmac\("sha256", secret\)/);
assert.match(helper, /x-vercel-forwarded-for/);
assert.match(helper, /PUBLIC_SUBMISSION_RATE_LIMIT_SECRET/);
assert.doesNotMatch(helper, /x-forwarded-for"/);
assert.doesNotMatch(helper, /console\.(log|warn|error)/);

for (const [name, kind] of [
  ["anonymous", "anonymous_feedback"],
  ["visitor", "visitor_confirmation"],
  ["representative", "representative_confirmation"],
]) {
  const route = read(`src/app/api/risk-share/${name}/submit/route.ts`);
  const page = read(`src/app/risk-share/${name}/page.tsx`);
  assert.match(route, /consumeRiskSharePublicRateLimit/);
  assert.match(route, new RegExp(`submissionKind: "${kind}"`));
  assert.ok(route.indexOf("await consumeRiskSharePublicRateLimit") < route.indexOf("await insertRiskSharePublicSubmission"));
  assert.match(route, /rate_limited/);
  assert.match(route, /if \(!rateLimit\.ok\)[\s\S]*"error"/);
  assert.match(page, /rateLimitedBanner/);
}

for (const [name, field] of [
  ["visitor", "checkedSafetyGuide"],
  ["representative", "confirmed"],
]) {
  const route = read(`src/app/api/risk-share/${name}/submit/route.ts`);
  const page = read(`src/app/risk-share/${name}/page.tsx`);
  const validation = new RegExp(`if \\(!${field}\\)[\\s\\S]*?status: 303`);
  assert.match(route, validation);
  assert.ok(route.indexOf(`if (!${field})`) < route.indexOf("await insertRiskSharePublicSubmission"));
  assert.match(page, new RegExp(`name="${field}" required`));
}

console.log("PASS risk share public submission rate-limit contract");
