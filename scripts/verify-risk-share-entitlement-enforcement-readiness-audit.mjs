import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { RISK_SHARE_ENTITLEMENT_SHADOW_BOUNDARIES } from "../src/lib/risk-share/riskShareEntitlementShadow.ts";

const audit = readFileSync(
  "docs/ops/SAFEMETRICA_RISK_SHARE_ENTITLEMENT_ENFORCEMENT_READINESS_AUDIT_V1.md",
  "utf8",
);

// The readiness audit must name every boundary the shadow inventory tracks,
// so the inventory doc cannot silently drift from the source of truth.
for (const { id } of RISK_SHARE_ENTITLEMENT_SHADOW_BOUNDARIES) {
  assert.match(
    audit,
    new RegExp(`\`${id.replace(/\./g, "\\.")}\``),
    `readiness audit omits boundary ${id}`,
  );
}

for (const required of [
  /repository-only inspection record/,
  /authorizes nothing/,
  /must never be implemented as, or accompanied by, deletion of\s+entitlement or audit rows/,
  /does not change any Runtime access decision/,
  /does not flip a feature flag/,
  /does not touch a migration or Production schema/,
  /does not expand to actual customers/,
]) {
  assert.match(audit, required, `readiness audit omits: ${required}`);
}

// Boundary -> [runtime file, legacy guard symbols that must still gate access].
const boundaryGuards = {
  "saas.manager.page": [
    "src/app/risk-share/manager/page.tsx",
    ["requireTenantManagerAccessForCurrentSession", "canAccessRiskShareManagerTenant"],
  ],
  "saas.monthly.page": [
    "src/app/risk-share/monthly/page.tsx",
    ["requireTenantManagerAccessForCurrentSession"],
  ],
  "saas.publish.mutation": [
    "src/app/api/risk-share/manager/publish/route.ts",
    ["requireTenantAccessForCurrentSession"],
  ],
  "saas.preparation.mutation": [
    "src/app/api/risk-share/manager/preparation/route.ts",
    ["requireTenantAccessForCurrentSession"],
  ],
  "saas.share_review.mutation": [
    "src/app/api/risk-share/manager/share-review/route.ts",
    ["requireTenantAccessForCurrentSession"],
  ],
  "public.participation.submit": [
    "src/app/api/risk-share/participation/submit/route.ts",
    ["resolveActiveRiskSharePublicTenant"],
  ],
  "public.anonymous.submit": [
    "src/app/api/risk-share/anonymous/submit/route.ts",
    ["resolveActiveRiskSharePublicTenant", "consumeRiskSharePublicRateLimit"],
  ],
  "public.visitor.submit": [
    "src/app/api/risk-share/visitor/submit/route.ts",
    ["resolveActiveRiskSharePublicTenant", "consumeRiskSharePublicRateLimit"],
  ],
  "public.representative.submit": [
    "src/app/api/risk-share/representative/submit/route.ts",
    ["resolveActiveRiskSharePublicTenant", "consumeRiskSharePublicRateLimit"],
  ],
  "legacy.manager.page": [
    "src/app/manager/risk-share/page.tsx",
    ["getCompanyConfig", "getCompanyConfigByCode"],
  ],
  "legacy.field_participation.submit": [
    "src/app/api/field/participation/submit/route.ts",
    ["getCompanyConfig", "getCompanyConfigByCode"],
  ],
};

assert.deepEqual(
  Object.keys(boundaryGuards).sort(),
  RISK_SHARE_ENTITLEMENT_SHADOW_BOUNDARIES.map(({ id }) => id).sort(),
  "readiness audit guard map must cover exactly the shadow boundary inventory",
);

const allowedEntitlementImportPath = "src/app/risk-share/manager/page.tsx";

for (const [boundaryId, [path, guardSymbols]] of Object.entries(boundaryGuards)) {
  const source = readFileSync(path, "utf8");

  for (const guardSymbol of guardSymbols) {
    assert.match(
      source,
      new RegExp(`\\b${guardSymbol}\\b`),
      `${boundaryId}: ${path} lost its legacy guard call ${guardSymbol}`,
    );
  }

  const importsReader = source.includes("riskShareEntitlementAccess");
  const importsShadow = source.includes("riskShareEntitlementRuntimeShadow");

  if (path === allowedEntitlementImportPath) {
    assert.equal(importsReader, false, `${path} must not import the entitlement reader directly`);
    assert.equal(importsShadow, true, `${path} lost its approved internal-test shadow observer`);
  } else {
    assert.equal(importsReader, false, `${boundaryId}: ${path} connects the entitlement reader early`);
    assert.equal(importsShadow, false, `${boundaryId}: ${path} connects the Runtime shadow early`);
  }
}

// Rollback contract: the one Runtime call site must sit after both legacy
// guard branches resolve, and its result must never be read or branched on.
const managerPage = readFileSync(allowedEntitlementImportPath, "utf8");
const tenantAccessGateIndex = managerPage.indexOf("if (!tenantAccessResult.ok)");
const roleGateIndex = managerPage.indexOf("if (!canAccessRiskShareManagerTenant(");
const shadowCallIndex = managerPage.indexOf("observeInternalTestRiskShareEntitlementShadow({");

assert.ok(tenantAccessGateIndex >= 0, "session guard branch not found");
assert.ok(roleGateIndex >= 0, "role guard branch not found");
assert.ok(shadowCallIndex >= 0, "shadow observation call site not found");
assert.ok(
  shadowCallIndex > tenantAccessGateIndex && shadowCallIndex > roleGateIndex,
  "shadow observation must run after both legacy guard branches resolve",
);
assert.equal(
  managerPage.includes("= await observeInternalTestRiskShareEntitlementShadow"),
  false,
  "shadow observation result must not be assigned to a variable",
);
assert.equal(
  managerPage.includes("if (await observeInternalTestRiskShareEntitlementShadow"),
  false,
  "shadow observation must not gate a conditional",
);

const shadowHelper = readFileSync(
  "src/lib/risk-share/riskShareEntitlementRuntimeShadow.ts",
  "utf8",
);
assert.match(
  shadowHelper,
  /export async function observeInternalTestRiskShareEntitlementShadow\([^)]*\):\s*Promise<void>/,
  "shadow observer must return Promise<void> so deleting the call site cannot change control flow",
);
assert.equal(shadowHelper.includes("catch {"), true, "shadow observer must swallow lookup failure");
assert.equal(shadowHelper.includes("return input"), false);
assert.equal(shadowHelper.includes("throw "), false, "shadow observer must never throw to its caller");

// package.json wiring.
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
assert.equal(
  packageJson.scripts["verify:risk-share-entitlement-enforcement-readiness-audit"],
  "node scripts/verify-risk-share-entitlement-enforcement-readiness-audit.mjs",
);

console.log("PASS risk share entitlement enforcement readiness audit");
