import fs from "node:fs";

const file = "src/app/risk/page.tsx";

if (!fs.existsSync(file)) {
  console.error(`FAIL: missing file - ${file}`);
  process.exit(1);
}

const source = fs.readFileSync(file, "utf8");

const checks = [
  {
    name: "RiskExecutionStatusPanel component exists",
    ok: source.includes("function RiskExecutionStatusPanel"),
  },
  {
    name: "RiskExecutionStatusPanel is rendered",
    ok: source.includes("<RiskExecutionStatusPanel summary={executionSummary} />"),
  },
  {
    name: "TBM share status section exists",
    ok: source.includes("TBM 공유상태"),
  },
  {
    name: "completion candidate section exists",
    ok: source.includes("개선대책 판정"),
  },
  {
    name: "approval status section exists",
    ok: source.includes("승인·반영상태"),
  },
  {
    name: "Risk DB reflection label exists",
    ok: source.includes("riskDbReflectionLabel") && source.includes("Risk DB 미반영"),
  },
  {
    name: "integrity explanation exists",
    ok: source.includes("TBM 공유 완료는 교육·공유 이행 근거"),
  },
  {
    name: "Notion write is not introduced",
    ok: !source.includes("notion.pages.update") && !source.includes("databases.update"),
  },
];

const failed = checks.filter((check) => !check.ok);

console.log("");
console.log("SafeMetrica Risk Page Execution Status Panel Verification");
console.log("========================================================");
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
