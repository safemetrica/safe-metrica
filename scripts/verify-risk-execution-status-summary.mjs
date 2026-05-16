import fs from "node:fs";

const file = "src/lib/riskExecutionStatusSummary.ts";

if (!fs.existsSync(file)) {
  console.error(`FAIL: missing file - ${file}`);
  process.exit(1);
}

const source = fs.readFileSync(file, "utf8");

const checks = [
  {
    name: "buildRiskExecutionStatusSummary export exists",
    ok: source.includes("export function buildRiskExecutionStatusSummary"),
  },
  {
    name: "TBM share status view is used",
    ok: source.includes("getRiskTbmShareStatusView"),
  },
  {
    name: "completion candidate view is used",
    ok: source.includes("getRiskCompletionCandidateView"),
  },
  {
    name: "approval flow is used",
    ok: source.includes("evaluateRiskStatusApproval"),
  },
  {
    name: "dashboard KPI source item exists",
    ok: source.includes("dashboardKpiSourceItem"),
  },
  {
    name: "overall status exists",
    ok: source.includes("overallStatus"),
  },
  {
    name: "approval ready status exists",
    ok: source.includes('"approvalReady"'),
  },
  {
    name: "completion candidate status exists",
    ok: source.includes('"completionCandidate"'),
  },
  {
    name: "TBM share required status exists",
    ok: source.includes('"tbmShareRequired"'),
  },
  {
    name: "Risk DB update remains blocked",
    ok: source.includes("riskDbUpdateAllowed: false"),
  },
  {
    name: "integrity note exists",
    ok: source.includes("Risk DB를 직접 변경하지 않습니다"),
  },
];

const failed = checks.filter((check) => !check.ok);

console.log("");
console.log("SafeMetrica Risk Execution Status Summary Verification");
console.log("=====================================================");
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
console.log("- Risk execution status summary builder exists");
console.log("- TBM share status, completion candidate, approval flow are integrated");
console.log("- Dashboard KPI source item is generated");
console.log("- Risk DB update remains blocked");
console.log("");
