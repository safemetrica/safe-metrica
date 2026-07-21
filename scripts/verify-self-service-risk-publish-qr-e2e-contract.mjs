import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const signupMigration = read("supabase/migrations/20260721030000_add_self_service_signup_foundation.sql");
const activationMigration = read("supabase/migrations/20260721040000_add_atomic_tenant_activation.sql");
const profileAction = read("src/app/risk-share/manager/settings/site-profile/actions.ts");
const managerPage = read("src/app/risk-share/manager/page.tsx");
const sourcePage = read("src/app/risk-share/manager/sources/page.tsx");
const sourceRoute = read("src/app/api/risk-share/manager/sources/upload/route.ts");
const reviewPage = read("src/app/risk-share/manager/share-review/page.tsx");
const publishPage = read("src/app/risk-share/manager/share-review/publish/page.tsx");
const publishRoute = read("src/app/api/risk-share/manager/publish/route.ts");
const publishHelper = read("src/lib/risk-share/riskShareTenantPublish.ts");
const publicGuard = read("src/lib/risk-share/riskSharePublicTenantGuard.ts");
const fieldPage = read("src/app/risk-share/field/page.tsx");
const participationPage = read("src/app/risk-share/participation/page.tsx");
const publicVersion = read("src/lib/risk-share/riskSharePublicVersion.ts");

const checks = [
  ["self-service signup starts onboarding", /'onboarding'/.test(signupMigration)],
  ["profile completion invokes atomic activation", /tenantResolution\.tenant\.status === "onboarding"/.test(profileAction)
    && /activateTenantAfterProfile/.test(profileAction)
    && /actorMembershipId: accessResult\.context\.membership\.membershipId/.test(profileAction)],
  ["activation commits active status with audit event", /insert into public\.tenant_activation_events/.test(activationMigration)
    && /set status = 'active'/.test(activationMigration)
    && /v_membership\.role <> 'tenant_admin'/.test(activationMigration)],
  ["manager links the authenticated tenant workflow", /sourceRegistryHref=\{sourceRegistryHref\}/.test(managerPage)
    && /shareReviewHref=\{shareReviewHref\}/.test(managerPage)
    && /fieldHref=\{fieldHref\}/.test(managerPage)],
  ["source UI and upload require an active tenant", /resolveActiveRiskSharePublicTenant/.test(sourcePage)
    && /resolveActiveRiskSharePublicTenant/.test(sourceRoute)],
  ["source upload re-derives membership role", /requireTenantAccessForCurrentSession/.test(sourceRoute)
    && /selectedTenantCode !== tenantCode/.test(sourceRoute)
    && /uploadedBy: role/.test(sourceRoute)],
  ["review and publish pages are tenant-scoped", /requireTenantAccessForCurrentSession/.test(reviewPage)
    && /requireTenantAccessForCurrentSession/.test(publishPage)],
  ["publish route ignores caller role and re-derives membership", /requireTenantAccessForCurrentSession/.test(publishRoute)
    && /actorMembershipId\s*=\s*tenantAccessResult\.context\.membership\.membershipId/.test(publishRoute)
    && !/parsedBody\.(role|companyCode|tenantCode)/.test(publishRoute)],
  ["publish uses checked atomic RPC", /publishRiskShareVersionForTenantChecked/.test(publishRoute)
    && /rpc\/publish_risk_share_version_for_tenant_checked/.test(publishHelper)
    && /p_expected_review_revisions/.test(publishHelper)],
  ["public QR remains active-only", /tenant\.status !== "active"/.test(publicGuard)
    && /resolveActiveRiskSharePublicTenant/.test(fieldPage)
    && /resolveActiveRiskSharePublicTenant/.test(participationPage)],
  ["monthly QR reads immutable published snapshot", /resolveActiveRiskSharePublicVersion/.test(participationPage)
    && /risk_share_version_locks/.test(publicVersion)
    && /risk_share_version_items/.test(publicVersion)
    && !/selectSupabaseExportRows<[^>]+>\("risk_share_items"/.test(publicVersion)],
  ["QR confirmation fails closed without a published share", /monthlyVersionUnavailableReason/.test(participationPage)
    && /versionShareEmptyBody/.test(participationPage)],
];

for (const [name, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
assert.equal(checks.some(([, ok]) => !ok), false, "self-service risk publish QR E2E contract failed");
console.log("PASS self-service risk publish QR E2E contract");
