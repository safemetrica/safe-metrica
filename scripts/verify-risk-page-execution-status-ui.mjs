import fs from "node:fs";

const file = "src/app/risk/page.tsx";

if (!fs.existsSync(file)) {
  console.error(`FAIL: missing file - ${file}`);
  process.exit(1);
}

const source = fs.readFileSync(file, "utf8");

const hasBadge = source.includes("function RiskExecutionStatusBadge");
const hasPanel = source.includes("function RiskExecutionStatusPanel");

const rendersBadge = source.includes("<RiskExecutionStatusBadge summary={executionSummary} />");
const rendersPanel = source.includes("<RiskExecutionStatusPanel summary={executionSummary} />");

const checks = [
  {
    name: "risk execution summary import exists",
    ok: source.includes("buildRiskExecutionStatusSummary"),
  },
  {
    name: "execution status component exists",
    ok: hasBadge || hasPanel,
  },
  {
    name: "execution summary is calculated in RiskItemCard",
    ok: source.includes("const executionSummary = buildRiskExecutionStatusSummary"),
  },
  {
    name: "execution status component is rendered",
    ok: rendersBadge || rendersPanel,
  },
  {
    name: "TBM share status is shown",
    ok:
      source.includes("summary.tbmShare.shortLabel") ||
      source.includes("summary.tbmShare.label") ||
      source.includes("TBM 공유상태"),
  },
  {
    name: "completion candidate status is shown",
    ok:
      source.includes("summary.completionCandidate.shortLabel") ||
      source.includes("summary.completionCandidate.label") ||
      source.includes("개선대책 판정"),
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
console.log("- /risk page renders execution status UI");
console.log("- TBM share status is visible");
console.log("- completion candidate status is visible");
console.log("- Risk DB remains not updated by UI");
console.log("");
