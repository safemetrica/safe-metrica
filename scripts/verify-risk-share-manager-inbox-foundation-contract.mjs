import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const model = read("src/lib/risk-share/riskShareManagerInbox.ts");
const page = read("src/app/risk-share/manager/inbox/page.tsx");
const workspace = read("src/components/risk-share/manager/ManagerInboxCustomerWorkspace.tsx");
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
  ["existing monthly workflow retained", workspace.includes('#confirmation-review') && workspace.includes("item.canTransition")],
  ["monthly audit history is tenant and submission scoped", model.includes('"risk_share_confirmation_review_events"')
    && supabaseServer.includes('| "risk_share_confirmation_review_events"')
    && model.includes('submission_id: `eq.${submissionId}`')
    && model.includes('tenant_code: `eq.${companyCode}`')
    && page.includes("listManagerInboxAuditEvents(tenant.tenant.code, detail.id, detail.type)")],
  ["audit history is read-only for monthly and non-monthly items", model.includes('"risk_share_inbox_review_events"')
    && page.includes("listManagerInboxAuditEvents(tenant.tenant.code, detail.id, detail.type)")
    && workspace.includes("처리 이력") && !/rpc\//.test(model + page)],
  ["audit lookup fails closed instead of showing an empty history", !page.includes(".catch(() => [])")
    && page.includes("auditEventsFailed = true")
    && workspace.includes("auditEventsFailed ?")
    && workspace.includes("처리 이력을 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.")
    && workspace.includes("아직 기록된 상태 변경이 없습니다.")],
  ["audit failure does not expose internal error details", page.includes("} catch {")
    && !page.includes("catch (error)")],
  ["monthly result link retained", page.includes('"/risk-share/monthly"')],
  ["manager navigation connects all inbox types", manager.includes('"/risk-share/manager/inbox"')
    && ["prework", "anonymous", "visitor", "representative"].every((value) => designer.includes(`type=${value}`))],
  ["live inbox uses the approved customer workspace", workspace.includes("manager-workspace-preview manager-inbox-live")
    && workspace.includes("workspace-board card")
    && workspace.includes("workspace-mobile-stage")],
  ["no schema or mutation in foundation", !/rpc\//.test(model + page) && !/(insert|update|delete)FieldParticipation/.test(model + page)],
];

for (const [name, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
assert.equal(checks.some(([, ok]) => !ok), false, "manager inbox foundation contract failed");
console.log("PASS manager inbox foundation contract");
