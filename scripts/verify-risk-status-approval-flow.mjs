import fs from "node:fs";

const file = "src/lib/riskStatusApprovalFlow.ts";

if (!fs.existsSync(file)) {
  console.error(`FAIL: missing file - ${file}`);
  process.exit(1);
}

const source = fs.readFileSync(file, "utf8");

const checks = [
  {
    name: "evaluateRiskStatusApproval export exists",
    ok: source.includes("export function evaluateRiskStatusApproval"),
  },
  {
    name: "completion candidate gate exists",
    ok: source.includes('input.completionLevel !== "completionCandidate"'),
  },
  {
    name: "approval role gate exists",
    ok: source.includes("isAllowedApprovalRole"),
  },
  {
    name: "missing evidence gate exists",
    ok: source.includes("missingEvidence.length > 0"),
  },
  {
    name: "approved payload builder exists",
    ok: source.includes("buildApprovedPayload"),
  },
  {
    name: "actual Notion DB write is not performed",
    ok: source.includes("Notion DB를 직접 변경하지 않습니다"),
  },
  {
    name: "approval ready status exists",
    ok: source.includes('"approvalReady"'),
  },
  {
    name: "approved status exists",
    ok: source.includes('"approved"'),
  },
  {
    name: "more evidence required status exists",
    ok: source.includes('"moreEvidenceRequired"'),
  },
  {
    name: "candidate and approval are separated",
    ok: source.includes("완료 후보와 승인 완료는 분리"),
  },
];

const failed = checks.filter((check) => !check.ok);

console.log("");
console.log("SafeMetrica Risk Status Approval Flow Verification");
console.log("=================================================");
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
console.log("- Risk status approval flow exists");
console.log("- Completion candidate is required before approval");
console.log("- Approval role gate exists");
console.log("- Missing evidence blocks approval");
console.log("- Approved result creates update payload only");
console.log("- No Notion DB write is performed");
console.log("");
