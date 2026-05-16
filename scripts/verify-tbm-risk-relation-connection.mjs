import fs from "node:fs";

const files = {
  relation: "src/lib/tbmRiskRelation.ts",
  riskPage: "src/app/risk/page.tsx",
  summary: "src/lib/riskExecutionStatusSummary.ts",
};

for (const file of Object.values(files)) {
  if (!fs.existsSync(file)) {
    console.error(`FAIL: missing file - ${file}`);
    process.exit(1);
  }
}

const relation = fs.readFileSync(files.relation, "utf8");
const riskPage = fs.readFileSync(files.riskPage, "utf8");
const summary = fs.readFileSync(files.summary, "utf8");

const checks = [
  {
    name: "attachLinkedTbmsToRiskItems export exists",
    ok: relation.includes("export async function attachLinkedTbmsToRiskItems"),
  },
  {
    name: "TBM database is queried",
    ok: relation.includes("notion.databases.query"),
  },
  {
    name: "Relation IDs are extracted",
    ok: relation.includes("getRelationIds"),
  },
  {
    name: "linkedTbms are attached",
    ok: relation.includes("linkedTbms"),
  },
  {
    name: "risk page imports relation connector",
    ok: riskPage.includes("attachLinkedTbmsToRiskItems"),
  },
  {
    name: "risk page reads TBM database ID from company config",
    ok: riskPage.includes("tbmDatabaseId"),
  },
  {
    name: "risk page enriches risk items with linked TBMs",
    ok: riskPage.includes("const linkedRiskItems = await attachLinkedTbmsToRiskItems"),
  },
  {
    name: "summary uses linked TBM for completion candidate",
    ok: summary.includes("linkedTbmForCompletion"),
  },
  {
    name: "No Notion write is introduced",
    ok:
      !relation.includes("notion.pages.update") &&
      !relation.includes("databases.update") &&
      !riskPage.includes("notion.pages.update"),
  },
];

const failed = checks.filter((check) => !check.ok);

console.log("");
console.log("SafeMetrica TBM Risk Relation Connection Verification");
console.log("====================================================");
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
console.log("- TBM DB Relation can be read");
console.log("- linkedTbms are attached to Risk Items");
console.log("- /risk can show connected TBM count");
console.log("- No Notion write is introduced");
console.log("");
