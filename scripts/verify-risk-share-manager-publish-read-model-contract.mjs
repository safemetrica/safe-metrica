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

const activeLookup = extractBalancedBlock(src, "async function fetchActiveVersionForMonth(");
const activeParser = extractBalancedBlock(src, "function parseActiveVersionRow(");
const classifier = extractBalancedBlock(src, "function toPublishEntry(");
const activeVersionType = extractBalancedBlock(
  src,
  "export type RiskShareManagerPublishActiveVersion",
);

check("server-only boundary", src.startsWith('import "server-only";'));
check(
  "reuses Manager Review safe list",
  src.includes("listRiskShareItemsForManagerReview") &&
    src.includes('from "@/lib/risk-share/riskShareManagerReview"'),
);
check(
  "uses server-only SELECT helper",
  src.includes("selectSupabaseExportRows") && src.includes('from "@/lib/supabaseServer"'),
);
check(
  "contains no mutation call",
  !src.includes("riskShareTenantPublish") &&
    !src.includes("publishRiskShareVersionForTenant") &&
    !src.includes("/rest/v1/rpc/") &&
    !src.includes('method: "POST"') &&
    !src.includes('method: "PATCH"') &&
    !src.includes('method: "DELETE"'),
);
check("strict tenant pattern", src.includes("COMPANY_CODE_PATTERN"));
check(
  "strict YYYY-MM pattern",
  src.includes("LOCK_MONTH_PATTERN") && src.includes("(0[1-9]|1[0-2])"),
);
check(
  "invalid inputs fail closed",
  src.includes("if (!companyCode || !lockMonth)") &&
    src.includes('return { status: "failed" };'),
);

check("active lookup exists", activeLookup !== null);
check(
  "active lookup is exact tenant month active",
  activeLookup?.includes("company_code: `eq.${companyCode}`") &&
    activeLookup.includes("lock_month: `eq.${lockMonth}`") &&
    activeLookup.includes('lock_status: "eq.active"'),
);
check(
  "active lookup selects tenant lineage",
  src.includes(
    '"company_code,lock_title,lock_month,item_count,customer_confirmed_count,worker_visible_count,lock_status,created_at"',
  ),
);
check(
  "duplicate active rows fail closed",
  activeLookup?.includes("if (rows.length > 1)") &&
    activeLookup.includes('return { status: "failed" };'),
);
check(
  "no active row is an explicit null state",
  activeLookup?.includes("if (rows.length === 0)") &&
    activeLookup.includes('return { status: "ok", activeVersion: null };'),
);
check(
  "normalized tenant reaches active parser",
  activeLookup?.includes("parseActiveVersionRow(rows[0], companyCode, lockMonth)"),
);

check("active parser exists", activeParser !== null);
check(
  "active parser revalidates tenant month status",
  activeParser?.includes("companyCode !== expectedCompanyCode") &&
    activeParser.includes("lockMonth !== expectedLockMonth") &&
    activeParser.includes('lockStatus !== "active"'),
);
check(
  "active parser validates positive integral counts",
  activeParser?.includes("itemCount === null") && activeParser.includes("itemCount < 1"),
);
check(
  "active parser does not apply tenant request cap",
  !activeParser?.includes("MAX_PUBLISH_ITEMS") && !src.includes("const MAX_PUBLISH_ITEMS"),
);
check(
  "active parser validates count parity",
  activeParser?.includes("customerConfirmedCount !== itemCount") &&
    activeParser.includes("workerVisibleCount < 0") &&
    activeParser.includes("workerVisibleCount > itemCount"),
);
check(
  "active Version output excludes tenant and internal Version IDs",
  activeVersionType !== null &&
    !activeVersionType.includes("companyCode") &&
    !activeVersionType.includes("company_code") &&
    !activeVersionType.includes("versionLockId") &&
    !/\bid\s*:/.test(activeVersionType),
);

check("classifier exists", classifier !== null);
check(
  "invalid Manager Review rows remain invalid",
  classifier?.includes('entry.kind === "invalid"') && classifier.includes('state: "invalid"'),
);
check(
  "one-sided lock state is invalid",
  classifier?.includes("hasVersionLock !== hasLockedStatus"),
);
check(
  "locked rows require confirmation invariants",
  classifier?.includes('item.customerCheckStatus !== "confirmed"') &&
    classifier.includes("!item.customerConfirmed") &&
    classifier.includes('return { kind: "invalid", id: item.id, state: "invalid" };'),
);
check(
  "only fully locked confirmed rows are already_locked",
  classifier?.includes("hasVersionLock && hasLockedStatus") &&
    classifier.includes('state: "already_locked"'),
);
check(
  "unlocked review gaps are explicit",
  [
    'reviewReasons.push("excluded")',
    'reviewReasons.push("share_status_not_customer_confirmed")',
    'reviewReasons.push("customer_check_not_confirmed")',
    'reviewReasons.push("customer_confirmation_missing")',
  ].every((token) => classifier?.includes(token)),
);
check(
  "ready state requires zero reasons",
  classifier?.includes(
    'state: reviewReasons.length === 0 ? "ready_to_publish" : "review_required"',
  ),
);

for (const token of [
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
]) {
  check(`forbidden token absent: ${token}`, !src.includes(token));
}

