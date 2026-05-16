import fs from "node:fs";

const files = {
  approvalFields: "src/lib/riskApprovalFields.ts",
  riskPage: "src/app/risk/page.tsx",
  approvalFlow: "src/lib/riskStatusApprovalFlow.ts",
  summary: "src/lib/riskExecutionStatusSummary.ts",
};

for (const file of Object.values(files)) {
  if (!fs.existsSync(file)) {
    console.error(`FAIL: missing file - ${file}`);
    process.exit(1);
  }
}

const approvalFields = fs.readFileSync(files.approvalFields, "utf8");
const riskPage = fs.readFileSync(files.riskPage, "utf8");
const approvalFlow = fs.readFileSync(files.approvalFlow, "utf8");
const summary = fs.readFileSync(files.summary, "utf8");

const checks = [
  {
    name: "approval field reader exists",
    ok: approvalFields.includes("export async function attachRiskApprovalFieldsToItems"),
  },
  {
    name: "approval status field is read",
    ok: approvalFields.includes("반영 승인상태"),
  },
  {
    name: "approval person field is read",
    ok: approvalFields.includes("반영 승인자"),
  },
  {
    name: "approval date field is read",
    ok: approvalFields.includes("반영 승인일"),
  },
  {
    name: "approval memo field is read",
    ok: approvalFields.includes("반영 승인 메모"),
  },
  {
    name: "reflection status field is read",
    ok: approvalFields.includes("Risk DB 반영상태"),
  },
  {
    name: "risk page attaches approval fields",
    ok: riskPage.includes("attachRiskApprovalFieldsToItems"),
  },
  {
    name: "approval flow handles approved status",
    ok: approvalFlow.includes('existingApprovalStatus.includes("승인완료")'),
  },
  {
    name: "approval flow handles rejected status",
    ok: approvalFlow.includes('existingApprovalStatus.includes("반려")'),
  },
  {
    name: "approval flow handles more evidence status",
    ok: approvalFlow.includes('existingApprovalStatus.includes("보완요청")'),
  },
  {
    name: "summary passes approval fields into approval flow",
    ok: summary.includes("existingApprovalStatus: riskItem.approvalStatus"),
  },
  {
    name: "No Notion write is introduced",
    ok:
      !approvalFields.includes("pages.update") &&
      !approvalFields.includes("databases.update") &&
      !riskPage.includes("pages.update"),
  },
];

const failed = checks.filter((check) => !check.ok);

console.log("");
console.log("SafeMetrica Risk Approval Fields Read Verification");
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
console.log("- Risk Items DB approval fields are read");
console.log("- approval status affects /risk display");
console.log("- no Notion write is introduced");
console.log("");
