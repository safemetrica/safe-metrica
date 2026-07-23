import assert from "node:assert/strict";
import fs from "node:fs";

const monthlyPage = fs.readFileSync("src/app/risk-share/monthly/page.tsx", "utf8");

const checks = [
  [
    "canonical multi-site source is tenant_sites",
    monthlyPage.includes("listTenantSitesByTenantCode(tenantCode)")
      && monthlyPage.includes('site.status === "active"'),
  ],
  [
    "default-site pointer is not used as the multi-site detector",
    monthlyPage.includes("const activeSiteCount = tenantSites.filter")
      && !monthlyPage.includes("defaultSite ? 1 : 0"),
  ],
  [
    "multi-site Monthly Evidence fails closed before Core queries",
    monthlyPage.indexOf("if (activeSiteCount > 1)") > 0
      && monthlyPage.indexOf("if (activeSiteCount > 1)")
        < monthlyPage.indexOf("fetchRiskShareMonthlyParticipationSummary(tenantCode"),
  ],
  [
    "multi-site block exposes a stable machine-readable code",
    monthlyPage.includes('"multi_site_monthly_evidence_blocked"')
      && monthlyPage.includes("data-error-code={code}"),
  ],
  [
    "site lookup failure cannot render empty data as a valid monthly result",
    monthlyPage.includes('"monthly_evidence_site_scope_unavailable"')
      && monthlyPage.includes("if (!siteScope)"),
  ],
  [
    "single-site default-site and NULL continuity remain unchanged",
    monthlyPage.includes("const siteId = defaultSite?.id ?? null")
      && monthlyPage.includes(
        "fetchRiskShareMonthlyParticipationSummary(tenantCode, period, siteId)",
      ),
  ],
  [
    "TBM and legacy representative datasets are not added to the Core monthly page",
    !monthlyPage.includes("tbm_voice_submissions")
      && !monthlyPage.includes("worker_representative_confirmations"),
  ],
];

for (const [label, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
}

assert.equal(
  checks.some(([, ok]) => !ok),
  false,
  "risk-share monthly evidence multi-site gate contract failed",
);
console.log("PASS risk-share monthly evidence multi-site gate contract");
