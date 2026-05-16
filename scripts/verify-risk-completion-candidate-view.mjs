import fs from "node:fs";

const file = "src/lib/riskCompletionCandidateView.ts";

if (!fs.existsSync(file)) {
  console.error(`FAIL: missing file - ${file}`);
  process.exit(1);
}

const source = fs.readFileSync(file, "utf8");

const checks = [
  {
    name: "getRiskCompletionCandidateView export exists",
    ok: source.includes("export function getRiskCompletionCandidateView"),
  },
  {
    name: "risk evidence completion adapter is used",
    ok: source.includes("evaluateRiskEvidenceCompletion"),
  },
  {
    name: "completion candidate label exists",
    ok: source.includes("개선대책 완료 후보"),
  },
  {
    name: "in progress label exists",
    ok: source.includes("조치 진행중"),
  },
  {
    name: "evidence only label exists",
    ok: source.includes("증빙 확인 · 완료조건 확인 필요"),
  },
  {
    name: "not started label exists",
    ok: source.includes("조치 증빙 미확인"),
  },
  {
    name: "Risk DB update remains blocked",
    ok: source.includes("riskDbUpdateAllowed: false"),
  },
  {
    name: "integrity note exists",
    ok: source.includes("Risk DB 상태는 자동 변경되지 않습니다"),
  },
  {
    name: "candidate is not approval",
    ok: source.includes("완료 후보는 관리자 검토 전 단계입니다"),
  },
];

const failed = checks.filter((check) => !check.ok);

console.log("");
console.log("SafeMetrica Risk Completion Candidate View Verification");
console.log("======================================================");
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
console.log("- Risk completion candidate view model exists");
console.log("- Risk evidence completion adapter is connected");
console.log("- Completion candidate / in-progress / evidence-only / not-started labels exist");
console.log("- Risk DB update remains blocked");
console.log("- Completion candidate remains separate from approval");
console.log("");
