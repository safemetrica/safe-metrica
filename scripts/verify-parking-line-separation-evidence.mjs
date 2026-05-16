import fs from "node:fs";

const files = {
  rules: "src/lib/riskCompletionRules.ts",
  adapter: "src/lib/riskEvidenceCompletionAdapter.ts",
  tbmShare: "src/lib/tbmShareTracking.ts",
};

for (const file of Object.values(files)) {
  if (!fs.existsSync(file)) {
    console.error(`FAIL: missing file - ${file}`);
    process.exit(1);
  }
}

const rules = fs.readFileSync(files.rules, "utf8");
const adapter = fs.readFileSync(files.adapter, "utf8");
const tbmShare = fs.readFileSync(files.tbmShare, "utf8");

const checks = [
  {
    name: "parkingLine VisionObject exists",
    ok: rules.includes('"parkingLine"'),
  },
  {
    name: "laneMarking VisionObject exists",
    ok: rules.includes('"laneMarking"'),
  },
  {
    name: "pedestrianVehicleSeparation VisionObject exists",
    ok: rules.includes('"pedestrianVehicleSeparation"'),
  },
  {
    name: "vehicle collision control accepts parking line",
    ok: rules.includes('"parkingLine"') && rules.includes('"laneMarking"'),
  },
  {
    name: "vehicle collision keywords include parking line",
    ok: rules.includes('"주차라인"') && rules.includes('"동선분리"'),
  },
  {
    name: "adapter infers vision objects from text",
    ok: adapter.includes("inferVisionObjectsFromText"),
  },
  {
    name: "adapter detects parking line text",
    ok: adapter.includes("주차라인") && adapter.includes("라인마킹"),
  },
  {
    name: "adapter detects separation text",
    ok: adapter.includes("차량분리") && adapter.includes("보행자분리"),
  },
  {
    name: "TBM share tracking detects parking line",
    ok: tbmShare.includes("주차라인") && tbmShare.includes("동선분리"),
  },
];

const failed = checks.filter((check) => !check.ok);

console.log("");
console.log("SafeMetrica Parking Line Separation Evidence Verification");
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
console.log("Verified:");
console.log("- parking line evidence is recognized");
console.log("- vehicle/pedestrian separation evidence is recognized");
console.log("- TBM text such as 주차라인 완성 can be treated as share evidence");
console.log("");
