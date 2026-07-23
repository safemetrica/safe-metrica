import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const scope = read("src/lib/risk-share/riskShareDefaultSiteScope.ts");
const manager = read("src/app/risk-share/manager/page.tsx");
const monthly = read("src/app/risk-share/monthly/page.tsx");
const inboxPage = read("src/app/risk-share/manager/inbox/page.tsx");
const siteProfilePage = read("src/app/risk-share/manager/settings/site-profile/page.tsx");
const siteProfileAction = read("src/app/risk-share/manager/settings/site-profile/actions.ts");
const inbox = read("src/lib/risk-share/riskShareManagerInbox.ts");
const reviews = read("src/lib/risk-share/riskShareManagerConfirmationReview.ts");
const representative = read("src/lib/riskShareRepresentativeSubmissionRecords.ts");

const checks = [
  ["site-bound rows plus legacy NULL continuity", scope.includes("site_id.eq.${siteId},site_id.is.null")],
  ["missing default site is legacy-only", scope.includes('query.set("site_id", "is.null")')],
  ["manager resolves canonical site scope before summaries", manager.includes("listTenantSitesByTenantCode(tenantCode)") && manager.includes("resolveRiskShareSingleSiteScope(defaultSite, tenantSites)") && manager.includes("const siteProfileSummary = buildTenantSiteProfileSummary(defaultSite)") && manager.indexOf("const singleSiteScope = resolveRiskShareSingleSiteScope(defaultSite, tenantSites)") < manager.lastIndexOf("fetchRiskShareParticipationSummary(")],
  ["manager fails closed when canonical site scope is unavailable or ambiguous", manager.includes('"manager_site_scope_unavailable"') && manager.includes('"manager_site_scope_ambiguous"')],
  ["manager summary queries apply site scope", (manager.match(/applyRiskShareDefaultSiteScope\(query, siteId\)/g) ?? []).length === 3],
  ["monthly resolves canonical default site", monthly.includes("getDefaultTenantSiteConfigByTenantCode(tenantCode)") && monthly.includes("resolveRiskShareSingleSiteScope(defaultSite, tenantSites)") && monthly.includes("const siteId = singleSiteScope.siteId")],
  ["monthly summary queries apply site scope", (monthly.match(/applyRiskShareDefaultSiteScope\(query, siteId\)/g) ?? []).length === 3],
  ["representative summary applies site scope", representative.includes("applyRiskShareDefaultSiteScope(query, siteId)")],
  ["confirmation review applies site scope", reviews.includes("applyRiskShareDefaultSiteScope(query, siteId)")],
  ["manager inbox resolves and applies canonical site scope", inboxPage.includes("listTenantSitesByTenantCode(tenant.tenant.code)") && inboxPage.includes("resolveRiskShareSingleSiteScope(defaultSite, tenantSites)") && inboxPage.includes("singleSiteScope.siteId") && inbox.includes("applyRiskShareDefaultSiteScope(query, siteId)")],
  ["manager inbox fails closed when canonical site scope is unavailable or ambiguous", inboxPage.includes('"manager_inbox_site_scope_unavailable"') && inboxPage.includes('"manager_inbox_site_scope_ambiguous"')],
  ["site profile read resolves canonical site scope", siteProfilePage.includes("listTenantSitesByTenantCode(tenantCode)") && siteProfilePage.includes("resolveRiskShareSingleSiteScope(site, tenantSites)")],
  ["site profile read fails closed on ambiguous site scope", siteProfilePage.includes('reason: "ambiguous"') && siteProfilePage.includes("기본 사업장 설정이 일치하지 않아")],
  ["site profile write resolves canonical scope before create, update, and retry", (siteProfileAction.match(/resolveRiskShareSingleSiteScope\(/g) ?? []).length === 2 && (siteProfileAction.match(/listTenantSitesByTenantCode\(tenantCode\)/g) ?? []).length === 2],
  ["site profile create is followed by canonical re-read", siteProfileAction.indexOf("createTenantDefaultSite") < siteProfileAction.lastIndexOf("resolveCanonicalSite()")],
];

for (const [name, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
assert.equal(checks.some(([, ok]) => !ok), false, "default-site read scope contract failed");
console.log("PASS default-site read scope contract");
