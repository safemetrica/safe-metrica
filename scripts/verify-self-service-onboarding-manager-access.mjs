import fs from "node:fs";
import assert from "node:assert/strict";

import { canAccessRiskShareManagerTenant } from "../src/lib/risk-share/riskShareManagerTenantAccess.ts";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const guard = read("src/lib/risk-share/riskSharePublicTenantGuard.ts");
const manager = read("src/app/risk-share/manager/page.tsx");
const profile = read("src/app/risk-share/manager/settings/site-profile/page.tsx");
const profileAction = read("src/app/risk-share/manager/settings/site-profile/actions.ts");
const publicField = read("src/app/risk-share/field/page.tsx");

const accessCases = [
  ["active tenant_admin", "active", "tenant_admin", true],
  ["active tenant_manager", "active", "tenant_manager", true],
  ["active tenant_viewer", "active", "tenant_viewer", false],
  ["active tenant_representative", "active", "tenant_representative", false],
  ["active owner_internal", "active", "owner_internal", false],
  ["onboarding tenant_admin", "onboarding", "tenant_admin", true],
  ["onboarding tenant_manager", "onboarding", "tenant_manager", false],
  ["onboarding tenant_viewer", "onboarding", "tenant_viewer", false],
  ["onboarding tenant_representative", "onboarding", "tenant_representative", false],
  ["onboarding owner_internal", "onboarding", "owner_internal", false],
];

for (const [name, status, role, expected] of accessCases) {
  assert.equal(canAccessRiskShareManagerTenant(status, role), expected, name);
  console.log(`PASS ${name}`);
}

const checks = [
  ["public access remains active-only", /tenant\.status !== "active"/.test(guard)],
  ["manager resolver permits only active or onboarding", /tenant\.status !== "active" && tenant\.status !== "onboarding"/.test(guard)],
  ["manager home uses protected onboarding resolver", /resolveRiskShareManagerTenant/.test(manager)],
  ["company profile page uses protected onboarding resolver", /resolveRiskShareManagerTenant/.test(profile)],
  ["company profile save uses protected onboarding resolver", /resolveRiskShareManagerTenant/.test(profileAction)],
  ["public field keeps active-only resolver", /resolveActiveRiskSharePublicTenant/.test(publicField) && !/resolveRiskShareManagerTenant/.test(publicField)],
  ["manager access still requires authenticated membership", /requireTenantManagerAccessForCurrentSession/.test(manager) && /requireTenantAccessForCurrentSession/.test(profile)],
  ["company profile save still requires authenticated membership", /requireTenantAccessForCurrentSession/.test(profileAction)],
  ["manager home enforces status-aware role access", /canAccessRiskShareManagerTenant\(tenantResolution\.tenant\.status, tenantAccessResult\.context\.role\)/.test(manager)],
  ["company profile page enforces status-aware role access", /canAccessRiskShareManagerTenant\(tenantResolution\.tenant\.status, tenantAccessResult\.context\.role\)/.test(profile)],
  ["company profile save enforces status-aware role access", /canAccessRiskShareManagerTenant\(tenantResolution\.tenant\.status, accessResult\.context\.role\)/.test(profileAction)],
];

for (const [name, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
if (checks.some(([, ok]) => !ok)) process.exit(1);
console.log("PASS self-service onboarding manager access contract");
