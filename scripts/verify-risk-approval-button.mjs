import fs from "node:fs";

const files = {
  api: "src/app/api/risk-approval/route.ts",
  button: "src/app/risk/RiskApprovalButtons.tsx",
  riskPage: "src/app/risk/page.tsx",
};

for (const file of Object.values(files)) {
  if (!fs.existsSync(file)) {
    console.error(`FAIL: missing file - ${file}`);
    process.exit(1);
  }
}

const api = fs.readFileSync(files.api, "utf8");
const button = fs.readFileSync(files.button, "utf8");
const riskPage = fs.readFileSync(files.riskPage, "utf8");

const checks = [
  {
    name: "risk approval API exists",
    ok: api.includes("export async function POST"),
  },
  {
    name: "API writes approval status",
    ok: api.includes('"반영 승인상태"') && api.includes("승인 완료"),
  },
  {
    name: "API writes approval date",
    ok: api.includes('"반영 승인일"'),
  },
  {
    name: "API writes approval memo",
    ok: api.includes('"반영 승인 메모"'),
  },
  {
    name: "API writes reflection status",
    ok: api.includes('"Risk DB 반영상태"') && api.includes("반영 완료"),
  },
  {
    name: "button component exists",
    ok: button.includes("export function RiskApprovalButtons"),
  },
  {
    name: "button calls risk approval API",
    ok: button.includes('fetch("/api/risk-approval"'),
  },
  {
    name: "button supports approve",
    ok: button.includes("승인 완료 처리"),
  },
  {
    name: "button supports reject",
    ok: button.includes("반려"),
  },
  {
    name: "button supports request more evidence",
    ok: button.includes("보완 요청"),
  },
  {
    name: "risk page renders approval buttons",
    ok: riskPage.includes("<RiskApprovalButtons"),
  },
  {
    name: "approval button is limited to completion candidate approvalReady",
    ok:
      riskPage.includes("summary.completionCandidate.isCompletionCandidate") &&
      riskPage.includes('summary.approval.approvalStatus === "approvalReady"'),
  },
];

const failed = checks.filter((check) => !check.ok);

console.log("");
console.log("SafeMetrica Risk Approval Button Verification");
console.log("============================================");
console.log("");

for (const check of checks) {
  console.log(`${check.ok ? "PASS" : "FAIL"}: ${check.name}`);
}

console.log("");

if (failed.length > 0) {
  console.error(`Result: FAIL (${failed.length} failed)`);
  process.exit(1);
}

console.log("Result: PASS");
console.log("");
console.log("Verified:");
console.log("- risk approval API exists");
console.log("- /risk renders approval buttons for completion candidates");
console.log("- approval / reject / more evidence decisions are supported");
console.log("");
