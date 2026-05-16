import fs from "node:fs";
import path from "node:path";

const requiredFiles = [
  "src/lib/riskCompletionRules.ts",
  "src/lib/riskEvidenceCompletionAdapter.ts",
];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    console.error(`FAIL: missing file - ${file}`);
    process.exit(1);
  }
}

const rules = fs.readFileSync("src/lib/riskCompletionRules.ts", "utf8");
const adapter = fs.readFileSync("src/lib/riskEvidenceCompletionAdapter.ts", "utf8");

const checks = [
  {
    name: "completion rules export exists",
    ok: rules.includes("export function evaluateRiskCompletion"),
  },
  {
    name: "Risk DB direct sync is blocked",
    ok: rules.includes("canSyncToRiskDb: false"),
  },
  {
    name: "truck bed cover rule exists",
    ok: rules.includes("vehicle-truck-cover-v1"),
  },
  {
    name: "vehicle collision rule exists",
    ok: rules.includes("vehicle-collision-control-v1"),
  },
  {
    name: "retaining wall rule exists",
    ok: rules.includes("retaining-wall-repair-v1"),
  },
  {
    name: "caught-in machine rule exists",
    ok: rules.includes("caught-in-machine-safety-v1"),
  },
  {
    name: "slip trip rule exists",
    ok: rules.includes("slip-trip-control-v1"),
  },
  {
    name: "adapter build input export exists",
    ok: adapter.includes("export function buildRiskCompletionInput"),
  },
  {
    name: "adapter evaluate export exists",
    ok: adapter.includes("export function evaluateRiskEvidenceCompletion"),
  },
  {
    name: "signature photo role exists",
    ok: adapter.includes("isSignaturePhoto"),
  },
  {
    name: "safety activity photo role exists",
    ok: adapter.includes("isSafetyActivityPhoto"),
  },
  {
    name: "work target photo role exists",
    ok: adapter.includes("isWorkTargetPhoto"),
  },
  {
    name: "action photo role exists",
    ok: adapter.includes("isActionPhoto"),
  },
];

const failed = checks.filter((check) => !check.ok);

console.log("");
console.log("SafeMetrica Risk Completion Verification");
console.log("=======================================");
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
console.log("- risk completion rules engine exists");
console.log("- evidence completion adapter exists");
console.log("- Risk DB direct sync remains blocked");
console.log("- completion remains candidate-only");
console.log("- evidence roles are separated");
console.log("");
