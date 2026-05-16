import fs from "node:fs";

const file = "src/lib/dashboardRiskExecutionKpi.ts";

if (!fs.existsSync(file)) {
  console.error(`FAIL: missing file - ${file}`);
  process.exit(1);
}

const source = fs.readFileSync(file, "utf8");

const checks = [
  {
    name: "buildDashboardRiskExecutionKpi export exists",
    ok: source.includes("export function buildDashboardRiskExecutionKpi"),
  },
  {
    name: "TBM share required KPI exists",
    ok: source.includes("tbmShareRequiredCount"),
  },
  {
    name: "TBM share completed KPI exists",
    ok: source.includes("tbmShareCompletedCount"),
  },
  {
    name: "completion candidate KPI exists",
    ok: source.includes("completionCandidateCount"),
  },
  {
    name: "approval ready KPI exists",
    ok: source.includes("approvalReadyCount"),
  },
  {
    name: "approved KPI exists",
    ok: source.includes("approvedCount"),
  },
  {
    name: "evidence missing KPI exists",
    ok: source.includes("evidenceMissingCount"),
  },
  {
    name: "budget required KPI exists",
    ok: source.includes("budgetRequiredCount"),
  },
  {
    name: "executive summary exists",
    ok: source.includes("executiveSummaryMessage"),
  },
  {
    name: "Risk DB update remains blocked",
    ok: source.includes("riskDbUpdateAllowed: false"),
  },
  {
    name: "integrity note separates TBM and Risk DB completion",
    ok: source.includes("TBM 공유, 증빙 등록, 완료 후보는 Risk DB 완료와 분리"),
  },
];

const failed = checks.filter((check) => !check.ok);

console.log("");
console.log("SafeMetrica Dashboard Risk Execution KPI Verification");
console.log("====================================================");
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
console.log("- Dashboard risk execution KPI builder exists");
console.log("- TBM share KPIs exist");
console.log("- Completion candidate KPIs exist");
console.log("- Approval KPIs exist");
console.log("- Evidence and budget KPIs exist");
console.log("- Risk DB update remains blocked");
console.log("");
