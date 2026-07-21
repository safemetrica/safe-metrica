import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const migration = read("supabase/migrations/20260721010000_add_confirmation_manager_review.sql");
const helper = read("src/lib/risk-share/riskShareManagerConfirmationReview.ts");
const page = read("src/app/risk-share/manager/confirmations/page.tsx");
const manager = read("src/app/risk-share/manager/page.tsx");
const managerView = read("src/components/risk-share/manager/ManagerDesignerView.tsx");
const managerCss = read("src/app/risk-share/manager/designer.css");
const recentSubmissionsTable = read("src/components/risk-share/manager/RecentSubmissionsTable.tsx");
const monthly = read("src/app/risk-share/monthly/page.tsx");

const checks = [
  ["review columns", /manager_review_status text/.test(migration) && /manager_reviewed_by_membership_id uuid/.test(migration)],
  ["immutable audit events", /create table if not exists public\.risk_share_confirmation_review_events/.test(migration) && /grant select, insert/.test(migration) && !/grant[^;]*update[^;]*risk_share_confirmation_review_events/i.test(migration)],
  ["tenant manager authorization", /tm\.tenant_code = p_company_code/.test(migration) && /tenant_admin/.test(migration) && /tenant_manager/.test(migration)],
  ["version confirmation scope", /fps\.version_lock_id is not null/.test(migration) && /risk_share_participation_submit_v1/.test(migration) && /mode' = 'monthly/.test(migration)],
  ["ordered transition and row lock", /p_expected_status = 'unreviewed' and p_next_status = 'in_review'/.test(migration) && /p_expected_status = 'in_review' and p_next_status = 'completed'/.test(migration) && /for update/.test(migration) && /v_current <> p_expected_status/.test(migration)],
  ["security definer contract", /security definer/.test(migration) && /set search_path = public, pg_temp/.test(migration) && /grant execute[^;]*service_role/.test(migration)],
  ["manager read excludes worker identity", /version_lock_id: "not\.is\.null"/.test(helper) && !/worker_name|phone|birth|signature_url/.test(helper)],
  ["helper calls scoped RPC", /rpc\/update_risk_share_confirmation_review_status/.test(helper) && /p_expected_status/.test(helper)],
  ["server action validates contract", /UUID_PATTERN\.test\(submissionId\)/.test(manager) && /actionNote\.length > 500/.test(manager) && /validTransition/.test(manager) && /requireTenantManagerAccessForCurrentSession/.test(manager)],
  ["designer manager integration", /confirmationReviewHref/.test(manager) && /#confirmation-review/.test(manager) && /근로자 확인 내역/.test(managerView) && /이곳에서 확인하고 처리합니다/.test(managerView)],
  ["mobile review action layout", /confirmation-review__action-cell/.test(managerView) && /td:nth-child\(6\).*grid-column: 1 \/ -1/.test(managerCss) && /confirmation-review__form.*flex-direction: column/.test(managerCss)],
  ["customer-facing confirmation datetime terminology", /공유확인 일시/.test(managerView) && /공유확인 일시/.test(recentSubmissionsTable) && !/접수 시각/.test(managerView) && !/접수 시각/.test(recentSubmissionsTable)],
  ["standalone page removed", /redirect\(/.test(page) && /#confirmation-review/.test(page) && !/근로자 공유확인 검토·조치/.test(page)],
  ["monthly counts only version-linked rows", /const versionLinkedRows/.test(monthly) && /reviewUnreviewed: versionLinkedRows\.filter/.test(monthly)],
];

const failed = checks.filter(([, ok]) => !ok);
for (const [name, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
if (failed.length) process.exit(1);
console.log("PASS risk-share manager confirmation review contract");
