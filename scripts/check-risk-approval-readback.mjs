import fs from "node:fs";

const targets = [
  "src/lib/riskApprovalReadback.ts",
  "src/lib/riskApprovalFields.ts",
  "src/lib/riskExecutionStatusSummary.ts",
  "src/lib/riskStatusApprovalFlow.ts",
  "src/app/risk/page.tsx",
];

const requiredTerms = [
  "반영 승인상태",
  "Risk DB 반영상태",
  "approvalStatus",
  "riskDbReflectionStatus",
];

let failed = false;

for (const file of targets) {
  if (!fs.existsSync(file)) {
    console.log(`[WARN] missing: ${file}`);
    continue;
  }

  const text = fs.readFileSync(file, "utf8");
  console.log(`\n[CHECK] ${file}`);

  for (const term of requiredTerms) {
    const ok = text.includes(term);
    console.log(` - ${term}: ${ok ? "OK" : "MISSING"}`);
  }
}

const helper = fs.readFileSync("src/lib/riskApprovalReadback.ts", "utf8");
for (const term of [
  "normalizeNotionId",
  "readNotionPlainText",
  "readRiskApprovalReadbackFromPage",
  "mergeRiskApprovalReadback",
  "canShowRiskApprovalButton",
]) {
  if (!helper.includes(term)) {
    console.error(`[FAIL] helper missing ${term}`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log("\n[DONE] readback helper check complete");
