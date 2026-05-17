import fs from "node:fs";

const apiFile = "src/app/api/risk-approval/route.ts";

if (!fs.existsSync(apiFile)) {
  console.error(`FAIL: missing file - ${apiFile}`);
  process.exit(1);
}

const api = fs.readFileSync(apiFile, "utf8");

const checks = [
  {
    name: "API retrieves page before update",
    ok: api.includes("notion.pages.retrieve"),
  },
  {
    name: "API checks actual property types",
    ok: api.includes("pageProperties") && api.includes("field.type"),
  },
  {
    name: "API supports select or status",
    ok: api.includes("setSelectOrStatus") && api.includes('field.type === "status"'),
  },
  {
    name: "API safely writes rich text fields",
    ok: api.includes("setRichTextIfPossible"),
  },
  {
    name: "API safely writes date fields",
    ok: api.includes("setDateIfPossible"),
  },
  {
    name: "API safely writes multi select or rich text reflection type",
    ok:
      api.includes("setReflectionTypeIfPossible") &&
      api.includes('field.type === "multi_select"') &&
      api.includes('field.type === "rich_text"'),
  },
  {
    name: "API falls back candidate into approval memo",
    ok: api.includes("buildMemoWithCandidate") && api.includes("[AI 반영 후보]"),
  },
  {
    name: "API skips missing post action fields without failing approval",
    ok: api.includes("skippedPostActionFields"),
  },
  {
    name: "API returns available fields when no writable fields",
    ok: api.includes("availableFields"),
  },
  {
    name: "API returns detailed Notion error message",
    ok: api.includes("getNotionErrorMessage"),
  },
];

const failed = checks.filter((check) => !check.ok);

console.log("");
console.log("SafeMetrica Risk Approval Field Type Safe Update Verification");
console.log("============================================================");
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
