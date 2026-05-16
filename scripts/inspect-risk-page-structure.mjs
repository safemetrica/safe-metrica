import fs from "node:fs";

const file = "src/app/risk/page.tsx";

if (!fs.existsSync(file)) {
  console.error(`FAIL: missing file - ${file}`);
  process.exit(1);
}

const source = fs.readFileSync(file, "utf8");

function count(pattern) {
  const matches = source.match(pattern);
  return matches ? matches.length : 0;
}

function has(text) {
  return source.includes(text);
}

function findLines(keyword) {
  const lines = source.split("\n");
  return lines
    .map((line, index) => ({ line: index + 1, text: line }))
    .filter((item) => item.text.includes(keyword))
    .slice(0, 20);
}

const checks = [
  {
    name: "risk page exists",
    ok: fs.existsSync(file),
  },
  {
    name: "React component exists",
    ok:
      has("export default") ||
      has("function Risk") ||
      has("const Risk") ||
      has("RiskPage"),
  },
  {
    name: "Risk Items wording exists",
    ok:
      has("위험항목") ||
      has("Risk Item") ||
      has("Risk Items") ||
      has("riskItems"),
  },
  {
    name: "status wording exists",
    ok:
      has("status") ||
      has("상태") ||
      has("미착수") ||
      has("진행중") ||
      has("완료"),
  },
  {
    name: "card-like UI exists",
    ok:
      has("Card") ||
      has("rounded") ||
      has("border") ||
      has("shadow"),
  },
];

const failed = checks.filter((check) => !check.ok);

console.log("");
console.log("SafeMetrica Risk Page Structure Inspection");
console.log("=========================================");
console.log("");

for (const check of checks) {
  console.log(`${check.ok ? "PASS" : "WARN"}: ${check.name}`);
}

console.log("");
console.log("File:");
console.log(`- ${file}`);
console.log("");
console.log("Basic counts:");
console.log(`- lines: ${source.split("\n").length}`);
console.log(`- imports: ${count(/^import /gm)}`);
console.log(`- map calls: ${count(/\.map\(/g)}`);
console.log(`- filter calls: ${count(/\.filter\(/g)}`);
console.log(`- Card tokens: ${count(/Card/g)}`);
console.log(`- status tokens: ${count(/status/g)}`);
console.log(`- riskItems tokens: ${count(/riskItems/g)}`);
console.log(`- item tokens: ${count(/\bitem\b/g)}`);
console.log("");

const keywords = [
  "riskItems",
  "Risk Item",
  "위험항목",
  "status",
  "상태",
  "map(",
  "return (",
];

for (const keyword of keywords) {
  const lines = findLines(keyword);
  console.log(`Keyword: ${keyword}`);
  if (lines.length === 0) {
    console.log("- no matches");
  } else {
    for (const item of lines) {
      console.log(`- L${item.line}: ${item.text.trim().slice(0, 160)}`);
    }
  }
  console.log("");
}

if (failed.length > 0) {
  console.log("Result: WARN");
  console.log("Some expected markers were not found. Review the output before UI integration.");
  process.exit(0);
}

console.log("Result: PASS");
console.log("");
console.log("Use this output to connect riskExecutionStatusSummary into /risk page safely.");
console.log("");
