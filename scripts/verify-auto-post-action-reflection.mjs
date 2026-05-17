import fs from "node:fs";

const files = {
  engine: "src/lib/postActionReflectionCandidate.ts",
  summary: "src/lib/riskExecutionStatusSummary.ts",
  riskPage: "src/app/risk/page.tsx",
  button: "src/app/risk/RiskApprovalButtons.tsx",
  api: "src/app/api/risk-approval/route.ts",
};

for (const file of Object.values(files)) {
  if (!fs.existsSync(file)) {
    console.error(`FAIL: missing file - ${file}`);
    process.exit(1);
  }
}

const engine = fs.readFileSync(files.engine, "utf8");
const summary = fs.readFileSync(files.summary, "utf8");
const riskPage = fs.readFileSync(files.riskPage, "utf8");
const button = fs.readFileSync(files.button, "utf8");
const api = fs.readFileSync(files.api, "utf8");

const checks = [
  {
    name: "auto candidate engine exists",
    ok: engine.includes("buildPostActionReflectionCandidate"),
  },
  {
    name: "engine classifies TBM education",
    ok: engine.includes("TBM 교육"),
  },
  {
    name: "engine classifies administrative action",
    ok: engine.includes("관리적 조치"),
  },
  {
    name: "engine classifies technical action",
    ok: engine.includes("기술적 조치"),
  },
  {
    name: "engine classifies machinery improvement",
    ok: engine.includes("기계·설비 개선"),
  },
  {
    name: "summary builds candidate",
    ok: summary.includes("buildPostActionReflectionCandidate"),
  },
  {
    name: "risk page renders AI candidate",
    ok: riskPage.includes("AI 반영 후보"),
  },
  {
    name: "approval button sends candidate",
    ok: button.includes("postActionReflectionCandidate"),
  },
  {
    name: "approval API writes post action reflection",
    ok: api.includes('"조치 후 반영내용"'),
  },
  {
    name: "approval API writes reflection type",
    ok: api.includes('"조치 반영유형"') && api.includes("multi_select"),
  },
  {
    name: "approval API writes reflection date",
    ok: api.includes('"조치 반영일"'),
  },
  {
    name: "approval API writes reflection evidence",
    ok: api.includes('"조치 반영 근거"'),
  },
];

const failed = checks.filter((check) => !check.ok);

console.log("");
console.log("SafeMetrica Auto Post Action Reflection Verification");
console.log("===================================================");
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
