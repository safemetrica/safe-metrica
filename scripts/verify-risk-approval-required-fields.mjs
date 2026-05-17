import fs from "node:fs";

const apiFile = "src/app/api/risk-approval/route.ts";
const buttonFile = "src/app/risk/RiskApprovalButtons.tsx";

if (!fs.existsSync(apiFile)) {
  console.error(`FAIL: missing file - ${apiFile}`);
  process.exit(1);
}

if (!fs.existsSync(buttonFile)) {
  console.error(`FAIL: missing file - ${buttonFile}`);
  process.exit(1);
}

const api = fs.readFileSync(apiFile, "utf8");
const button = fs.readFileSync(buttonFile, "utf8");

const checks = [
  {
    name: "required approval status is checked",
    ok: api.includes("hasRequiredApprovalStatus") && api.includes('"반영 승인상태"'),
  },
  {
    name: "required reflection status is checked",
    ok: api.includes("hasRequiredReflectionStatus") && api.includes('"Risk DB 반영상태"'),
  },
  {
    name: "missing required fields fail request",
    ok: api.includes("승인 필수 필드를 업데이트할 수 없습니다"),
  },
  {
    name: "available fields are returned for debugging",
    ok: api.includes("availableFields"),
  },
  {
    name: "prepared fields are returned for debugging",
    ok: api.includes("preparedFields"),
  },
  {
    name: "button displays updated fields",
    ok: button.includes("data.updatedFields") && button.includes("처리 완료:"),
  },
];

const failed = checks.filter((check) => !check.ok);

console.log("");
console.log("SafeMetrica Risk Approval Required Fields Verification");
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
