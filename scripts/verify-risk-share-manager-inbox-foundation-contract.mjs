import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const model = read("src/lib/risk-share/riskShareManagerInbox.ts");
const page = read("src/app/risk-share/manager/inbox/page.tsx");
const manager = read("src/app/risk-share/manager/page.tsx");
const designer = read("src/components/risk-share/manager/ManagerDesignerView.tsx");
const supabaseServer = read("src/lib/supabaseServer.ts");

const checks = [
  ["server-only read model", model.includes('import "server-only"')],
  ["single existing submission ledger", model.includes('"field_participation_submissions"')],
  ["tenant query is mandatory", model.includes('tenant_code: `eq.${companyCode}`')],
  ["bounded newest-first read", model.includes('order: "created_at.desc,id.desc"') && model.includes('limit: "200"')],
  ["known source allowlist", ["monthly", "prework", "anonymous", "visitor", "representative"].every((value) => model.includes(value))],
  ["anonymous submitter is never exposed", model.includes('submitterLabel: isAnonymous ? "익명"')],
  ["raw payload is not fetched", !model.includes('version_lock_id,raw_payload')
    && model.includes('source:raw_payload->>source,mode:raw_payload->>mode')],
  ["only existing monthly review can transition", model.includes('canTransition: type === "monthly"')],
  ["active tenant and session manager required", page.includes("resolveActiveRiskSharePublicTenant") && page.includes("requireTenantManagerAccessForCurrentSession")],
  ["query cannot choose tenant after access", page.includes("listManagerInboxItems(tenant.tenant.code)")],
  ["detail and KST rendering", page.includes("selectedId") && page.includes("formatSeoulCustomerDateTime")],
  ["existing monthly workflow retained", page.includes('#confirmation-review') && page.includes("detail.canTransition")],
  ["monthly audit history is tenant and submission scoped", model.includes('"risk_share_confirmation_review_events"')
    && supabaseServer.includes('| "risk_share_confirmation_review_events"')
    && model.includes('submission_id: `eq.${submissionId}`')
    && model.includes('tenant_code: `eq.${companyCode}`')
    && page.includes("listManagerInboxAuditEvents(tenant.tenant.code, detail.id)")],
  ["audit history stays read-only and monthly-only", page.includes('detail?.type === "monthly"')
    && page.includes("처리 이력") && !/rpc\//.test(model + page)],
  ["monthly result link retained", page.includes('"/risk-share/monthly"')],
  ["manager navigation connects all inbox types", manager.includes('"/risk-share/manager/inbox"')
    && ["prework", "anonymous", "visitor", "representative"].every((value) => designer.includes(`type=${value}`))],
  ["no schema or mutation in foundation", !/rpc\//.test(model + page) && !/(insert|update|delete)FieldParticipation/.test(model + page)],
];

for (const [name, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
assert.equal(checks.some(([, ok]) => !ok), false, "manager inbox foundation contract failed");
console.log("PASS manager inbox foundation contract");
