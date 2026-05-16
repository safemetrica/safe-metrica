import fs from "node:fs";

const file = "src/lib/riskTbmShareStatusView.ts";

if (!fs.existsSync(file)) {
  console.error(`FAIL: missing file - ${file}`);
  process.exit(1);
}

const source = fs.readFileSync(file, "utf8");

const checks = [
  {
    name: "getRiskTbmShareStatusView export exists",
    ok: source.includes("export function getRiskTbmShareStatusView"),
  },
  {
    name: "TBM share tracking engine is used",
    ok: source.includes("evaluateTbmShareTracking"),
  },
  {
    name: "shared label exists",
    ok: source.includes("TBM 공유 완료"),
  },
  {
    name: "required label exists",
    ok: source.includes("TBM 공유 필요"),
  },
  {
    name: "review needed label exists",
    ok: source.includes("TBM 연결 확인 필요"),
  },
  {
    name: "not required label exists",
    ok: source.includes("TBM 공유 대상 아님"),
  },
  {
    name: "Risk DB update remains blocked",
    ok: source.includes("riskDbUpdateAllowed: false"),
  },
  {
    name: "integrity note exists",
    ok: source.includes("개선대책 완료 여부는 별도 증빙과 완료조건으로 판단"),
  },
];

const failed = checks.filter((check) => !check.ok);

console.log("");
console.log("SafeMetrica Risk TBM Share Status View Verification");
console.log("==================================================");
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
console.log("- Risk TBM share status view model exists");
console.log("- TBM share tracking engine is connected");
console.log("- Shared / required / review-needed / not-required labels exist");
console.log("- Risk DB update remains blocked");
console.log("");
