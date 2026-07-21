import fs from "node:fs";

const PAGE_FILE = "src/app/risk-share/manager/share-review/publish/page.tsx";
const CLIENT_FILE = "src/app/risk-share/manager/share-review/publish/PublishClient.tsx";
const REVIEW_PAGE_FILE = "src/app/risk-share/manager/share-review/page.tsx";
const READ_MODEL_FILE = "src/lib/risk-share/riskShareManagerPublishReadModel.ts";
const API_FILE = "src/app/api/risk-share/manager/publish/route.ts";
const PACKAGE_FILE = "package.json";

for (const file of [
  PAGE_FILE,
  CLIENT_FILE,
  REVIEW_PAGE_FILE,
  READ_MODEL_FILE,
  API_FILE,
  PACKAGE_FILE,
]) {
  if (!fs.existsSync(file)) {
    console.error(`FAIL: missing file - ${file}`);
    process.exit(1);
  }
}

const page = fs.readFileSync(PAGE_FILE, "utf8");
const client = fs.readFileSync(CLIENT_FILE, "utf8");
const reviewPage = fs.readFileSync(REVIEW_PAGE_FILE, "utf8");
const readModel = fs.readFileSync(READ_MODEL_FILE, "utf8");
const api = fs.readFileSync(API_FILE, "utf8");
const packageJson = JSON.parse(fs.readFileSync(PACKAGE_FILE, "utf8"));
const checks = [];

function check(name, ok) {
  checks.push({ name, ok: Boolean(ok) });
}

function extractBalancedBlock(text, marker) {
  const start = text.indexOf(marker);
  const braceStart = start === -1 ? -1 : text.indexOf("{", start);
  if (braceStart === -1) return null;

  let depth = 0;
  for (let index = braceStart; index < text.length; index += 1) {
    if (text[index] === "{") depth += 1;
    if (text[index] === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(start, index + 1);
    }
  }
  return null;
}

const submitBlock = extractBalancedBlock(client, "async function submitPublish(");
const parserBlock = extractBalancedBlock(client, "function parsePublishApiResponse(");

check("page is dynamic", page.includes('export const dynamic = "force-dynamic"'));
check(
  "page uses current KST month only",
  page.includes('timeZone: "Asia/Seoul"') &&
    page.includes("getCurrentKstMonth()") &&
    !page.includes("params.lockMonth") &&
    !page.includes("params.month"),
);
check(
  "page resolves active tenant",
  page.includes("resolveActiveRiskSharePublicTenant(rawCompanyCode)"),
);
check(
  "page requires manager role",
  page.includes("requireTenantAccessForCurrentSession") &&
    page.includes('allowedRoles: ["tenant_admin", "tenant_manager"]'),
);
check(
  "page rechecks selected tenant and role",
  page.includes("selectedTenantCode !== tenantCode") &&
    page.includes('role !== "tenant_admin"') &&
    page.includes('role !== "tenant_manager"'),
);
check(
  "page reads publish state with server tenant",
  page.includes("listRiskShareManagerPublishState(selectedTenantCode, lockMonth)"),
);
check(
  "page contains no mutation call",
  !page.includes("publishRiskShareVersionForTenant") &&
    !page.includes("/api/risk-share/manager/publish") &&
    !page.includes('method: "POST"'),
);
check(
  "share review links to dedicated publish page",
  reviewPage.includes('"/risk-share/manager/share-review/publish"') &&
    reviewPage.includes("publishHref={publishHref}"),
);

check("client boundary", client.startsWith('"use client";'));
check(
  "client uses exact publish API",
  client.includes("/api/risk-share/manager/publish?company=") &&
    submitBlock?.includes('method: "POST"') &&
    submitBlock.includes('credentials: "same-origin"'),
);
check(
  "selection starts empty",
  client.includes("useState<string[]>([])") &&
    !client.includes("전체 선택") &&
    client.includes("항목은 자동 선택되지 않습니다"),
);
check(
  "only ready entries become selectable",
  client.includes('entry.state === "ready_to_publish" && !blocked') &&
    client.includes("readyById.has(itemId)"),
);
check(
  "active Version blocks publish",
  client.includes("activeVersion !== null") &&
    client.includes("const blocked =") &&
    client.includes("같은 달의 새 공유본은 이 화면에서 추가 게시할 수 없습니다"),
);
check(
  "overflow and failed reads block publish",
  client.includes('readStatus !== "ok" || overflow || activeVersion !== null'),
);
check(
  "publish requires explicit confirmation",
  submitBlock?.includes("window.confirm") &&
    submitBlock.includes("게시 후 선택 항목은 잠기며") &&
    submitBlock.includes("근로자별 확인 기록은 별도 단계"),
);
check(
  "server page passes canonical review revisions",
  page.includes("reviewRevision: entry.reviewRevision"),
);
check(
  "client keeps Item and revision pairs in canonical Item order",
  client.includes("selectedExpectedReviewRevisions") &&
    client.includes('entry?.reviewRevision ?? ""') &&
    client.includes("expectedReviewRevisions: selectedExpectedReviewRevisions"),
);
check(
  "revision participates in server and idempotency signatures",
  client.includes("[entry.id, entry.reviewRevision") &&
    client.includes("expectedReviewRevisions: selectedExpectedReviewRevisions"),
);
check(
  "idempotency key is reused for an identical payload",
  submitBlock?.includes("pendingIdempotencyKey && pendingPayloadSignature === payloadSignature") &&
    submitBlock.includes("crypto.randomUUID()"),
);
check(
  "authoritative refresh follows uncertain and terminal states",
  (submitBlock?.match(/router\.refresh\(\)/g) ?? []).length >= 6,
);
check(
  "success response count is checked against the selection",
  parserBlock?.includes("row.itemCount !== expectedItemCount") &&
    parserBlock.includes("row.workerVisibleCount !== expectedWorkerVisibleCount"),
);
check(
  "success and failure responses use exact key sets",
  client.includes("SUCCESS_RESPONSE_KEYS") &&
    client.includes("FAILURE_RESPONSE_KEYS") &&
    parserBlock?.includes("hasExactKeys"),
);
check(
  "known API errors have customer-safe handling",
  [
    'case "selection_mismatch"',
    'case "active_month_exists"',
    'case "idempotency_conflict"',
    'case "validation_failed"',
    'case "forbidden"',
    'case "request_failed"',
    'case "invalid_response"',
  ].every((token) => client.includes(token)),
);
check(
  "uncertain responses retain retry identity",
  client.includes('case "request_failed":') &&
    client.includes('case "invalid_response":') &&
    !client.slice(client.indexOf('case "request_failed":')).split("return;")[0].includes(
      "setPendingIdempotencyKey(null)",
    ),
);
check(
  "read model remains the UI data source",
  readModel.includes("listRiskShareManagerPublishState") &&
    readModel.includes("ready_to_publish") &&
    readModel.includes("already_locked"),
);
check(
  "API still omits internal Version UUID",
  api.includes("versionLockId is intentionally omitted") &&
    !api.slice(api.indexOf("return NextResponse.json(")).includes("versionLockId:"),
);

