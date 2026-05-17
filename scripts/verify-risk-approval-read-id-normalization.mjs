import fs from "node:fs";

const file = "src/lib/riskApprovalFields.ts";

if (!fs.existsSync(file)) {
  console.error(`FAIL: missing file - ${file}`);
  process.exit(1);
}

const source = fs.readFileSync(file, "utf8");

const checks = [
  {
    name: "Notion page id normalizer exists",
    ok: source.includes("function normalizeNotionPageId"),
  },
  {
    name: "normalizer removes hyphens",
    ok: source.includes('replace(/-/g, "")'),
  },
  {
    name: "approval map stores normalized page id",
    ok: source.includes("approvalMap.set(normalizeNotionPageId(page.id)"),
  },
  {
    name: "approval map reads normalized risk id",
    ok: source.includes("approvalMap.get(normalizeNotionPageId(riskId))"),
  },
  {
    name: "approval fields still read approval status",
    ok: source.includes("반영 승인상태"),
  },
  {
    name: "approval fields still read reflection status",
    ok: source.includes("Risk DB 반영상태"),
  },
  {
    name: "No Notion write is introduced",
    ok: !source.includes("pages.update") && !source.includes("databases.update"),
  },
];

const failed = checks.filter((check) => !check.ok);

console.log("");
console.log("SafeMetrica Risk Approval Read ID Normalization Verification");
console.log("===========================================================");
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
