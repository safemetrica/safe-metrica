import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const page = read("src/app/risk-share/manager/inbox/page.tsx");
const workspace = read("src/components/risk-share/manager/ManagerInboxCustomerWorkspace.tsx");
const model = read("src/lib/risk-share/riskShareManagerInbox.ts");
const action = read("src/lib/risk-share/riskShareManagerInboxReview.ts");
const supabaseServer = read("src/lib/supabaseServer.ts");
const presentation = page + workspace;

const checks = [
  ["server action re-authorizes active tenant manager", page.includes('"use server"')
    && page.includes("requireTenantManagerAccessForCurrentSession({ tenantCode: companyCode })")
    && page.includes("access.context.membership.membershipId")],
  ["server action resolves canonical site before mutable target fields", page.includes("resolveRiskShareManagerTenant(companyCode)")
    && page.includes("resolveRiskShareCanonicalSiteScopeForTenant(")
    && page.includes("tenantResolution.tenant.defaultSiteId")
    && page.indexOf("requireTenantManagerAccessForCurrentSession({ tenantCode: companyCode })") < page.indexOf('formData.get("submissionId")')
    && page.indexOf("resolveRiskShareCanonicalSiteScopeForTenant(") < page.indexOf('formData.get("submissionId")')],
  ["only two explicit transitions are accepted", page.includes('expectedStatus === "unreviewed" && nextStatus === "in_review"')
    && page.includes('expectedStatus === "in_review" && nextStatus === "completed"')
    && action.includes("const validTransition")],
  ["completion requires a bounded manager note", page.includes('nextStatus === "completed" && !actionNote')
    && page.includes("actionNote.length > 500")
    && workspace.includes("maxLength={500}")],
  ["mutation uses only service-role RPC", action.includes('/rest/v1/rpc/update_risk_share_inbox_review_status')
    && action.includes("SUPABASE_SERVICE_ROLE_KEY")
    && !/(insert|update|delete)FieldParticipation/.test(action + page)],
  ["mutation preflights exact site-bound target and stale status", page.includes("siteId: siteScope.siteId")
    && action.includes("applyRiskShareDefaultSiteScope(targetQuery, input.siteId)")
    && action.includes('id: `eq.${input.submissionId}`')
    && action.includes('tenant_code: `eq.${input.companyCode}`')
    && action.includes('manager_review_status: `eq.${input.expectedStatus}`')
    && action.indexOf("applyRiskShareDefaultSiteScope(targetQuery, input.siteId)") < action.indexOf("/rest/v1/rpc/update_risk_share_inbox_review_status")
    && action.includes('code: "target_scope_mismatch"')],
  ["idempotency is deterministic for exact retries and forwarded", page.includes('createHash("sha256")')
    && page.includes('`manager-inbox:v1:${')
    && page.includes("access.context.membership.membershipId")
    && page.includes("actionNote || null")
    && action.includes("p_idempotency_key: input.idempotencyKey")],
  ["RPC response fails closed", action.includes("rows.length === 1")
    && action.includes('code: "invalid_response"')
    && action.includes("row.review_status !== input.nextStatus")],
  ["all non-monthly audit reads are tenant and submission scoped", model.includes('"risk_share_inbox_review_events"')
    && supabaseServer.includes('| "risk_share_inbox_review_events"')
    && model.includes('tenant_code: `eq.${companyCode}`')
    && model.includes('submission_id: `eq.${submissionId}`')],
  ["customer wording preserves human and legal boundary", presentation.includes("확인 시작")
    && presentation.includes("처리 기록 완료")
    && presentation.includes("안전조치의 적정성이나 법적 종결을 확정하지 않습니다")],
  ["overdue wording is display-only and not a legal deadline", workspace.includes('{ label: "장기 미확인"')
    && workspace.includes("접수 후 24시간이 지나 아직 확인되지 않았습니다.")
    && workspace.includes("내부 업무 우선순위 안내이며 법정 처리기한을 의미하지 않습니다.")
    && workspace.includes("장기 미확인 → 처리 중 → 확인 필요 → 최근 완료 순서")
    && workspace.includes("전체 접수 기준")
    && page.includes('if (attention === "overdue") return "장기 미확인";')],
  ["monthly review path remains separate", workspace.includes('item.type === "monthly"')
    && workspace.includes('#confirmation-review')],
  ["approved workspace and tactile action states are connected", workspace.includes("manager-workspace-preview manager-inbox-live")
    && workspace.includes("workspace-action-submit")
    && workspace.includes("useFormStatus")],
  ["anonymous masking remains intact", model.includes('submitterLabel: isAnonymous ? "익명"')],
];

for (const [name, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
assert.equal(checks.some(([, ok]) => !ok), false, "manager inbox actions contract failed");
console.log("PASS manager inbox actions contract");
