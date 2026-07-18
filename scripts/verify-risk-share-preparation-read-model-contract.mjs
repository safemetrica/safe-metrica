import fs from "node:fs";

const MODULE_FILE = "src/lib/risk-share/riskSharePreparationReadModel.ts";
const SUPABASE_SERVER_FILE = "src/lib/supabaseServer.ts";

for (const file of [MODULE_FILE, SUPABASE_SERVER_FILE]) {
  if (!fs.existsSync(file)) {
    console.error(`FAIL: missing file - ${file}`);
    process.exit(1);
  }
}

const src = fs.readFileSync(MODULE_FILE, "utf8");

const checks = [];

function check(name, ok) {
  checks.push({ name, ok: Boolean(ok) });
}

function extractBlock(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  if (start === -1) return null;
  const end = endMarker ? text.indexOf(endMarker, start + startMarker.length) : text.length;
  return text.slice(start, end === -1 ? undefined : end);
}

function countOccurrences(text, needle) {
  if (!needle) return 0;
  let count = 0;
  let index = 0;
  for (;;) {
    const found = text.indexOf(needle, index);
    if (found === -1) break;
    count += 1;
    index = found + needle.length;
  }
  return count;
}

// =========================================================================
// A. Server boundary
// =========================================================================

check('module starts with import "server-only"', src.includes('import "server-only";'));
check(
  "reuses selectSupabaseExportRows, no new Supabase client constructed",
  src.includes("selectSupabaseExportRows<") &&
    !/createClient\s*\(/.test(src) &&
    !/new\s+SupabaseClient/.test(src),
);
check(
  "no direct fetch() call in this module (all network access goes through selectSupabaseExportRows)",
  !/\bfetch\s*\(/.test(src),
);
check(
  "no write verb / RPC mutation call anywhere in this module",
  !/\/rest\/v1\/rpc\//.test(src) &&
    !/method:\s*["'](POST|PATCH|PUT|DELETE)["']/.test(src),
);
check(
  "selectSupabaseExportRows is only ever called against risk_share_sources or risk_share_item_candidates (never the decisions table directly)",
  (() => {
    const calls = [...src.matchAll(/selectSupabaseExportRows<[^>]*>\(\s*\n?\s*"([^"]+)"/g)].map(
      (m) => m[1],
    );
    return (
      calls.length === 2 &&
      calls.includes("risk_share_sources") &&
      calls.includes("risk_share_item_candidates") &&
      !calls.includes("risk_share_preparation_decisions")
    );
  })(),
);

// =========================================================================
// B. Tenant and source scoping
// =========================================================================

check(
  "company_code filter present on both queries",
  countOccurrences(src, 'query.set("company_code"') >= 2,
);
check(
  "source_id filter present on both queries (id=eq for the source row, source_id=eq for candidates)",
  src.includes('query.set("id", `eq.${sourceId}`)') &&
    src.includes('query.set("source_id", `eq.${sourceId}`)'),
);
check(
  "no client/session/header/cookie parsing inside this module",
  !/\bheaders\s*\(/.test(src) &&
    !/\bcookies\s*\(/.test(src) &&
    !/getServerSession/.test(src) &&
    !/NextRequest/.test(src) &&
    !/NextResponse/.test(src),
);
check(
  "explicit safe caller-contract comment describing verifiedCompanyCode's origin",
  src.includes("verifiedCompanyCode") &&
    /authenticate\w* a browser/.test(src) &&
    src.includes("server-confirmed selectedTenantCode"),
);
check(
  "sourceId UUID-shape validated before any query is issued",
  src.includes("!isUuid(sourceId)"),
);

// =========================================================================
// C. Result allowlist
// =========================================================================

const entryTypeBlock = extractBlock(
  src,
  "export type RiskSharePreparationEntry",
  "export type RiskSharePreparationStateResult",
);

const ALLOWED_ENTRY_FIELDS = [
  "candidateId",
  "sourceId",
  "taskName",
  "hazard",
  "reviewerStatus",
  "category",
  "hasItem",
  "latestDecision",
  "latestReasonCode",
  "mappingMismatch",
  "missingRequiredField",
];

for (const field of ALLOWED_ENTRY_FIELDS) {
  check(`entry allowlist field present: ${field}`, entryTypeBlock?.includes(`${field}:`));
}

const FORBIDDEN_ENTRY_FIELDS = [
  "itemId",
  "decisionId",
  "decisionSeq",
  "companyCode",
  "membershipId",
  "actorMembershipId",
  "initiatedByMembershipId",
  "correlationId",
  "idempotencyKey",
  "candidateInputFingerprint",
  "safeMetadata",
  "safe_metadata",
  "rawPayload",
  "raw_payload",
];

for (const field of FORBIDDEN_ENTRY_FIELDS) {
  check(
    `forbidden field absent from entry type: ${field}`,
    entryTypeBlock !== null && !entryTypeBlock.includes(`${field}:`),
  );
}

check(
  'invalid entry shape is exactly { kind: "invalid"; candidateId: string | null }',
  entryTypeBlock?.includes('{ kind: "invalid"; candidateId: string | null }'),
);

const resultTypeBlock = extractBlock(
  src,
  "export type RiskSharePreparationStateResult",
  "type RiskShareItemLineageRow",
);

for (const field of FORBIDDEN_ENTRY_FIELDS) {
  check(
    `forbidden field absent from top-level result type: ${field}`,
    resultTypeBlock !== null && !resultTypeBlock.includes(`${field}:`),
  );
}

check(
  "no raw DB row shape (unknown-typed raw row types) is exported",
  !/^export type \w*Row\s*=/m.test(src),
);

// =========================================================================
// D. Latest Decision retrieval
// =========================================================================

check(
  "embedded Decision relationship uses an explicit FK-hint (no relationship-name ambiguity)",
  src.includes(
    "risk_share_preparation_decisions!risk_share_prep_decisions_candidate_lineage_fkey(",
  ),
);
check(
  "embedded Decision order is explicit and is decision_seq.desc",
  src.includes('query.set("risk_share_preparation_decisions.order", "decision_seq.desc")'),
);
check(
  "embedded Decision limit is explicit and is 1",
  src.includes('query.set("risk_share_preparation_decisions.limit", "1")'),
);
check(
  "created_at is never used to order the Decision embed",
  !/risk_share_preparation_decisions\.order["'],\s*["']created_at/.test(src),
);
check(
  "exactly one embedded-order and one embedded-limit directive for the Decision relationship (no duplicate/conflicting bound)",
  countOccurrences(src, 'query.set("risk_share_preparation_decisions.order"') === 1 &&
    countOccurrences(src, 'query.set("risk_share_preparation_decisions.limit"') === 1,
);
check(
  "no arbitrary global Decision history limit (no bare risk_share_preparation_decisions base-table fetch)",
  !/selectSupabaseExportRows[^(]*\(\s*"risk_share_preparation_decisions"/.test(src),
);
check(
  "Decision embed array is rejected (fails closed) if it ever carries more than 1 row -- proves the limit=1 bound is not silently trusted",
  src.includes("raw.length > 1") && src.includes("resolveDecisionLineage"),
);
check(
  "no N+1: the classification/lineage functions issue no network call per Candidate",
  (() => {
    const fnNames = ["resolveItemLineage", "resolveDecisionLineage", "toPreparationEntry"];
    return fnNames.every((fnName) => {
      const block = extractBlock(src, `function ${fnName}(`, "\n}\n");
      return (
        block !== null &&
        !/\bawait\b/.test(block) &&
        !block.includes("selectSupabaseExportRows")
      );
    });
  })(),
);
check(
  "the two real queries are issued at most once per call (not inside boundedRows.map/entries loop)",
  (() => {
    const mapBlock = extractBlock(src, "boundedRows.map((row) =>", ");");
    return mapBlock !== null && !mapBlock.includes("selectSupabaseExportRows");
  })(),
);

// =========================================================================
// E. State precedence ordering
// =========================================================================

const classifyBlock = extractBlock(src, "let category: RiskSharePreparationCategory;", "return {\n    kind: \"valid\",");

check("state precedence block located", classifyBlock !== null);

if (classifyBlock !== null) {
  const invalidGuardIndex = src.indexOf('return { kind: "invalid", candidateId };', src.indexOf("function toPreparationEntry"));
  const hasItemIndex = classifyBlock.indexOf("if (hasItem)");
  const exceptionIndex = classifyBlock.indexOf('latestDecision === "owner_exception_required"');
  const awaitingIndex = classifyBlock.indexOf(
    'latestDecision === null && reviewerStatus === "pending" && mappingVersion !== null',
  );
  const notApplicableIndex = classifyBlock.indexOf('category = "not_applicable"');

  check(
    "precedence order: invalid guards precede category assignment",
    invalidGuardIndex !== -1 && invalidGuardIndex < src.indexOf("let category: RiskSharePreparationCategory;"),
  );
  check(
    "precedence order 2: hasItem -> already_prepared checked first",
    hasItemIndex !== -1 && hasItemIndex < exceptionIndex,
  );
  check(
    "precedence order 3: owner_exception_required -> recorded_exception checked second",
    exceptionIndex !== -1 && exceptionIndex < awaitingIndex,
  );
  check(
    "precedence order 4: pending + mapping + no Decision -> awaiting_preparation_request checked third",
    awaitingIndex !== -1 && awaitingIndex < notApplicableIndex,
  );
  check(
    "precedence order 5: not_applicable is the final fallback",
    notApplicableIndex !== -1,
  );
}

check(
  'no "eligible" or "auto_preparable" field is ever produced',
  !/\beligible\s*:/.test(src) && !/autoPreparable/i.test(src) && !/auto_preparable/i.test(src),
);

// =========================================================================
// F. Pure-state matrix (independent JS mirror of the precedence + flag
// rules, run against 13 synthetic cases). This cannot import the .ts
// module directly (path-alias resolution requires the Next.js build
// pipeline, not plain node), so it mirrors the same rules and relies on
// the static ordering/field checks above to keep the mirror honest against
// the real implementation.
// =========================================================================

const DECISIONS_REQUIRING_ITEM = new Set(["auto_prepared", "manager_review_required"]);
const KNOWN_REVIEWER_STATUSES = new Set([
  "pending",
  "accepted",
  "edited",
  "excluded",
  "needs_customer_check",
]);
const KNOWN_DECISIONS = new Set(["auto_prepared", "manager_review_required", "owner_exception_required"]);

function pickLatestDecisionRow(decisionRows) {
  // Mirrors what the DB-side embed (order=decision_seq.desc&limit=1) is
  // contracted to already do -- this function exists only so this script
  // can prove case 10 (highest decision_seq wins) without a live DB.
  if (decisionRows.length === 0) return null;
  return decisionRows.reduce((max, row) => (row.decision_seq > max.decision_seq ? row : max));
}

function classifyMirror({ hasItemRows, decisionRows, reviewerStatus, taskName, hazard, mappingVersion, confirmedMappingVersion }) {
  if (!KNOWN_REVIEWER_STATUSES.has(reviewerStatus)) {
    return { kind: "invalid" };
  }

  if (hasItemRows.length > 1) {
    return { kind: "invalid" };
  }

  const hasItem = hasItemRows.length === 1;

  const latestRow = pickLatestDecisionRow(decisionRows);

  let latestDecision = null;

  if (latestRow) {
    if (!KNOWN_DECISIONS.has(latestRow.decision)) {
      return { kind: "invalid" };
    }

    const requiresItem = DECISIONS_REQUIRING_ITEM.has(latestRow.decision);
    const itemPresentOnDecision = latestRow.item_id !== null;

    if (requiresItem !== itemPresentOnDecision) {
      return { kind: "invalid" };
    }

    if (requiresItem && !hasItem) {
      return { kind: "invalid" };
    }

    latestDecision = latestRow.decision;
  }

  let mappingMismatch = false;
  if (mappingVersion !== null) {
    mappingMismatch = confirmedMappingVersion === undefined || confirmedMappingVersion !== mappingVersion;
  }

  const missingRequiredField = taskName.trim().length === 0 || hazard.trim().length === 0;

  let category;
  if (hasItem) {
    category = "already_prepared";
  } else if (latestDecision === "owner_exception_required") {
    category = "recorded_exception";
  } else if (latestDecision === null && reviewerStatus === "pending" && mappingVersion !== null) {
    category = "awaiting_preparation_request";
  } else {
    category = "not_applicable";
  }

  return { kind: "valid", category, mappingMismatch, missingRequiredField };
}

const pureCases = [
  {
    name: "1. no Decision + pending + mapping version",
    input: { hasItemRows: [], decisionRows: [], reviewerStatus: "pending", taskName: "task", hazard: "hazard", mappingVersion: 3, confirmedMappingVersion: 3 },
    expect: { kind: "valid", category: "awaiting_preparation_request" },
  },
  {
    name: "2. owner exception with no Item",
    input: { hasItemRows: [], decisionRows: [{ decision_seq: 1, decision: "owner_exception_required", item_id: null }], reviewerStatus: "pending", taskName: "task", hazard: "hazard", mappingVersion: 3, confirmedMappingVersion: 3 },
    expect: { kind: "valid", category: "recorded_exception" },
  },
  {
    name: "3. old owner exception plus Item (hasItem wins precedence)",
    input: { hasItemRows: [{}], decisionRows: [{ decision_seq: 1, decision: "owner_exception_required", item_id: null }], reviewerStatus: "excluded", taskName: "task", hazard: "hazard", mappingVersion: 3, confirmedMappingVersion: 3 },
    expect: { kind: "valid", category: "already_prepared" },
  },
  {
    name: "4. auto_prepared with Item",
    input: { hasItemRows: [{}], decisionRows: [{ decision_seq: 2, decision: "auto_prepared", item_id: "item-1" }], reviewerStatus: "accepted", taskName: "task", hazard: "hazard", mappingVersion: 3, confirmedMappingVersion: 3 },
    expect: { kind: "valid", category: "already_prepared" },
  },
  {
    name: "5. auto_prepared without Item -> invalid",
    input: { hasItemRows: [], decisionRows: [{ decision_seq: 2, decision: "auto_prepared", item_id: "item-1" }], reviewerStatus: "pending", taskName: "task", hazard: "hazard", mappingVersion: 3, confirmedMappingVersion: 3 },
    expect: { kind: "invalid" },
  },
  {
    name: "6. non-pending Candidate, no decision, no item",
    input: { hasItemRows: [], decisionRows: [], reviewerStatus: "accepted", taskName: "task", hazard: "hazard", mappingVersion: 3, confirmedMappingVersion: 3 },
    expect: { kind: "valid", category: "not_applicable" },
  },
  {
    name: "7. missing mapping provenance (mapping_version null)",
    input: { hasItemRows: [], decisionRows: [], reviewerStatus: "pending", taskName: "task", hazard: "hazard", mappingVersion: null, confirmedMappingVersion: undefined },
    expect: { kind: "valid", category: "not_applicable" },
  },
  {
    name: "8. malformed reviewer_status",
    input: { hasItemRows: [], decisionRows: [], reviewerStatus: "bogus_status", taskName: "task", hazard: "hazard", mappingVersion: 3, confirmedMappingVersion: 3 },
    expect: { kind: "invalid" },
  },
  {
    name: "9. unknown Decision value",
    input: { hasItemRows: [], decisionRows: [{ decision_seq: 1, decision: "bogus_decision", item_id: null }], reviewerStatus: "pending", taskName: "task", hazard: "hazard", mappingVersion: 3, confirmedMappingVersion: 3 },
    expect: { kind: "invalid" },
  },
  {
    name: "10. multiple Decisions -- highest decision_seq wins",
    input: {
      hasItemRows: [],
      decisionRows: [
        { decision_seq: 1, decision: "owner_exception_required", item_id: null },
        { decision_seq: 5, decision: "owner_exception_required", item_id: null },
        { decision_seq: 3, decision: "owner_exception_required", item_id: null },
      ],
      reviewerStatus: "pending",
      taskName: "task",
      hazard: "hazard",
      mappingVersion: 3,
      confirmedMappingVersion: 3,
    },
    expect: { kind: "valid", category: "recorded_exception" },
    extra: (result, input) => {
      const winner = pickLatestDecisionRow(input.decisionRows);
      return winner.decision_seq === 5;
    },
  },
  {
    name: "11. missing taskName flag",
    input: { hasItemRows: [], decisionRows: [], reviewerStatus: "pending", taskName: "", hazard: "hazard", mappingVersion: 3, confirmedMappingVersion: 3 },
    expect: { kind: "valid", category: "awaiting_preparation_request", missingRequiredField: true },
  },
  {
    name: "12. missing hazard flag",
    input: { hasItemRows: [], decisionRows: [], reviewerStatus: "pending", taskName: "task", hazard: "  ", mappingVersion: 3, confirmedMappingVersion: 3 },
    expect: { kind: "valid", category: "awaiting_preparation_request", missingRequiredField: true },
  },
  {
    name: "13. mapping mismatch flag",
    input: { hasItemRows: [], decisionRows: [], reviewerStatus: "pending", taskName: "task", hazard: "hazard", mappingVersion: 3, confirmedMappingVersion: 4 },
    expect: { kind: "valid", category: "awaiting_preparation_request", mappingMismatch: true },
  },
];

for (const testCase of pureCases) {
  const result = classifyMirror(testCase.input);
  let ok = result.kind === testCase.expect.kind;

  if (ok && testCase.expect.category !== undefined) {
    ok = result.category === testCase.expect.category;
  }
  if (ok && testCase.expect.missingRequiredField !== undefined) {
    ok = result.missingRequiredField === testCase.expect.missingRequiredField;
  }
  if (ok && testCase.expect.mappingMismatch !== undefined) {
    ok = result.mappingMismatch === testCase.expect.mappingMismatch;
  }
  if (ok && testCase.extra) {
    ok = testCase.extra(result, testCase.input);
  }

  check(`pure-state matrix: ${testCase.name}`, ok);
}

// =========================================================================
// Discriminated status handling (zero-state vs failure vs malformed row)
// =========================================================================

/** Naive brace matching ("}") stops at the first nested closing brace (e.g.
 * a console.error({...}) argument object), not the enclosing if-block's own
 * end -- a fixed-size text window after the marker is used instead of a
 * single-char endMarker for these checks. */
function windowAfter(text, marker, size) {
  const start = text.indexOf(marker);
  if (start === -1) return null;
  return text.slice(start, start + marker.length + size);
}

check(
  "empty source lookup (0 rows) returns status empty, not failed",
  (() => {
    const block = windowAfter(src, "if (!sourceResult.found) {", 80);
    return block?.includes('status: "empty"');
  })(),
);
check(
  "source query failure returns status failed, distinct from empty",
  (() => {
    const block = windowAfter(src, "if (!sourceResult.ok) {", 220);
    return block?.includes('status: "failed"');
  })(),
);
check(
  "candidate query failure (thrown) returns status failed",
  (() => {
    const block = extractBlock(src, "candidateRows = await fetchCandidatesWithLineage", "return { status: \"failed\" };");
    return block !== null && block.includes('catch');
  })(),
);
check(
  "zero Candidates for a real source returns status empty",
  (() => {
    const block = windowAfter(src, "if (candidateRows.length === 0) {", 80);
    return block?.includes('status: "empty"');
  })(),
);
check(
  "malformed Candidate rows stay in the ok result as invalid entries, never silently dropped",
  src.includes("summary.invalid += 1") && !/\.filter\(\(entry\) => entry\.kind === "valid"\)/.test(src),
);
check(
  "overflow flag derived from FETCH_LIMIT (201) vs DISPLAY_LIMIT (200), matching existing listRiskShareItemsForManagerReview convention",
  src.includes("const DISPLAY_LIMIT = 200;") &&
    src.includes("const FETCH_LIMIT = DISPLAY_LIMIT + 1;") &&
    src.includes("candidateRows.length > DISPLAY_LIMIT"),
);

// =========================================================================
// Logging boundary
// =========================================================================

check(
  "no company code / sourceId / candidateId / taskName / hazard logged",
  !/console\.(error|log|warn)\([\s\S]{0,200}(companyCode|verifiedCompanyCode|sourceId|candidateId|taskName|hazard)[\s\S]{0,80}:/i.test(src),
);
check(
  "log calls carry only operation name, not raw identifiers or DB rows",
  (() => {
    const logCalls = [...src.matchAll(/console\.error\(([\s\S]*?)\);/g)];
    return (
      logCalls.length > 0 &&
      logCalls.every(([, args]) => args.includes("operation:") && !/row|Row/.test(args))
    );
  })(),
);

// =========================================================================
// Summary
// =========================================================================

const failed = checks.filter((c) => !c.ok);

for (const c of checks) {
  console.log(`${c.ok ? "PASS" : "FAIL"}: ${c.name}`);
}

console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);

if (failed.length > 0) {
  console.error(`\nFAILED CHECKS (${failed.length}):`);
  for (const c of failed) {
    console.error(`  - ${c.name}`);
  }
  process.exit(1);
}

console.log("\nAll risk-share preparation read model contract checks passed.");