for (const forbiddenPhrase of [
  "법적 의무 충족",
  "과태료 방지",
  "면책",
  "근로자 참여 완료",
  "QR 확인을 근로자 참여로",
]) {
  check(
    `forbidden commercialization phrase absent: ${forbiddenPhrase}`,
    !page.includes(forbiddenPhrase) &&
      !client.includes(forbiddenPhrase) &&
      !reviewPage.includes(forbiddenPhrase),
  );
}

check(
  "package verifier registered",
  packageJson.scripts?.["verify:risk-share-manager-publish-ui"] ===
    "node scripts/verify-risk-share-manager-publish-ui-contract.mjs",
);

const failureStatuses = {
  validation_failed: [422],
  forbidden: [401, 403],
  selection_mismatch: [409],
  active_month_exists: [409],
  idempotency_conflict: [409],
  request_failed: [503],
  invalid_response: [503],
};

function mirrorParse(raw, status, expectedItemCount, expectedVisibleCount) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const keys = Object.keys(raw);

  if (raw.ok === true) {
    const allowed = ["ok", "code", "replayed", "itemCount", "workerVisibleCount"];
    if (
      keys.length !== allowed.length ||
      !keys.every((key) => allowed.includes(key)) ||
      raw.code !== "ok" ||
      typeof raw.replayed !== "boolean" ||
      status !== 200 ||
      !Number.isInteger(raw.itemCount) ||
      raw.itemCount !== expectedItemCount ||
      !Number.isInteger(raw.workerVisibleCount) ||
      raw.workerVisibleCount !== expectedVisibleCount
    ) {
      return null;
    }
    return "ok";
  }

  const allowed = ["ok", "code", "replayed"];
  if (
    raw.ok !== false ||
    keys.length !== allowed.length ||
    !keys.every((key) => allowed.includes(key)) ||
    raw.replayed !== false ||
    typeof raw.code !== "string" ||
    !failureStatuses[raw.code]?.includes(status)
  ) {
    return null;
  }
  return raw.code;
}

const parserCases = [
  ["fresh success", { ok: true, code: "ok", replayed: false, itemCount: 2, workerVisibleCount: 1 }, 200, 2, 1, "ok"],
  ["replay success", { ok: true, code: "ok", replayed: true, itemCount: 2, workerVisibleCount: 1 }, 200, 2, 1, "ok"],
  ["selection mismatch", { ok: false, code: "selection_mismatch", replayed: false }, 409, 2, 1, "selection_mismatch"],
  ["active month", { ok: false, code: "active_month_exists", replayed: false }, 409, 2, 1, "active_month_exists"],
  ["wrong success count", { ok: true, code: "ok", replayed: false, itemCount: 3, workerVisibleCount: 1 }, 200, 2, 1, null],
  ["extra success field", { ok: true, code: "ok", replayed: false, itemCount: 2, workerVisibleCount: 1, versionLockId: "hidden" }, 200, 2, 1, null],
  ["wrong error status", { ok: false, code: "forbidden", replayed: false }, 200, 2, 1, null],
  ["unknown code", { ok: false, code: "unknown", replayed: false }, 503, 2, 1, null],
];

for (const [name, raw, status, itemCount, visibleCount, expected] of parserCases) {
  check(
    `response parser matrix: ${name}`,
    mirrorParse(raw, status, itemCount, visibleCount) === expected,
  );
}

const failed = checks.filter((entry) => !entry.ok);
for (const entry of checks) {
  console.log(`${entry.ok ? "PASS" : "FAIL"}: ${entry.name}`);
}
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed.`);
if (failed.length > 0) process.exit(1);
