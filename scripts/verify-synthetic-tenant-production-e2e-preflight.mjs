import assert from "node:assert/strict";
import fs from "node:fs";

import {
  buildSyntheticManifest,
  fingerprintSyntheticAccount,
  runReadOnlySyntheticPreflight,
  syntheticTenantProductionE2eContract,
  validateSyntheticManifest,
} from "./lib/syntheticTenantProductionE2ePreflight.mjs";

const fixedNow = new Date("2026-07-24T01:00:00.000Z");
const accountEmail = "synthetic-e2e-001@example.invalid";
const phaseApprovalReferences = {
  fixture_creation: "approval-fixture-2026-07-24",
  authenticated_runtime: "approval-runtime-2026-07-24",
  public_qr_submission: "approval-public-qr-2026-07-24",
  cleanup_writes: "approval-cleanup-2026-07-24",
};

const manifest = buildSyntheticManifest({
  sequence: 1,
  accountEmail,
  approvedBy: "authorized-human",
  phaseApprovalReferences,
  now: fixedNow,
});

assert.equal(manifest.manifestId, "sm-e2e-prod-20260724-001");
assert.equal(manifest.tenant.code, "sm-e2e-20260724-001");
assert.equal(manifest.entitlement.activationSource, "internal_test");
assert.equal(
  manifest.entitlement.externalReference,
  "internal-test:sm-e2e-20260724-001",
);
assert.equal(manifest.account.emailFingerprint, fingerprintSyntheticAccount(accountEmail));
assert.equal(JSON.stringify(manifest).includes(accountEmail), false);
assert.deepEqual(
  Object.keys(manifest.phaseApprovals),
  syntheticTenantProductionE2eContract.approvalScopes,
);
assert.deepEqual(
  Object.fromEntries(
    Object.entries(manifest.phaseApprovals).map(([scope, approval]) => [
      scope,
      approval.approvalReference,
    ]),
  ),
  phaseApprovalReferences,
);

const valid = validateSyntheticManifest(manifest, {
  accountEmail,
  now: fixedNow,
});
assert.deepEqual(valid, { ok: true, errors: [] });

const wrongAccount = validateSyntheticManifest(manifest, {
  accountEmail: "different@example.invalid",
  now: fixedNow,
});
assert.equal(wrongAccount.ok, false);
assert.equal(wrongAccount.errors.includes("account_fingerprint_mismatch"), true);

const customerLikeTenant = structuredClone(manifest);
customerLikeTenant.tenant.code = "test-risk-pack-01";
const customerLikeResult = validateSyntheticManifest(customerLikeTenant, {
  accountEmail,
  now: fixedNow,
});
assert.equal(customerLikeResult.ok, false);
assert.equal(customerLikeResult.errors.includes("tenant_code_invalid"), true);

const bundledApproval = structuredClone(manifest);
bundledApproval.phaseApprovals.authenticated_runtime.approvalReference =
  bundledApproval.phaseApprovals.fixture_creation.approvalReference;
const bundledApprovalResult = validateSyntheticManifest(bundledApproval, {
  accountEmail,
  now: fixedNow,
});
assert.equal(bundledApprovalResult.ok, false);
assert.equal(
  bundledApprovalResult.errors.includes(
    "phase_approval_references_must_be_distinct",
  ),
  true,
);

const expiredCleanup = structuredClone(manifest);
expiredCleanup.cleanup.deadline = "2026-07-24T00:00:00.000Z";
const expiredResult = validateSyntheticManifest(expiredCleanup, {
  accountEmail,
  now: fixedNow,
});
assert.equal(expiredResult.ok, false);
assert.equal(expiredResult.errors.includes("cleanup_deadline_elapsed"), true);

const originalFetch = globalThis.fetch;
const requests = [];
globalThis.fetch = async (url, options) => {
  requests.push({ url: String(url), options });
  return new Response("[]", {
    status: 200,
    headers: { "content-range": "*/0" },
  });
};

try {
  const preflight = await runReadOnlySyntheticPreflight({
    manifest,
    accountEmail,
    supabaseUrl: "https://synthetic.supabase.co",
    serviceRoleKey: "synthetic-service-role-for-test-only",
    now: fixedNow,
  });

  assert.equal(preflight.ok, true);
  assert.equal(preflight.result, "READ_ONLY_PREFLIGHT_PASS");
  assert.equal(preflight.writeAuthorized, false);
  assert.equal(preflight.migrationInventoryVerified, false);
  assert.equal(preflight.schemaAndGrantFingerprintVerified, false);
  assert.equal(preflight.storageBoundaryVerified, false);
  assert.equal(requests.length, 4);

  for (const request of requests) {
    assert.equal(request.options.method, "GET");
    assert.equal(request.options.body, undefined);
    assert.equal(request.url.includes("test-risk-pack-01"), false);
  }
} finally {
  globalThis.fetch = originalFetch;
}

const cli = fs.readFileSync(
  "scripts/synthetic-tenant-production-e2e-preflight.mjs",
  "utf8",
);
const core = fs.readFileSync(
  "scripts/lib/syntheticTenantProductionE2ePreflight.mjs",
  "utf8",
);
assert.doesNotMatch(cli, /console\.(log|error)\([^)]*SUPABASE_SERVICE_ROLE_KEY/);
assert.doesNotMatch(cli, /\b(POST|PATCH|PUT|DELETE)\b/);
assert.match(core, /writeAuthorized:\s*false/);

console.log("PASS synthetic tenant Production E2E read-only preflight");
