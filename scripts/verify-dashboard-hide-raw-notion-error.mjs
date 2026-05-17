import fs from "node:fs";

const file = "src/app/dashboard/page.tsx";

if (!fs.existsSync(file)) {
  console.error(`FAIL: missing file - ${file}`);
  process.exit(1);
}

const source = fs.readFileSync(file, "utf8");

const checks = [
  {
    name: "dashboard has safe Notion query fallback",
    ok:
      source.includes("dashboard_notion_query_failed") &&
      source.includes("results: []") &&
      source.includes("has_more: false"),
  },
  {
    name: "dashboard does not throw raw Notion query failure",
    ok: !source.includes("throw new Error(`Notion database query failed"),
  },
  {
    name: "dashboard does not expose raw Notion object_not_found in UI text",
    ok: !source.includes("object_not_found"),
  },
  {
    name: "dashboard has user-safe data connection message",
    ok: source.includes("일부 데이터 연결을 확인할 수 없어 현재 확인 가능한 항목만 요약합니다"),
  },
];

const failed = checks.filter((check) => !check.ok);

console.log("");
console.log("SafeMetrica Dashboard Raw Notion Error Hide Verification");
console.log("=======================================================");
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
