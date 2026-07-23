import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const scope = read("src/lib/risk-share/riskShareDefaultSiteScope.ts");
const manager = read("src/app/risk-share/manager/page.tsx");
const monthly = read("src/app/risk-share/monthly/page.tsx");
const inboxPage = read("src/app/risk-share/manager/inbox/page.tsx");
const inbox = read("src/lib/risk-share/riskShareManagerInbox.ts");
const reviews = read("src/lib/risk-share/riskShareManagerConfirmationReview.ts");
const representative = read("src/lib/riskShareRepresentativeSubmissionRecords.ts");

const checks = [
  ["site-bound rows plus legacy NULL continuity", scope.includes("site_id.eq.${siteId},site_id.is.null")],
  ["missing default site is legacy-only", scope.includes('query.set("site_id", "is.null")')],
  ["manager resolves default site before summaries", manager.indexOf("fetchTenantSiteProfileSummary(tenantCode)") < manager.lastIndexOf("fetchRiskShareParticipationSummary(")],
  ["manager summary queries apply site scope", (manager.match(/applyRiskShareDefaultSiteScope\(query, siteId\)/g) ?? []).length === 3],
  ["monthly resolves canonical default site", monthly.includes("getDefaultTenantSiteConfigByTenantCode(tenantCode)") && monthly.includes("resolveRiskShareSingleSiteScope(defaultSite, tenantSites)") && monthly.includes("const siteId = singleSiteScope.siteId")],
  ["monthly summary queries apply site scope", (monthly.match(/applyRiskShareDefaultSiteScope\(query, siteId\)/g) ?? []).length === 3],
  ["representative summary applies site scope", representative.includes("applyRiskShareDefaultSiteScope(query, siteId)")],
  ["confirmation review applies site scope", reviews.includes("applyRiskShareDefaultSiteScope(query, siteId)")],
  ["manager inbox resolves and applies site scope", inboxPage.includes("getDefaultTenantSiteConfigByTenantCode(tenant.tenant.code)") && inboxPage.includes("defaultSite?.id ?? null") && inbox.includes("applyRiskShareDefaultSiteScope(query, siteId)")],
];

for (const [name, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
assert.equal(checks.some(([, ok]) => !ok), false, "default-site read scope contract failed");
console.log("PASS default-site read scope contract");
