import fs from "node:fs";

const READ_MODEL_FILE = "src/lib/risk-share/riskShareManagerPublishReadModel.ts";
const REVIEW_MODEL_FILE = "src/lib/risk-share/riskShareManagerReview.ts";
const PACKAGE_FILE = "package.json";

for (const file of [READ_MODEL_FILE, REVIEW_MODEL_FILE, PACKAGE_FILE]) {
  if (!fs.existsSync(file)) {
    console.error(`FAIL: missing file - ${file}`);
    process.exit(1);
  }
}

const src = fs.readFileSync(READ_MODEL_FILE, "utf8");
const reviewModel = fs.readFileSync(REVIEW_MODEL_FILE, "utf8");
const packageJson = JSON.parse(fs.readFileSync(PACKAGE_FILE, "utf8"));
const checks = [];

function check(name, ok) {
  checks.push({ name, ok: Boolean(ok) });
}

function countOccurrences(text, needle) {
  return text.split(needle).length - 1;
}

function extractBalancedBlock(text, startMarker) {
  const start = text.indexOf(startMarker);
  if (start === -1) return null;
  const braceStart = text.indexOf("{", start);
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

// A. File boundary and reuse of the established safe Manager Review list.
check("Read Model is server-only", src.startsWith('import "server-only";'));
check(
  "Read Model reuses listRiskShareItemsForManagerReview",
  src.includes("listRiskShareItemsForManagerReview") &&
    src.includes('from "@/lib/risk-share/riskShareManagerReview"'),
);
check(
  "Read Model uses the existing server-only SELECT helper",
  src.includes("selectSupabaseExportRows") && src.includes('from "@/lib/supabaseServer"'),
);
check(
  "Read Model does not import the Publish mutation helper or API route",
  !src.includes("riskShareTenantPublish") &&
    !src.includes("/api/risk-share/manager/publish") &&
    !src.includes("publishRiskShareVersionForTenant"),
);
check(
  "No direct mutation method or RPC endpoint is present",
  !src.includes('method: "POST"') &&
    !src.includes('method: "PATCH"') &&
    !src.includes('method: "DELETE"') &&
    !src.includes("/rest/v1/rpc/"),
);
check("No select star", !src.includes('select: "*"') && !src.includes("select=*"));

// B. Strict input normalization.
check("Strict company-code pattern exists", src.includes("COMPANY_CODE_PATTERN"));
check(
  "Strict YYYY-MM pattern exists",
  src.includes("LOCK_MONTH_PATTERN") && src.includes("(0[1-9]|1[0-2])"),
);
check(
  "Invalid company/month fails closed",
  src.includes("if (!companyCode || !lockMonth)") &&
    src.includes('return { status: "failed" };'),
);
check(
  "Only normalized tenant/month are passed to reads",
  src.includes("listRiskShareItemsForManagerReview(companyCode)") &&
    src.includes("fetchActiveVersionForMonth(companyCode, lockMonth)"),
);

// C. Active-month lookup contract.
const activeLookup = extractBalancedBlock(src, "async function fetchActiveVersionForMonth(");
check("Active-version lookup function exists", activeLookup !== null);
check(
  "Active lookup uses risk_share_version_locks only",
  activeLookup?.includes('"risk_share_version_locks"') &&
    !activeLookup.includes('"risk_share_items"') &&
    !activeLookup.includes('"risk_share_version_items"'),
);
check(
  "Active lookup is exact tenant + month + active",
  activeLookup?.includes("company_code: `eq.${companyCode}`") &&
    activeLookup.includes("lock_month: `eq.${lockMonth}`") &&
    activeLookup.includes('lock_status: "eq.active"'),
);
check(
  "Active lookup requests at most two rows to detect impossible duplicates",
  src.includes("const ACTIVE_VERSION_FETCH_LIMIT = 2;") &&
    activeLookup?.includes("limit: String(ACTIVE_VERSION_FETCH_LIMIT)"),
);
check(
  "Multiple active rows fail closed",
  activeLookup?.includes("if (rows.length > 1)") &&
    activeLookup.includes('return { status: "failed" };'),
);
check(
  "Zero active rows is a successful no-version state",
  activeLookup?.includes("if (rows.length === 0)") &&
    activeLookup.includes('return { status: "ok", activeVersion: null };'),
);
check(
  "Active lookup selects display-safe fields only",
  src.includes(
    '"lock_title,lock_month,item_count,customer_confirmed_count,worker_visible_count,lock_status,created_at"',
  ),
);

const activeParser = extractBalancedBlock(src, "function parseActiveVersionRow(");
check("Active-version parser exists", activeParser !== null);
check(
  "Active parser validates exact month and active status",
  activeParser?.includes("lockMonth !== expectedLockMonth") &&
    activeParser.includes('lockStatus !== "active"'),
);
check(
  "Active parser requires 1-200 item count",
  activeParser?.includes("itemCount < 1") &&
    activeParser.includes("itemCount > MAX_PUBLISH_ITEMS"),
);
check(
  "Active parser validates customer-confirmed count parity",
  activeParser?.includes("customerConfirmedCount !== itemCount"),
);
check(
  "Active parser bounds worker-visible count",
  activeParser?.includes("workerVisibleCount < 0") &&
    activeParser.includes("workerVisibleCount > itemCount"),
);
const activeVersionTypeBlock = extractBalancedBlock(
  src,
  "export type RiskShareManagerPublishActiveVersion",
);
check(
  "Active Version UUID is never selected or returned",
  activeVersionTypeBlock !== null &&
    !/\bid\s*:/.test(activeVersionTypeBlock) &&
    !activeVersionTypeBlock.includes("versionLockId") &&
    !src.includes("version_lock_id,lock_title") &&
    !src.includes("id,lock_title,lock_month"),
);

// D. Item classification is presentation-only and fail-closed.
const classifyBlock = extractBalancedBlock(src, "function toPublishEntry(");
check("Publish entry classifier exists", classifyBlock !== null);
check(
  "Malformed Manager Review rows remain visible as invalid",
  classifyBlock?.includes('entry.kind === "invalid"') &&
    classifyBlock.includes('state: "invalid"'),
);
check(
  "One-sided locked state is invalid",
  classifyBlock?.includes("hasVersionLock !== hasLockedStatus") &&
    classifyBlock.includes('return { kind: "invalid", id: item.id, state: "invalid" };'),
);
check(
  "Only fully locked rows become already_locked",
  classifyBlock?.includes("hasVersionLock && hasLockedStatus") &&
    classifyBlock.includes('state: "already_locked"'),
);
check(
  "Excluded rows retain an explicit reason",
  classifyBlock?.includes('item.shareStatus === "excluded"') &&
    classifyBlock.includes('reviewReasons.push("excluded")'),
);
check(
  "Share-status mismatch retains an explicit reason",
  classifyBlock?.includes('item.shareStatus !== "customer_confirmed"') &&
    classifyBlock.includes('reviewReasons.push("share_status_not_customer_confirmed")'),
);
check(
  "Customer-check mismatch retains an explicit reason",
  classifyBlock?.includes('item.customerCheckStatus !== "confirmed"') &&
    classifyBlock.includes('reviewReasons.push("customer_check_not_confirmed")'),
);
check(
  "Missing customer confirmation retains an explicit reason",
  classifyBlock?.includes("!item.customerConfirmed") &&
    classifyBlock.includes('reviewReasons.push("customer_confirmation_missing")'),
);
check(
  "Ready state requires zero review reasons",
  classifyBlock?.includes(
    'state: reviewReasons.length === 0 ? "ready_to_publish" : "review_required"',
  ),
);
check(
  "Classifier never infers or changes worker visibility",
  countOccurrences(classifyBlock ?? "", "workerVisible: item.workerVisible") === 2 &&
    !classifyBlock?.includes("workerVisible =") &&
    !classifyBlock?.includes("workerVisible: true") &&
    !classifyBlock?.includes("workerVisible: false"),
);

// E. Browser/data minimization.
const forbiddenTokens = [
  "membershipId",
  "actorMembershipId",
  "tenantId",
  "candidateId",
  "sourceId",
  "idempotencyKey",
  "raw_payload",
  "rawPayload",
  "ownerNote",
  "customerNote",
  "filePathname",
  "fileChecksum",
  "authorization",
  "serviceRoleKey",
  "email",
  "phone",
  "signature",
];
for (const token of forbiddenTokens) {
  check(`Forbidden output/internal token absent: ${token}`, !src.includes(token));
}
check(
  "Entry allowlist contains the expected publish display fields",
  [
    "id: string",
    "siteName: string | null",
    "sourceTitle: string",
    "taskName: string",
    "hazard: string",
    "riskLevel: string | null",
    "currentControls: string | null",
    "improvementPlan: string | null",
    "workerShareSummary: string | null",
    "workerVisible: boolean",
  ].every((field) => src.includes(field)),
);
check(
  "Raw tenant code and lineage IDs are not copied into output entries",
  !classifyBlock?.includes("companyCode:") &&
    !classifyBlock?.includes("sourceId:") &&
    !classifyBlock?.includes("candidateId:") &&
    !classifyBlock?.includes("versionLockId:"),
);

// F. Read-result integrity and final-authority statement.
check(
  "Review and active-version reads execute together",
  src.includes("const [reviewResult, activeVersionResult] = await Promise.all(["),
);
check(
  "Either read failure fails the whole Read Model closed",
  src.includes(
    'if (reviewResult.status !== "ok" || activeVersionResult.status !== "ok")',
  ),
);
check(
  "Overflow is preserved from the authoritative Manager Review list",
  src.includes("overflow: reviewResult.overflow"),
);
check(
  "Counts are derived from the exact returned entries",
  src.includes("counts: countEntries(entries)"),
);
check(
  "Comment keeps the Publish RPC as final transaction-time authority",
  /final eligibility[\s\S]*active-month[\s\S]*locking[\s\S]*snapshot[\s\S]*idempotency/i.test(src),
);
check(
  "Existing Manager Review model still selects the required eligibility fields",
  [
    "share_status",
    "customer_check_status",
    "customer_confirmed",
    "worker_visible",
    "version_lock_id",
    "review_revision",
  ].every((field) => reviewModel.includes(field)),
);

// G. Package registration.
check(
  "Package script is registered exactly",
  packageJson.scripts?.["verify:risk-share-manager-publish-read-model"] ===
    "node scripts/verify-risk-share-manager-publish-read-model-contract.mjs",
);

// H. Executable pure-state mirrors for the state matrix.
function classifyMirror(item) {
  const hasVersionLock = Boolean(item.versionLockId);
  const hasLockedStatus = item.shareStatus === "locked";
  if (hasVersionLock !== hasLockedStatus) return { state: "invalid", reasons: [] };
  if (hasVersionLock && hasLockedStatus) return { state: "already_locked", reasons: [] };

  const reasons = [];
  if (item.shareStatus === "excluded") reasons.push("excluded");
  else if (item.shareStatus !== "customer_confirmed") {
    reasons.push("share_status_not_customer_confirmed");
  }
  if (item.customerCheckStatus !== "confirmed") reasons.push("customer_check_not_confirmed");
  if (!item.customerConfirmed) reasons.push("customer_confirmation_missing");
  return { state: reasons.length === 0 ? "ready_to_publish" : "review_required", reasons };
}

const classificationCases = [
  {
    name: "exact confirmed unlocked row is ready",
    item: {
      shareStatus: "customer_confirmed",
      customerCheckStatus: "confirmed",
      customerConfirmed: true,
      versionLockId: null,
    },
    state: "ready_to_publish",
    reasons: [],
  },
  {
    name: "fully locked row is already locked",
    item: {
      shareStatus: "locked",
      customerCheckStatus: "confirmed",
      customerConfirmed: true,
      versionLockId: "11111111-1111-4111-8111-111111111111",
    },
    state: "already_locked",
    reasons: [],
  },
  {
    name: "locked status without version is invalid",
    item: {
      shareStatus: "locked",
      customerCheckStatus: "confirmed",
      customerConfirmed: true,
      versionLockId: null,
    },
    state: "invalid",
    reasons: [],
  },
  {
    name: "version without locked status is invalid",
    item: {
      shareStatus: "customer_confirmed",
      customerCheckStatus: "confirmed",
      customerConfirmed: true,
      versionLockId: "11111111-1111-4111-8111-111111111111",
    },
    state: "invalid",
    reasons: [],
  },
  {
    name: "excluded is review required with explicit reason",
    item: {
      shareStatus: "excluded",
      customerCheckStatus: "confirmed",
      customerConfirmed: true,
      versionLockId: null,
    },
    state: "review_required",
    reasons: ["excluded"],
  },
  {
    name: "all review gaps are retained",
    item: {
      shareStatus: "draft",
      customerCheckStatus: "requested",
      customerConfirmed: false,
      versionLockId: null,
    },
    state: "review_required",
    reasons: [
      "share_status_not_customer_confirmed",
      "customer_check_not_confirmed",
      "customer_confirmation_missing",
    ],
  },
];

for (const testCase of classificationCases) {
  const result = classifyMirror(testCase.item);
  check(
    `Classification matrix: ${testCase.name}`,
    result.state === testCase.state &&
      JSON.stringify(result.reasons) === JSON.stringify(testCase.reasons),
  );
}

function activeVersionMirror(row, expectedMonth) {
  const integer = (value) => (typeof value === "number" && Number.isInteger(value) ? value : null);
  const text = (value) => (typeof value === "string" ? value.trim() : "");
  const itemCount = integer(row.item_count);
  const customerConfirmedCount = integer(row.customer_confirmed_count);
  const workerVisibleCount = integer(row.worker_visible_count);
  if (
    !text(row.lock_title) ||
    text(row.lock_month) !== expectedMonth ||
    text(row.lock_status) !== "active" ||
    !text(row.created_at) ||
    itemCount === null ||
    itemCount < 1 ||
    itemCount > 200 ||
    customerConfirmedCount !== itemCount ||
    workerVisibleCount === null ||
    workerVisibleCount < 0 ||
    workerVisibleCount > itemCount
  ) {
    return null;
  }
  return { itemCount, workerVisibleCount };
}

const validVersion = {
  lock_title: "2026년 7월 위험성평가 공유",
  lock_month: "2026-07",
  item_count: 2,
  customer_confirmed_count: 2,
  worker_visible_count: 1,
  lock_status: "active",
  created_at: "2026-07-19T00:00:00Z",
};
check("Active parser matrix: valid row", activeVersionMirror(validVersion, "2026-07") !== null);
check(
  "Active parser matrix: wrong month",
  activeVersionMirror({ ...validVersion, lock_month: "2026-06" }, "2026-07") === null,
);
check(
  "Active parser matrix: count parity mismatch",
  activeVersionMirror({ ...validVersion, customer_confirmed_count: 1 }, "2026-07") === null,
);
check(
  "Active parser matrix: worker-visible overflow",
  activeVersionMirror({ ...validVersion, worker_visible_count: 3 }, "2026-07") === null,
);
check(
  "Active parser matrix: non-integer count",
  activeVersionMirror({ ...validVersion, item_count: 2.5 }, "2026-07") === null,
);

const failed = checks.filter((entry) => !entry.ok);
for (const entry of checks) {
  console.log(`${entry.ok ? "PASS" : "FAIL"}: ${entry.name}`);
}

console.log(`\n${checks.length - failed.length}/${checks.length} checks passed.`);
if (failed.length > 0) process.exit(1);
