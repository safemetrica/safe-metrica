import assert from "node:assert/strict";
import fs from "node:fs";

const route = fs.readFileSync(
  "src/app/api/admin/export/customer-csv/route.ts",
  "utf8",
);

const checks = [
  [
    "export resolves canonical default site server-side",
    route.includes("getDefaultTenantSiteConfigByTenantCode(companyKey)")
      && route.includes("const defaultSiteId = defaultSite?.id ?? null"),
  ],
  [
    "site lookup failure cannot produce an incomplete export",
    route.includes('"default_site_lookup_failed"')
      && route.includes('"The customer export could not verify its site scope."'),
  ],
  [
    "site scope and period scope are combined with AND",
    route.includes('query.set("and", `(${siteFilter},or${periodFilter})`)'),
  ],
  [
    "default site includes explicit legacy NULL continuity",
    route.includes("`or(site_id.eq.${siteId},site_id.is.null)`"),
  ],
  [
    "missing default site is legacy-only",
    route.includes('"site_id.is.null"'),
  ],
  [
    "field participation export is site scoped",
    route.includes(
      "applyDefaultSitePeriodScope(fieldQuery, defaultSiteId, fieldPeriodFilter)",
    ),
  ],
  [
    "evidence manifest export is site scoped",
    route.includes(
      "applyDefaultSitePeriodScope(evidenceQuery, defaultSiteId, evidencePeriodFilter)",
    ),
  ],
  [
    "locked share item export is site scoped",
    route.includes(
      "applyDefaultSitePeriodScope(\n    lockedShareItemsQuery,\n    defaultSiteId,\n    lockedShareItemsPeriodFilter,\n  )",
    ),
  ],
  [
    "tenant scope remains explicit",
    route.includes("tenant_code: `eq.${companyKey}`")
      && (route.match(/company_code: `eq\.\$\{companyKey\}`/g) ?? []).length >= 3,
  ],
];

for (const [label, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
}

assert.equal(
  checks.some(([, ok]) => !ok),
  false,
  "customer export site scope contract failed",
);
console.log("PASS customer export site scope contract");
