import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const profileAction = read("src/app/risk-share/manager/settings/site-profile/actions.ts");
const profilePage = read("src/app/risk-share/manager/settings/site-profile/page.tsx");
const ownerRoute = read("src/app/api/owner/tenant-onboarding/activate/route.ts");
const ownerPage = read("src/app/owner/tenant-onboarding/draft/page.tsx");
const ownerActions = read("src/lib/tenant-onboarding/ownerTenantCommercialActions.ts");
const activationHelper = read("src/lib/tenant-onboarding/tenantActivation.ts");
const sourceUpload = read("src/lib/risk-share/riskShareSourceUpload.ts");
const publicGuard = read("src/lib/risk-share/riskSharePublicTenantGuard.ts");
const migration = read("supabase/migrations/20260721040000_add_atomic_tenant_activation.sql");

const publicSubmitRoutes = [
  "anonymous",
  "participation",
  "representative",
  "visitor",
].map((kind) => read(`src/app/api/risk-share/${kind}/submit/route.ts`));

const managerMutationRoutes = [
  "preparation",
  "publish",
  "share-review",
].map((kind) => read(`src/app/api/risk-share/manager/${kind}/route.ts`));
managerMutationRoutes.push(
  read("src/app/api/risk-share/manager/sources/upload/route.ts"),
  read("src/app/api/risk-share/manager/sources/mapping/route.ts"),
);

const checks = [
  ["profile save does not activate", !/activateTenantAfterProfile|self_service_profile/.test(profileAction)],
  ["profile save distinguishes saved from activated", /saved: "1"/.test(profileAction)
    && /사업장 정보 저장 완료/.test(profilePage)
    && /서비스 활성화는 계약·이용상품 확인 후/.test(profilePage)],
  ["Owner route requires contract and product confirmation", /contract_confirmed/.test(ownerRoute)
    && /product_confirmed/.test(ownerRoute)
    && /commercial_confirmation_required/.test(ownerRoute)
    && /contract_confirmed/.test(ownerPage)
    && /product_confirmed/.test(ownerPage)],
  ["Owner activation reuses atomic RPC", /activateTenantAfterProfile/.test(ownerActions)
    && /p_initiated_by: "owner_console"/.test(activationHelper)
    && !/params\.initiatedBy/.test(activationHelper)],
  ["activation audit identifies tenant actor type and time", /tenant_code text not null/.test(migration)
    && /initiated_by text not null/.test(migration)
    && /created_at timestamptz not null default now\(\)/.test(migration)
    && /insert into public\.tenant_activation_events/.test(migration)],
  ["activation is atomic and service-role-only", /raise exception 'tenant activation update invariant failed'/.test(migration)
    && /revoke all on function public\.activate_tenant_after_profile[\s\S]*from public, anon, authenticated/.test(migration)
    && /grant execute on function public\.activate_tenant_after_profile[\s\S]*to service_role/.test(migration)],
  ["source upload is active-only for every actor", /ELIGIBLE_TENANT_STATUSES = new Set\(\["active"\]\)/.test(sourceUpload)],
  ["manager mutations are active-only", managerMutationRoutes.every((route) => /resolveActiveRiskSharePublicTenant/.test(route))],
  ["public submissions are active-only", publicSubmitRoutes.every((route) => /resolveActiveRiskSharePublicTenant/.test(route))],
  ["public QR resolver is active-only", /tenant\.status !== "active"/.test(publicGuard)],
];

for (const [name, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
assert.equal(checks.some(([, ok]) => !ok), false, "Owner-approved activation contract failed");
console.log("PASS Owner-approved tenant activation contract");
