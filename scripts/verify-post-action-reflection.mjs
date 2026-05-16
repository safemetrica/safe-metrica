import fs from "node:fs";

const files = {
  approvalFields: "src/lib/riskApprovalFields.ts",
  summary: "src/lib/riskExecutionStatusSummary.ts",
  riskPage: "src/app/risk/page.tsx",
};

for (const file of Object.values(files)) {
  if (!fs.existsSync(file)) {
    console.error(`FAIL: missing file - ${file}`);
    process.exit(1);
  }
}

const approvalFields = fs.readFileSync(files.approvalFields, "utf8");
const summary = fs.readFileSync(files.summary, "utf8");
const riskPage = fs.readFileSync(files.riskPage, "utf8");

const checks = [
  {
    name: "post action reflection field is read",
    ok: approvalFields.includes("조치 후 반영내용"),
  },
  {
    name: "action reflection type field is read",
    ok: approvalFields.includes("조치 반영유형"),
  },
  {
    name: "action reflection date field is read",
    ok: approvalFields.includes("조치 반영일"),
  },
  {
    name: "action reflection evidence field is read",
    ok: approvalFields.includes("조치 반영 근거"),
  },
  {
    name: "multi select is supported",
    ok: approvalFields.includes('property.type === "multi_select"'),
  },
  {
    name: "summary carries post action reflection",
    ok: summary.includes("postActionReflection: riskItem.postActionReflection"),
  },
  {
    name: "risk page renders post action reflection",
    ok: riskPage.includes("조치 후 반영내용"),
  },
  {
    name: "risk page separates original evaluation and reflection",
    ok: riskPage.includes("최초·정기·수시·상시평가 내용과 분리 기록"),
  },
  {
    name: "No Notion write is introduced",
    ok:
      !approvalFields.includes("pages.update") &&
      !summary.includes("pages.update") &&
      !riskPage.includes("pages.update"),
  },
];

const failed = checks.filter((check) => !check.ok);

console.log("");
console.log("SafeMetrica Post Action Reflection Verification");
console.log("==============================================");
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
