import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const componentPath = path.join(root, "src/components/risk-share/manager/ManagerInboxCustomerWorkspacePreview.tsx");
const layoutPath = path.join(root, "src/app/preview/manager-inbox/layout.tsx");
const pagePath = path.join(root, "src/app/preview/manager-inbox/page.tsx");
const cssPath = path.join(root, "src/app/preview/manager-inbox/preview.css");

const component = fs.readFileSync(componentPath, "utf8");
const layout = fs.readFileSync(layoutPath, "utf8");
const page = fs.readFileSync(pagePath, "utf8");
const css = fs.readFileSync(cssPath, "utf8");

const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };

expect(layout.includes('index: false') && layout.includes('follow: false'), "preview route must be noindex and nofollow");
expect(layout.includes('designer.css') && layout.includes('preview.css'), "preview must extend the existing designer shell");
expect(page.includes("ManagerInboxCustomerWorkspacePreview"), "preview route must render the dedicated component");
expect(component.includes("SYNTHETIC_PREVIEW_DATA"), "preview must use an explicit synthetic data set");
expect(component.includes("어떤 정보도 저장되지 않습니다"), "preview must disclose its non-persistent nature");
expect(component.includes("고객사 관리자") && component.includes("안전운영") && component.includes("관리자 접수함"), "role and current location must be visible");

for (const label of ["오늘 새로 들어온 업무", "확인할 업무", "조치가 필요한 업무", "지연된 업무", "완료된 업무"]) {
  expect(component.includes(label), `missing summary label: ${label}`);
}
for (const label of ["전체 유형", "전체 상태", "최근 30일"]) {
  expect(component.includes(label), `missing filter: ${label}`);
}
for (const label of ["확인 필요", "처리 중", "처리 기록 완료"]) {
  expect(component.includes(label), `missing customer-facing status: ${label}`);
}
expect(component.includes("24시간 이상 대기 → 처리 중 → 확인 필요 → 최근 완료 순서"), "fact-based priority order must be explicit");
expect(component.includes("다음 30건 보기") && component.includes("한 번에 최대 30건씩 추가합니다"), "bounded more-results pattern must be explicit");
expect(component.includes("workspace-mobile-stage") && component.includes("접수 목록"), "mobile list-to-detail navigation must exist");
expect(css.includes("overflow-y: auto") && css.includes("workspace-desktop-detail"), "desktop independent scroll and detail region must exist");
expect(css.includes("@media (max-width: 640px)") && css.includes("@media (max-width: 900px)"), "390px-class mobile layout rules must exist");
expect(component.includes('type="button" disabled>확인 시작') && component.includes('type="button" disabled>처리 기록 완료'), "preview actions must be visibly disconnected");
expect(component.includes("안전조치의 적정성이나 법적 종결을 확정하지 않습니다"), "completion wording must preserve the human/legal boundary");
expect(css.includes("scroll-snap-type: x proximity") && css.includes("safe-area-inset-bottom"), "390px summary and action layout must be mobile-safe");

for (const forbidden of ["위공팩", "RPC", "DB 상태", "company code", "companyCode", "tenantCode", "submission_id", "membership_id"]) {
  expect(!component.includes(forbidden), `customer preview exposes forbidden internal term: ${forbidden}`);
}
for (const forbiddenImport of ["supabase", "tenantAccess", "riskShareManagerInbox", "next-auth"]) {
  expect(!component.includes(forbiddenImport), `preview must not import live data/auth code: ${forbiddenImport}`);
}
expect(!component.includes("fetch(") && !component.includes("use server"), "preview must not call APIs or server actions");

if (failures.length) {
  console.error("Manager inbox customer workspace preview contract: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Manager inbox customer workspace preview contract: PASS");