check(
  "read failures fail the complete model closed",
  src.includes(
    'if (reviewResult.status !== "ok" || activeVersionResult.status !== "ok")',
  ),
);
check("overflow preserved", src.includes("overflow: reviewResult.overflow"));
check("counts derive from returned entries", src.includes("counts: countEntries(entries)"));
check(
  "RPC remains final authority",
  /final eligibility[\s\S]*active-month[\s\S]*locking[\s\S]*snapshot[\s\S]*idempotency/i.test(src),
);
check(
  "Manager Review still selects eligibility fields",
  [
    "share_status",
    "customer_check_status",
    "customer_confirmed",
    "worker_visible",
    "version_lock_id",
    "review_revision",
    "review_revision_text:review_revision::text",
  ].every((field) => reviewModel.includes(field)),
);
check(
  "review revision stays canonical bigint text",
  reviewModel.includes("reviewRevisionText: string") &&
    reviewModel.includes("/^[1-9][0-9]*$/.test(reviewRevisionText)") &&
    src.includes("reviewRevision: item.reviewRevisionText"),
);
check(
  "package verifier registered",
  packageJson.scripts?.["verify:risk-share-manager-publish-read-model"] ===
    "node scripts/verify-risk-share-manager-publish-read-model-contract.mjs",
);

function classifyMirror(item) {
  const hasVersionLock = Boolean(item.versionLockId);
  const hasLockedStatus = item.shareStatus === "locked";
  if (hasVersionLock !== hasLockedStatus) return "invalid";
  if (hasVersionLock && hasLockedStatus) {
    return item.customerCheckStatus === "confirmed" && item.customerConfirmed
      ? "already_locked"
      : "invalid";
  }
  return item.shareStatus === "customer_confirmed" &&
    item.customerCheckStatus === "confirmed" &&
    item.customerConfirmed
    ? "ready_to_publish"
    : "review_required";
}

const classificationCases = [
  ["confirmed unlocked", "customer_confirmed", "confirmed", true, null, "ready_to_publish"],
  [
    "fully locked",
    "locked",
    "confirmed",
    true,
    "11111111-1111-4111-8111-111111111111",
    "already_locked",
  ],
  ["locked without Version", "locked", "confirmed", true, null, "invalid"],
  [
    "Version without locked status",
    "customer_confirmed",
    "confirmed",
    true,
    "11111111-1111-4111-8111-111111111111",
    "invalid",
  ],
  [
    "locked with returned check",
    "locked",
    "returned",
    true,
    "11111111-1111-4111-8111-111111111111",
    "invalid",
  ],
  [
    "locked without customer confirmation",
    "locked",
    "confirmed",
    false,
    "11111111-1111-4111-8111-111111111111",
    "invalid",
  ],
  ["excluded unlocked", "excluded", "confirmed", true, null, "review_required"],
  ["draft gaps", "draft", "requested", false, null, "review_required"],
];

for (const [name, shareStatus, customerCheckStatus, customerConfirmed, versionLockId, expected] of
  classificationCases) {
  check(
    `classification matrix: ${name}`,
    classifyMirror({ shareStatus, customerCheckStatus, customerConfirmed, versionLockId }) ===
      expected,
  );
}

function activeVersionMirror(row, expectedCompanyCode, expectedMonth) {
  const text = (value) => (typeof value === "string" ? value.trim() : "");
  const integer = (value) =>
    typeof value === "number" && Number.isInteger(value) ? value : null;
  const itemCount = integer(row.item_count);
  const confirmedCount = integer(row.customer_confirmed_count);
  const visibleCount = integer(row.worker_visible_count);

  if (
    text(row.company_code) !== expectedCompanyCode ||
    !text(row.lock_title) ||
    text(row.lock_month) !== expectedMonth ||
    text(row.lock_status) !== "active" ||
    !text(row.created_at) ||
    itemCount === null ||
    itemCount < 1 ||
    confirmedCount !== itemCount ||
    visibleCount === null ||
    visibleCount < 0 ||
    visibleCount > itemCount
  ) {
    return null;
  }
  return { itemCount, visibleCount };
}

const validVersion = {
  company_code: "test-risk-pack-01",
  lock_title: "2026년 7월 위험성평가 공유",
  lock_month: "2026-07",
  item_count: 2,
  customer_confirmed_count: 2,
  worker_visible_count: 1,
  lock_status: "active",
  created_at: "2026-07-19T00:00:00Z",
};

check(
  "active matrix: valid row",
  activeVersionMirror(validVersion, "test-risk-pack-01", "2026-07") !== null,
);
check(
  "active matrix: wrong tenant",
  activeVersionMirror(
    { ...validVersion, company_code: "other-tenant" },
    "test-risk-pack-01",
    "2026-07",
  ) === null,
);
check(
  "active matrix: valid legacy Version above 200",
  activeVersionMirror(
    {
      ...validVersion,
      item_count: 201,
      customer_confirmed_count: 201,
      worker_visible_count: 100,
    },
    "test-risk-pack-01",
    "2026-07",
  ) !== null,
);
check(
  "active matrix: wrong month",
  activeVersionMirror(
    { ...validVersion, lock_month: "2026-06" },
    "test-risk-pack-01",
    "2026-07",
  ) === null,
);
check(
  "active matrix: count mismatch",
  activeVersionMirror(
    { ...validVersion, customer_confirmed_count: 1 },
    "test-risk-pack-01",
    "2026-07",
  ) === null,
);
check(
  "active matrix: worker-visible overflow",
  activeVersionMirror(
    { ...validVersion, worker_visible_count: 3 },
    "test-risk-pack-01",
    "2026-07",
  ) === null,
);
check(
  "active matrix: non-integer count",
  activeVersionMirror(
    { ...validVersion, item_count: 2.5 },
    "test-risk-pack-01",
    "2026-07",
  ) === null,
);

const failed = checks.filter((entry) => !entry.ok);
for (const entry of checks) {
  console.log(`${entry.ok ? "PASS" : "FAIL"}: ${entry.name}`);
}
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed.`);
if (failed.length > 0) process.exit(1);
