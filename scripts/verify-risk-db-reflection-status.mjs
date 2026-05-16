import fs from "node:fs";

const files = {
  summary: "src/lib/riskExecutionStatusSummary.ts",
  riskPage: "src/app/risk/page.tsx",
};

for (const file of Object.values(files)) {
  if (!fs.existsSync(file)) {
    console.error(`FAIL: missing file - ${file}`);
    process.exit(1);
  }
}

const summary = fs.readFileSync(files.summary, "utf8");
const riskPage = fs.readFileSync(files.riskPage, "utf8");

const checks = [
  {
    name: "reflection status resolver exists",
    ok: summary.includes("resolveRiskDbReflectionStatus"),
  },
  {
    name: "reflection label supports completed",
    ok: summary.includes("Risk DB 반영 완료"),
  },
  {
    name: "reflection label supports not reflected",
    ok: summary.includes("Risk DB 미반영"),
  },
  {
    name: "summary returns reflection status",
    ok: summary.includes("riskDbReflectionStatus: reflection.status"),
  },
  {
    name: "summary returns reflection label",
    ok: summary.includes("riskDbReflectionLabel: reflection.label"),
  },
  {
    name: "summary returns reflection tone",
    ok: summary.includes("riskDbReflectionTone: reflection.tone"),
  },
  {
    name: "risk page renders reflection label",
    ok: riskPage.includes("summary.riskDbReflectionLabel"),
  },
  {
    name: "risk page renders completed reflection message",
    ok: riskPage.includes("Risk DB 반영 완료 상태가 Notion 승인 필드에서 확인되었습니다"),
  },
  {
    name: "no additional Notion write is introduced",
    ok:
      !summary.includes("pages.update") &&
      !summary.includes("databases.update") &&
      !riskPage.includes("pages.update"),
  },
];

const failed = checks.filter((check) => !check.ok);

console.log("");
console.log("SafeMetrica Risk DB Reflection Status Verification");
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
console.log("- Risk DB reflection status is displayed");
console.log("- 반영 완료 and 미반영 states are separated");
console.log("- no additional Notion write is introduced");
console.log("");
