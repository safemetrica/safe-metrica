import fs from "node:fs";

const FILES = {
  review: "src/lib/risk-share/riskShareManagerReview.ts",
  readModel: "src/lib/risk-share/riskShareManagerPublishReadModel.ts",
  page: "src/app/risk-share/manager/share-review/publish/page.tsx",
  client: "src/app/risk-share/manager/share-review/publish/PublishClient.tsx",
  route: "src/app/api/risk-share/manager/publish/route.ts",
  helper: "src/lib/risk-share/riskShareTenantPublish.ts",
};

const source = Object.fromEntries(
  Object.entries(FILES).map(([key, file]) => {
    if (!fs.existsSync(file)) {
      console.error(`FAIL: missing file - ${file}`);
      process.exit(1);
    }
    return [key, fs.readFileSync(file, "utf8")];
  }),
);

const checks = [];
const check = (name, ok) => checks.push({ name, ok: Boolean(ok) });

check(
  "PostgREST read casts bigint to text at the wire boundary",
  source.review.includes("review_revision_text:review_revision::text"),
);
check(
  "review parser accepts canonical positive decimal text only",
  source.review.includes("reviewRevision: string") &&
    source.review.includes("/^[1-9][0-9]*$/.test(reviewRevision)") &&
    !source.review.includes("Number(reviewRevision)"),
);
check(
  "read model preserves review revision",
  source.readModel.includes("reviewRevision: item.reviewRevision"),
);
check(
  "server page preserves review revision",
  source.page.includes("reviewRevision: entry.reviewRevision"),
);
check(
  "client pairs sorted Item ids and revisions by index",
  source.client.includes("selectedSorted.map((itemId) => readyById.get(itemId) ?? null)") &&
    source.client.includes("selectedExpectedReviewRevisions") &&
    source.client.includes("expectedReviewRevisions: selectedExpectedReviewRevisions"),
);
check(
  "idempotency identity includes expected revisions",
  source.client.includes("const payloadSignature = JSON.stringify({") &&
    source.client.includes("expectedReviewRevisions: selectedExpectedReviewRevisions"),
);
check(
  "API requires equal parallel arrays",
  source.route.includes("expectedReviewRevisionsRaw.length !== itemIdsRaw.length"),
);
check(
  "API validates positive in-range bigint decimal strings",
  source.route.includes("!/^[1-9][0-9]*$/.test(rawRevision)") &&
    source.route.includes("BigInt(rawRevision) > BigInt("9223372036854775807")"),
);
check(
  "API forwards caller revisions without a database reread",
  source.route.includes("expectedReviewRevisions: validatedBody.expectedReviewRevisions") &&
    !/selectSupabase|risk_share_items/.test(source.route),
);
check(
  "helper calls checked RPC only",
  source.helper.includes("/rest/v1/rpc/publish_risk_share_version_for_tenant_checked") &&
    !source.helper.includes("`/rest/v1/rpc/publish_risk_share_version_for_tenant`"),
);
check(
  "helper sends bigint array argument as decimal strings",
  source.helper.includes("p_expected_review_revisions: params.expectedReviewRevisions"),
);
check(
  "helper repeats pair validation fail-closed",
  source.helper.includes("params.itemIds.length !== params.expectedReviewRevisions.length") &&
    source.helper.includes("seenItemIds.has(normalizedItemId)") &&
    source.helper.includes("BigInt(revision) > BigInt("9223372036854775807")"),
);

const unsafeRevision = "9007199254740993";
const wire = JSON.parse(
  `[{"id":"00000000-0000-4000-8000-000000000001","review_revision_text":"${unsafeRevision}"}]`,
);
check(
  "JSON wire mirror preserves revision above Number.MAX_SAFE_INTEGER",
  wire[0].review_revision_text === unsafeRevision &&
    BigInt(wire[0].review_revision_text) === BigInt("9007199254740993"),
);

function validatePairs(itemIds, revisions) {
  if (
    !Array.isArray(itemIds) ||
    !Array.isArray(revisions) ||
    itemIds.length < 1 ||
    itemIds.length > 200 ||
    itemIds.length !== revisions.length
  ) return false;
  const seen = new Set();
  return itemIds.every((id, index) => {
    const normalized = typeof id === "string" ? id.toLowerCase() : "";
    const revision = revisions[index];
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalized) ||
      seen.has(normalized) ||
      typeof revision !== "string" ||
      !/^[1-9][0-9]*$/.test(revision) ||
      BigInt(revision) > BigInt("9223372036854775807")
    ) return false;
    seen.add(normalized);
    return true;
  });
}

const idA = "00000000-0000-4000-8000-000000000001";
const idB = "00000000-0000-4000-8000-000000000002";
check("mirror accepts bigint-safe ordered pairs", validatePairs([idA, idB], ["1", unsafeRevision]));
check("mirror rejects mismatched lengths", !validatePairs([idA], ["1", "2"]));
check("mirror rejects duplicate Item ids", !validatePairs([idA, idA], ["1", "2"]));
check("mirror rejects null revision", !validatePairs([idA], [null]));
check("mirror rejects zero revision", !validatePairs([idA], ["0"]));
check("mirror rejects negative revision", !validatePairs([idA], ["-1"]));
check("mirror rejects overflow bigint", !validatePairs([idA], ["9223372036854775808"]));

const failed = checks.filter((entry) => !entry.ok);
for (const entry of checks) console.log(`${entry.ok ? "PASS" : "FAIL"}: ${entry.name}`);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed.`);
if (failed.length > 0) process.exit(1);
