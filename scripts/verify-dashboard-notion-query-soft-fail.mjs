import fs from "node:fs";

const file = "src/app/dashboard/page.tsx";

if (!fs.existsSync(file)) {
  console.error(`FAIL: missing file - ${file}`);
  process.exit(1);
}

const source = fs.readFileSync(file, "utf8");

const checks = [
  {
    name: "dashboard logs Notion query failure",
    ok: source.includes("[SafeMetrica] Dashboard Notion database query failed"),
  },
  {
    name: "dashboard returns empty results on Notion query failure",
    ok:
      source.includes("results: []") &&
      source.includes("has_more: false") &&
      source.includes("next_cursor: null"),
  },
  {
    name: "dashboard no longer throws Notion database query failed",
    ok: !source.includes("throw new Error(`Notion database query failed"),
  },
];

const failed = checks.filter((check) => !check.ok);

console.log("");
console.log("SafeMetrica Dashboard Notion Query Soft Fail Verification");
console.log("========================================================");
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
