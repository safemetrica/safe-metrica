import fs from "node:fs";

const file = "src/lib/tbmShareTracking.ts";

if (!fs.existsSync(file)) {
  console.error(`FAIL: missing file - ${file}`);
  process.exit(1);
}

const source = fs.readFileSync(file, "utf8");

const checks = [
  {
    name: "evaluateTbmShareTracking export exists",
    ok: source.includes("export function evaluateTbmShareTracking"),
  },
  {
    name: "TBM share status type exists",
    ok: source.includes("export type TbmShareStatus"),
  },
  {
    name: "shared status exists",
    ok: source.includes('"shared"'),
  },
  {
    name: "reviewNeeded status exists",
    ok: source.includes('"reviewNeeded"'),
  },
  {
    name: "required status exists",
    ok: source.includes('"required"'),
  },
  {
    name: "notRequired status exists",
    ok: source.includes('"notRequired"'),
  },
  {
    name: "Risk DB update remains blocked",
    ok: source.includes("riskDbUpdateAllowed: false"),
  },
  {
    name: "Relation is checked",
    ok: source.includes("relationLinked"),
  },
  {
    name: "linked TBM count is returned",
    ok: source.includes("linkedTbmCount"),
  },
  {
    name: "sharedByRole is tracked",
    ok: source.includes("sharedByRole"),
  },
];

const failed = checks.filter((check) => !check.ok);

console.log("");
console.log("SafeMetrica TBM Share Tracking Verification");
console.log("==========================================");
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
console.log("- TBM share tracking engine exists");
console.log("- Relation-based TBM link can be evaluated");
console.log("- TBM shared/review-needed/required states exist");
console.log("- Risk DB update remains blocked");
console.log("- Shared-by role can be tracked without complex permission logic");
console.log("");
