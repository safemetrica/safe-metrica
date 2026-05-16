import fs from "node:fs";

const file = "src/app/risk/page.tsx";

if (!fs.existsSync(file)) {
  console.error(`FAIL: missing file - ${file}`);
  process.exit(1);
}

const source = fs.readFileSync(file, "utf8");

const checks = [
  {
    name: "risk execution summary import exists",
    ok: source.includes("buildRiskExecutionStatusSummary"),
  },
  {
    name: "RiskExecutionStatusBadge component exists",
    ok: source.includes("function RiskExecutionStatusBadge"),
  },
  {
    name: "execution summary is calculated in RiskItemCard",
    ok: source.includes("const executionSummary = buildRiskExecutionStatusSummary"),
  },
  {
    name: "execution status badge is rendered",
    ok: source.includes("<RiskExecutionStatusBadge summary={executionSummary} />"),
  },
  {
    name: "TBM share short label is shown",
    ok: source.includes("summary.tbmShare.shortLabel"),
  },
  {
    name: "completion candidate short label is shown",
    ok: source.includes("summary.completionCandidate.shortLabel"),
  },
  {
    name: "Risk DB no-update label exists",
    ok: source.includes("Risk DB 미반영"),
  },
  {
    name: "Notion write is not introduced",
    ok: !source.includes("notion.pages.update") && !source.includes("databases.update"),
  },
];

const failed = checks.filter((check) => !check.ok);

console.log("");
console.log("SafeMetrica Risk Page Execution Status UI Verification");
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
console.log("- /risk page renders integrated execution status badge");
console.log("- TBM share status is visible");
console.log("- completion candidate status is visible");
console.log("- Risk DB remains not updated by UI");
console.log("");
