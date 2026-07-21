import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const guard = read("src/lib/risk-share/riskSharePublicTenantGuard.ts");
const manager = read("src/app/risk-share/manager/page.tsx");
const profile = read("src/app/risk-share/manager/settings/site-profile/page.tsx");
const profileAction = read("src/app/risk-share/manager/settings/site-profile/actions.ts");
const publicField = read("src/app/risk-share/field/page.tsx");

const checks = [
  ["public access remains active-only", /tenant\.status !== "active"/.test(guard)],
  ["manager resolver permits only active or onboarding", /tenant\.status !== "active" && tenant\.status !== "onboarding"/.test(guard)],
  ["manager home uses protected onboarding resolver", /resolveRiskShareManagerTenant/.test(manager)],
  ["company profile page uses protected onboarding resolver", /resolveRiskShareManagerTenant/.test(profile)],
  ["company profile save uses protected onboarding resolver", /resolveRiskShareManagerTenant/.test(profileAction)],
  ["public field keeps active-only resolver", /resolveActiveRiskSharePublicTenant/.test(publicField) && !/resolveRiskShareManagerTenant/.test(publicField)],
  ["manager access still requires authenticated membership", /requireTenantManagerAccessForCurrentSession/.test(manager) && /requireTenantAccessForCurrentSession/.test(profile)],
];

for (const [name, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
if (checks.some(([, ok]) => !ok)) process.exit(1);
console.log("PASS self-service onboarding manager access contract");
