import assert from "node:assert/strict";
import fs from "node:fs";

const route = fs.readFileSync(
  "src/app/api/admin/export/customer-csv/route.ts",
  "utf8",
);
const representativeSubmitRoute = fs.readFileSync(
  "src/app/api/risk-share/representative/submit/route.ts",
  "utf8",
);
const representativeSummary = fs.readFileSync(
  "src/lib/riskShareRepresentativeSubmissionRecords.ts",
  "utf8",
);
const managerInbox = fs.readFileSync(
  "src/lib/risk-share/riskShareManagerInbox.ts",
  "utf8",
);

const checks = [
  [
    "Core export resolves canonical default site server-side",
    route.includes("getDefaultTenantSiteConfigByTenantCode(companyKey)")
      && route.includes("const defaultSiteId = defaultSite?.id ?? null"),
  ],
  [
    "default-site lookup is limited to Core site-bound datasets",
    route.includes(
      "const needsDefaultSiteScope =\n    needsFieldRows || needsEvidenceRows || needsLockedShareItems;",
    )
      && route.includes("if (needsDefaultSiteScope) {"),
  ],
  [
    "TBM and legacy representative-only exports do not depend on default-site lookup",
    route.includes(
      'const needsTbmRows = dataset === "tbm_records" || dataset === "evidence_manifest";',
    )
      && route.includes(
        'dataset === "worker_representative_confirmations";',
      )
      && !route.includes(
        "needsDefaultSiteScope =\n    needsFieldRows || needsEvidenceRows || needsLockedShareItems || needsTbmRows",
      )
      && !route.includes(
        "needsDefaultSiteScope =\n    needsFieldRows || needsEvidenceRows || needsLockedShareItems || needsWorkerRepresentativeRows",
      ),
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
    "default site includes explicit single-site legacy NULL continuity",
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
  [
    "current Core representative submit writes field participation",
    representativeSubmitRoute.includes("insertRiskSharePublicSubmission({")
      && representativeSubmitRoute.includes(
        'source: "risk_share_representative_confirmation_v1"',
      ),
  ],
  [
    "current Core representative monthly evidence reads field participation",
    representativeSummary.includes(
      '"risk_share_representative_confirmation_v1"',
    )
      && representativeSummary.includes(
        '"field_participation_submissions"',
      )
      && representativeSummary.includes(
        "applyRiskShareDefaultSiteScope(query, siteId)",
      ),
  ],
  [
    "current Core manager inbox reads representative submissions from field participation",
    managerInbox.includes(
      'risk_share_representative_confirmation_v1: "representative"',
    )
      && managerInbox.includes(
        'selectSupabaseExportRows<DbRow>("field_participation_submissions", query)',
      ),
  ],
  [
    "legacy representative CSV remains a separate compatibility dataset",
    route.includes(
      'dataset === "worker_representative_confirmations"',
    )
      && route.includes(
        '"worker_representative_confirmations",\n            workerRepresentativeQuery',
      ),
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
