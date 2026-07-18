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
  "sourceRowNumber",
  "sourceRowSignatureSha256",
  "importActor",
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

const validEntryReturnBlock = extractBlock(src, 'return {\n    kind: "valid",', "\n  };\n}");

check(
  "the actual valid-entry return statement (not just the type declaration) never assigns itemId/decisionItemId",
  validEntryReturnBlock !== null &&
    !validEntryReturnBlock.includes("itemId") &&
    !validEntryReturnBlock.includes("decisionItemId"),
);

// =========================================================================
// Decision/reason pair validation (exact pairing, not independent enums)
// =========================================================================

const pairMapBlock = extractBlock(
  src,
  "const VALID_REASON_CODES_BY_DECISION",
  "const KNOWN_DECISIONS",
);

check("exact decision/reason pairing map is defined", pairMapBlock !== null);
check(
  "auto_prepared pairing is exactly AUTO_SAME_MAPPING / AUTO_SOURCE_FAITHFUL",
  pairMapBlock?.includes('auto_prepared: new Set(["AUTO_SAME_MAPPING", "AUTO_SOURCE_FAITHFUL"])'),
);
check(
  "manager_review_required pairing includes all six reason codes",
  ["FIRST_TEMPLATE_REVIEW", "LOW_CONFIDENCE", "SOURCE_LOCATION_UNCLEAR", "MAPPING_CHANGED", "ITEM_COUNT_DELTA", "CONTENT_MEANING_CHANGED"].every(
    (code) => pairMapBlock?.includes(`"${code}"`),
  ),
);
check(
  "owner_exception_required pairing includes all four reason codes",
  ["MISSING_REQUIRED_FIELD", "MAPPING_CONFLICT", "SENSITIVE_DATA_SUSPECTED", "REPEATED_PROCESSING_FAILURE"].every(
    (code) => pairMapBlock?.includes(`"${code}"`),
  ),
);
check(
  "reason_code is validated against the pairing map, not an independent flat enum",
  src.includes("VALID_REASON_CODES_BY_DECISION[decisionValue].has(reasonCode)") &&
    !/const KNOWN_REASON_CODES\s*=/.test(src),
);

// =========================================================================
// Exact Item lineage cross-check (decision item id vs embedded item id)
// =========================================================================

check(
  "Item lineage resolver returns an internal itemId (not just a hasItem boolean)",
  src.includes("itemId: string | null") && src.includes("itemId: id.toLowerCase()"),
);
check(
  "Decision lineage resolver returns an internal decisionItemId",
  src.includes("decisionItemId: string | null") && src.includes("const decisionItemId ="),
);
check(
  "decisions requiring an Item must reference the exact same Item id resolved from lineage",
  src.includes("decisionLineage.decisionItemId !== itemLineage.itemId"),
);
check(
  "decision requiring an Item but no embedded Item at all fails closed",
  src.includes("!itemLineage.hasItem ||"),
);
check(
  "owner_exception_required carrying a non-null Item id is explicitly rejected (named check, not only the generic presence check)",
  src.includes('decisionValue === "owner_exception_required" && decisionItemId !== null'),
);
check(
  "neither itemId nor decisionItemId ever appears in the entry or result type blocks",
  entryTypeBlock !== null &&
    resultTypeBlock !== null &&
    !entryTypeBlock.includes("itemId") &&
    !entryTypeBlock.includes("decisionItemId") &&
    !resultTypeBlock.includes("itemId") &&
    !resultTypeBlock.includes("decisionItemId"),
);

// =========================================================================
// Full mapping provenance validation (all-null-or-all-valid, 5 columns)
// =========================================================================

check(
  "source_row_number, source_row_signature_sha256, import_actor are read internally",
  src.includes("row.source_row_number") &&
    src.includes("row.source_row_signature_sha256") &&
    src.includes("row.import_actor"),
);
check(
  "source_row_signature_sha256 is validated as exactly 64 lowercase hex characters",
  src.includes("const SOURCE_ROW_SIGNATURE_PATTERN = /^[0-9a-f]{64}$/;"),
);
check(
  "import_actor is validated against the exact three known values",
  src.includes('new Set(["owner_console", "tenant_admin", "tenant_manager"])'),
);
check(
  "provenance is validated as all-null XOR all-valid, never a partial mix",
  src.includes("const allNull =") && src.includes("resolveMappingProvenance"),
);
check(
  "sheet_index provenance range is 0 through 19",
  /sheetIndex\s*<\s*0\s*\|\|\s*\n?\s*sheetIndex\s*>\s*19/.test(src),
);
check(
  "mapping_version and source_row_number both require >= 1",
  countOccurrences(src, "< 1") >= 2,
);
check(
  "source_row_number/source_row_signature_sha256/import_actor are read only inside resolveMappingProvenance (never elsewhere in the module)",
  (() => {
    const provenanceFn = extractBlock(src, "function resolveMappingProvenance(", "\n}\n");
    const rest = src.replace(provenanceFn ?? "", "");
    return (
      provenanceFn !== null &&
      !rest.includes("row.source_row_number") &&
      !rest.includes("row.source_row_signature_sha256") &&
      !rest.includes("row.import_actor")
    );
  })(),
);
check(
  "awaiting_preparation_request requires provenance.complete, not merely a non-null mapping_version",
  src.includes('reviewerStatus === "pending" && provenance.complete'),
);

// =========================================================================
// Strict numeric parsing (no decimal truncation, no NaN/Infinity, no
// out-of-range silently accepted)
// =========================================================================

check(
  "strict integer parser exists and rejects non-integers via Number.isInteger",
  src.includes("function readStrictInteger(") && src.includes("Number.isInteger(value)"),
);
check(
  "strict integer parser rejects non-integer-shaped strings (decimals, scientific notation, Infinity)",
  src.includes("/^-?\\d+$/.test(trimmed)"),
);
check(
  "the old truncating integer parser (Math.trunc-based) is fully removed",
  !/Math\.trunc/.test(src) && !/function readNullableInteger/.test(src),
);
check(
  "decision_seq is parsed with the strict integer parser and rejected below 1",
  src.includes("const decisionSeq = readStrictInteger(row.decision_seq);") &&
    src.includes("decisionSeq === null || decisionSeq < 1"),
);
check(
  "decision_seq is never included in the outward entry (validated internally only)",
  entryTypeBlock !== null && !entryTypeBlock.includes("decisionSeq"),
);

// =========================================================================
// Partial summary semantics (loaded-window, not full-source totals)
// =========================================================================

check(
  "summary.total (ambiguous capped-count name) no longer exists",
  !/\btotal\s*:/.test(resultTypeBlock ?? "") && !src.includes("total: entries.length"),
);
check(
  "summary.loadedTotal replaces it, explicitly scoped to the loaded window",
  resultTypeBlock?.includes("loadedTotal: number") && src.includes("loadedTotal: entries.length"),
);
check(
  "summary.isComplete is derived as exactly !overflow",
  resultTypeBlock?.includes("isComplete: boolean") && src.includes("isComplete: !overflow"),
);
check(
  "a comment states loaded-window counts must not be read as full-source totals when isComplete is false",
  /never a source-wide total|not a source-wide total|only a loaded window|not.*full-source/i.test(src),
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
    const fnNames = [
      "resolveItemLineage",
      "resolveDecisionLineage",
      "resolveMappingProvenance",
      "toPreparationEntry",
    ];
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
    'latestDecision === null && reviewerStatus === "pending" && provenance.complete',
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
// F. Pure-state matrix. IMPORTANT: this is an independent JS mirror of the
// precedence/pairing/lineage/provenance/numeric rules, NOT an execution of
// the real TypeScript classifier -- this script cannot import the .ts
// module directly (its `@/lib/...` path alias only resolves through the
// Next.js build pipeline, not plain node, and adding a TS loader/dependency
// is out of scope for this PR). The mirror is kept honest against the real
// implementation only by the static source-text checks above (exact
// pairing map contents, exact guard expressions, exact constant values) --
// a mismatch between this mirror and the real module's actual behavior is
// not something running this script alone can detect.
// =========================================================================

const DECISIONS_REQUIRING_ITEM = new Set(["auto_prepared", "manager_review_required"]);
const KNOWN_REVIEWER_STATUSES = new Set([
  "pending",
  "accepted",
  "edited",
  "excluded",
  "needs_customer_check",
]);
const KNOWN_IMPORT_ACTORS = new Set(["owner_console", "tenant_admin", "tenant_manager"]);
const SOURCE_ROW_SIGNATURE_PATTERN = /^[0-9a-f]{64}$/;

const VALID_REASON_CODES_BY_DECISION = {
  auto_prepared: new Set(["AUTO_SAME_MAPPING", "AUTO_SOURCE_FAITHFUL"]),
  manager_review_required: new Set([
    "FIRST_TEMPLATE_REVIEW",
    "LOW_CONFIDENCE",
    "SOURCE_LOCATION_UNCLEAR",
    "MAPPING_CHANGED",
    "ITEM_COUNT_DELTA",
    "CONTENT_MEANING_CHANGED",
  ]),
  owner_exception_required: new Set([
    "MISSING_REQUIRED_FIELD",
    "MAPPING_CONFLICT",
    "SENSITIVE_DATA_SUSPECTED",
    "REPEATED_PROCESSING_FAILURE",
  ]),
};

function readStrictIntegerMirror(value) {
  if (typeof value === "number") {
    return Number.isInteger(value) ? value : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!/^-?\d+$/.test(trimmed)) return null;
    const parsed = Number(trimmed);
    return Number.isSafeInteger(parsed) ? parsed : null;
  }
  return null;
}

function pickLatestDecisionRow(decisionRows) {
  // Mirrors what the DB-side embed (order=decision_seq.desc&limit=1) is
  // contracted to already do -- this function exists only so this script
  // can prove the "highest decision_seq wins" case without a live DB.
  if (decisionRows.length === 0) return null;
  return decisionRows.reduce((max, row) => (row.decision_seq > max.decision_seq ? row : max));
}

function resolveMappingProvenanceMirror({ mappingVersion, sheetIndex, sourceRowNumber, sourceRowSignature, importActor }) {
  const allNull =
    mappingVersion === null &&
    sheetIndex === null &&
    sourceRowNumber === null &&
    sourceRowSignature === null &&
    importActor === null;

  if (allNull) {
    return { ok: true, complete: false };
  }

  const parsedMappingVersion = readStrictIntegerMirror(mappingVersion);
  const parsedSheetIndex = readStrictIntegerMirror(sheetIndex);
  const parsedSourceRowNumber = readStrictIntegerMirror(sourceRowNumber);
  const signatureValid = typeof sourceRowSignature === "string" && SOURCE_ROW_SIGNATURE_PATTERN.test(sourceRowSignature);
  const importActorValid = typeof importActor === "string" && KNOWN_IMPORT_ACTORS.has(importActor);

  if (
    parsedMappingVersion === null || parsedMappingVersion < 1 ||
    parsedSheetIndex === null || parsedSheetIndex < 0 || parsedSheetIndex > 19 ||
    parsedSourceRowNumber === null || parsedSourceRowNumber < 1 ||
    !signatureValid ||
    !importActorValid
  ) {
    return { ok: false };
  }

  return { ok: true, complete: true, mappingVersion: parsedMappingVersion, sheetIndex: parsedSheetIndex };
}

/** Full-fidelity provenance defaults for cases that only care about a
 * different dimension of the contract -- a valid, complete mapped
 * provenance unless a test case explicitly overrides one field. */
const COMPLETE_PROVENANCE = {
  mappingVersion: 3,
  sheetIndex: 1,
  sourceRowNumber: 7,
  sourceRowSignature: "a".repeat(64),
  importActor: "tenant_manager",
};
const ALL_NULL_PROVENANCE = {
  mappingVersion: null,
  sheetIndex: null,
  sourceRowNumber: null,
  sourceRowSignature: null,
  importActor: null,
};

function classifyMirror({ itemRows, decisionRows, reviewerStatus, taskName, hazard, provenance, confirmedMappingVersion }) {
  if (!KNOWN_REVIEWER_STATUSES.has(reviewerStatus)) {
    return { kind: "invalid" };
  }

  if (itemRows.length > 1) {
    return { kind: "invalid" };
  }

  const hasItem = itemRows.length === 1;
  const itemId = hasItem ? itemRows[0].id : null;

  const provenanceResult = resolveMappingProvenanceMirror(provenance);

  if (!provenanceResult.ok) {
    return { kind: "invalid" };
  }

  const latestRow = pickLatestDecisionRow(decisionRows);

  let latestDecision = null;

  if (latestRow) {
    if (!Object.prototype.hasOwnProperty.call(VALID_REASON_CODES_BY_DECISION, latestRow.decision)) {
      return { kind: "invalid" };
    }

    if (!VALID_REASON_CODES_BY_DECISION[latestRow.decision].has(latestRow.reason_code)) {
      return { kind: "invalid" };
    }

    const decisionSeq = readStrictIntegerMirror(latestRow.decision_seq);
    if (decisionSeq === null || decisionSeq < 1) {
      return { kind: "invalid" };
    }

    const requiresItem = DECISIONS_REQUIRING_ITEM.has(latestRow.decision);
    const itemPresentOnDecision = latestRow.item_id !== null;

    if (requiresItem !== itemPresentOnDecision) {
      return { kind: "invalid" };
    }

    if (latestRow.decision === "owner_exception_required" && latestRow.item_id !== null) {
      return { kind: "invalid" };
    }

    if (requiresItem) {
      if (!hasItem || latestRow.item_id !== itemId) {
        return { kind: "invalid" };
      }
    }

    latestDecision = latestRow.decision;
  }

  let mappingMismatch = false;
  if (provenanceResult.complete) {
    mappingMismatch =
      confirmedMappingVersion === undefined || confirmedMappingVersion !== provenanceResult.mappingVersion;
  }

  const missingRequiredField = taskName.trim().length === 0 || hazard.trim().length === 0;

  let category;
  if (hasItem) {
    category = "already_prepared";
  } else if (latestDecision === "owner_exception_required") {
    category = "recorded_exception";
  } else if (latestDecision === null && reviewerStatus === "pending" && provenanceResult.complete) {
    category = "awaiting_preparation_request";
  } else {
    category = "not_applicable";
  }

  return { kind: "valid", category, mappingMismatch, missingRequiredField };
}

const pureCases = [
  // --- baseline precedence (unchanged from the original 13 cases) -------
  {
    name: "no Decision + pending + complete mapping provenance",
    input: { itemRows: [], decisionRows: [], reviewerStatus: "pending", taskName: "task", hazard: "hazard", provenance: COMPLETE_PROVENANCE, confirmedMappingVersion: 3 },
    expect: { kind: "valid", category: "awaiting_preparation_request" },
  },
  {
    name: "owner exception with no Item",
    input: { itemRows: [], decisionRows: [{ decision_seq: 1, decision: "owner_exception_required", reason_code: "MISSING_REQUIRED_FIELD", item_id: null }], reviewerStatus: "pending", taskName: "task", hazard: "hazard", provenance: COMPLETE_PROVENANCE, confirmedMappingVersion: 3 },
    expect: { kind: "valid", category: "recorded_exception" },
  },
  {
    name: "old owner exception plus Item (hasItem wins precedence)",
    input: { itemRows: [{ id: "item-1" }], decisionRows: [{ decision_seq: 1, decision: "owner_exception_required", reason_code: "MAPPING_CONFLICT", item_id: null }], reviewerStatus: "excluded", taskName: "task", hazard: "hazard", provenance: COMPLETE_PROVENANCE, confirmedMappingVersion: 3 },
    expect: { kind: "valid", category: "already_prepared" },
  },
  {
    name: "auto_prepared with matching Item id",
    input: { itemRows: [{ id: "item-1" }], decisionRows: [{ decision_seq: 2, decision: "auto_prepared", reason_code: "AUTO_SOURCE_FAITHFUL", item_id: "item-1" }], reviewerStatus: "accepted", taskName: "task", hazard: "hazard", provenance: COMPLETE_PROVENANCE, confirmedMappingVersion: 3 },
    expect: { kind: "valid", category: "already_prepared" },
  },
  {
    name: "auto_prepared without any embedded Item -> invalid",
    input: { itemRows: [], decisionRows: [{ decision_seq: 2, decision: "auto_prepared", reason_code: "AUTO_SOURCE_FAITHFUL", item_id: "item-1" }], reviewerStatus: "pending", taskName: "task", hazard: "hazard", provenance: COMPLETE_PROVENANCE, confirmedMappingVersion: 3 },
    expect: { kind: "invalid" },
  },
  {
    name: "non-pending Candidate, no decision, no item",
    input: { itemRows: [], decisionRows: [], reviewerStatus: "accepted", taskName: "task", hazard: "hazard", provenance: COMPLETE_PROVENANCE, confirmedMappingVersion: 3 },
    expect: { kind: "valid", category: "not_applicable" },
  },
  {
    name: "malformed reviewer_status",
    input: { itemRows: [], decisionRows: [], reviewerStatus: "bogus_status", taskName: "task", hazard: "hazard", provenance: COMPLETE_PROVENANCE, confirmedMappingVersion: 3 },
    expect: { kind: "invalid" },
  },
  {
    name: "unknown Decision value",
    input: { itemRows: [], decisionRows: [{ decision_seq: 1, decision: "bogus_decision", reason_code: "MISSING_REQUIRED_FIELD", item_id: null }], reviewerStatus: "pending", taskName: "task", hazard: "hazard", provenance: COMPLETE_PROVENANCE, confirmedMappingVersion: 3 },
    expect: { kind: "invalid" },
  },
  {
    name: "multiple Decisions -- highest decision_seq wins",
    input: {
      itemRows: [],
      decisionRows: [
        { decision_seq: 1, decision: "owner_exception_required", reason_code: "MISSING_REQUIRED_FIELD", item_id: null },
        { decision_seq: 5, decision: "owner_exception_required", reason_code: "MAPPING_CONFLICT", item_id: null },
        { decision_seq: 3, decision: "owner_exception_required", reason_code: "SENSITIVE_DATA_SUSPECTED", item_id: null },
      ],
      reviewerStatus: "pending",
      taskName: "task",
      hazard: "hazard",
      provenance: COMPLETE_PROVENANCE,
      confirmedMappingVersion: 3,
    },
    expect: { kind: "valid", category: "recorded_exception" },
    extra: (result, input) => pickLatestDecisionRow(input.decisionRows).decision_seq === 5,
  },
  {
    name: "missing taskName flag",
    input: { itemRows: [], decisionRows: [], reviewerStatus: "pending", taskName: "", hazard: "hazard", provenance: COMPLETE_PROVENANCE, confirmedMappingVersion: 3 },
    expect: { kind: "valid", category: "awaiting_preparation_request", missingRequiredField: true },
  },
  {
    name: "missing hazard flag",
    input: { itemRows: [], decisionRows: [], reviewerStatus: "pending", taskName: "task", hazard: "  ", provenance: COMPLETE_PROVENANCE, confirmedMappingVersion: 3 },
    expect: { kind: "valid", category: "awaiting_preparation_request", missingRequiredField: true },
  },
  {
    name: "mapping mismatch flag",
    input: { itemRows: [], decisionRows: [], reviewerStatus: "pending", taskName: "task", hazard: "hazard", provenance: COMPLETE_PROVENANCE, confirmedMappingVersion: 4 },
    expect: { kind: "valid", category: "awaiting_preparation_request", mappingMismatch: true },
  },

  // --- section 3: decision/reason pair validation ------------------------
  {
    name: "pair: auto_prepared + AUTO_SAME_MAPPING (valid pairing)",
    input: { itemRows: [{ id: "item-1" }], decisionRows: [{ decision_seq: 1, decision: "auto_prepared", reason_code: "AUTO_SAME_MAPPING", item_id: "item-1" }], reviewerStatus: "accepted", taskName: "task", hazard: "hazard", provenance: COMPLETE_PROVENANCE, confirmedMappingVersion: 3 },
    expect: { kind: "valid", category: "already_prepared" },
  },
  {
    name: "pair: manager_review_required + LOW_CONFIDENCE (valid pairing)",
    input: { itemRows: [{ id: "item-1" }], decisionRows: [{ decision_seq: 1, decision: "manager_review_required", reason_code: "LOW_CONFIDENCE", item_id: "item-1" }], reviewerStatus: "accepted", taskName: "task", hazard: "hazard", provenance: COMPLETE_PROVENANCE, confirmedMappingVersion: 3 },
    expect: { kind: "valid", category: "already_prepared" },
  },
  {
    name: "pair: owner_exception_required + SENSITIVE_DATA_SUSPECTED (valid pairing)",
    input: { itemRows: [], decisionRows: [{ decision_seq: 1, decision: "owner_exception_required", reason_code: "SENSITIVE_DATA_SUSPECTED", item_id: null }], reviewerStatus: "pending", taskName: "task", hazard: "hazard", provenance: COMPLETE_PROVENANCE, confirmedMappingVersion: 3 },
    expect: { kind: "valid", category: "recorded_exception" },
  },
  {
    name: "pair: auto_prepared + MISSING_REQUIRED_FIELD -> invalid (explicit required case)",
    input: { itemRows: [{ id: "item-1" }], decisionRows: [{ decision_seq: 1, decision: "auto_prepared", reason_code: "MISSING_REQUIRED_FIELD", item_id: "item-1" }], reviewerStatus: "pending", taskName: "task", hazard: "hazard", provenance: COMPLETE_PROVENANCE, confirmedMappingVersion: 3 },
    expect: { kind: "invalid" },
  },
  {
    name: "pair: owner_exception_required + AUTO_SOURCE_FAITHFUL -> invalid (explicit required case)",
    input: { itemRows: [], decisionRows: [{ decision_seq: 1, decision: "owner_exception_required", reason_code: "AUTO_SOURCE_FAITHFUL", item_id: null }], reviewerStatus: "pending", taskName: "task", hazard: "hazard", provenance: COMPLETE_PROVENANCE, confirmedMappingVersion: 3 },
    expect: { kind: "invalid" },
  },
  {
    name: "pair: manager_review_required + MAPPING_CONFLICT -> invalid (explicit required case)",
    input: { itemRows: [{ id: "item-1" }], decisionRows: [{ decision_seq: 1, decision: "manager_review_required", reason_code: "MAPPING_CONFLICT", item_id: "item-1" }], reviewerStatus: "pending", taskName: "task", hazard: "hazard", provenance: COMPLETE_PROVENANCE, confirmedMappingVersion: 3 },
    expect: { kind: "invalid" },
  },

  // --- section 4: exact Item lineage --------------------------------------
  {
    name: "lineage: Decision item_id matches embedded Item id exactly",
    input: { itemRows: [{ id: "item-42" }], decisionRows: [{ decision_seq: 1, decision: "auto_prepared", reason_code: "AUTO_SOURCE_FAITHFUL", item_id: "item-42" }], reviewerStatus: "accepted", taskName: "task", hazard: "hazard", provenance: COMPLETE_PROVENANCE, confirmedMappingVersion: 3 },
    expect: { kind: "valid", category: "already_prepared" },
  },
  {
    name: "lineage: Decision points to a different Item id -> invalid",
    input: { itemRows: [{ id: "item-42" }], decisionRows: [{ decision_seq: 1, decision: "auto_prepared", reason_code: "AUTO_SOURCE_FAITHFUL", item_id: "item-99" }], reviewerStatus: "accepted", taskName: "task", hazard: "hazard", provenance: COMPLETE_PROVENANCE, confirmedMappingVersion: 3 },
    expect: { kind: "invalid" },
  },
  {
    name: "lineage: Decision requires Item but no embedded Item -> invalid",
    input: { itemRows: [], decisionRows: [{ decision_seq: 1, decision: "manager_review_required", reason_code: "LOW_CONFIDENCE", item_id: "item-1" }], reviewerStatus: "pending", taskName: "task", hazard: "hazard", provenance: COMPLETE_PROVENANCE, confirmedMappingVersion: 3 },
    expect: { kind: "invalid" },
  },
  {
    name: "lineage: owner_exception_required carrying an Item id -> invalid",
    input: { itemRows: [{ id: "item-1" }], decisionRows: [{ decision_seq: 1, decision: "owner_exception_required", reason_code: "MISSING_REQUIRED_FIELD", item_id: "item-1" }], reviewerStatus: "pending", taskName: "task", hazard: "hazard", provenance: COMPLETE_PROVENANCE, confirmedMappingVersion: 3 },
    expect: { kind: "invalid" },
  },

  // --- section 5: full mapping provenance validation ----------------------
  {
    name: "provenance: all-null manual candidate is valid, not_applicable",
    input: { itemRows: [], decisionRows: [], reviewerStatus: "pending", taskName: "task", hazard: "hazard", provenance: ALL_NULL_PROVENANCE, confirmedMappingVersion: undefined },
    expect: { kind: "valid", category: "not_applicable" },
  },
  {
    name: "provenance: complete valid mapped provenance -> awaiting_preparation_request",
    input: { itemRows: [], decisionRows: [], reviewerStatus: "pending", taskName: "task", hazard: "hazard", provenance: COMPLETE_PROVENANCE, confirmedMappingVersion: 3 },
    expect: { kind: "valid", category: "awaiting_preparation_request" },
  },
  {
    name: "provenance: mapping_version present without sheet_index -> invalid",
    input: { itemRows: [], decisionRows: [], reviewerStatus: "pending", taskName: "task", hazard: "hazard", provenance: { ...COMPLETE_PROVENANCE, sheetIndex: null }, confirmedMappingVersion: 3 },
    expect: { kind: "invalid" },
  },
  {
    name: "provenance: missing source_row_number -> invalid",
    input: { itemRows: [], decisionRows: [], reviewerStatus: "pending", taskName: "task", hazard: "hazard", provenance: { ...COMPLETE_PROVENANCE, sourceRowNumber: null }, confirmedMappingVersion: 3 },
    expect: { kind: "invalid" },
  },
  {
    name: "provenance: malformed signature (not 64 lowercase hex) -> invalid",
    input: { itemRows: [], decisionRows: [], reviewerStatus: "pending", taskName: "task", hazard: "hazard", provenance: { ...COMPLETE_PROVENANCE, sourceRowSignature: "ABCDEF" }, confirmedMappingVersion: 3 },
    expect: { kind: "invalid" },
  },
  {
    name: "provenance: unknown import_actor -> invalid",
    input: { itemRows: [], decisionRows: [], reviewerStatus: "pending", taskName: "task", hazard: "hazard", provenance: { ...COMPLETE_PROVENANCE, importActor: "bogus_actor" }, confirmedMappingVersion: 3 },
    expect: { kind: "invalid" },
  },
  {
    name: "provenance: out-of-range sheet_index (20) -> invalid",
    input: { itemRows: [], decisionRows: [], reviewerStatus: "pending", taskName: "task", hazard: "hazard", provenance: { ...COMPLETE_PROVENANCE, sheetIndex: 20 }, confirmedMappingVersion: 3 },
    expect: { kind: "invalid" },
  },
  {
    name: "provenance: mapping_version zero -> invalid",
    input: { itemRows: [], decisionRows: [], reviewerStatus: "pending", taskName: "task", hazard: "hazard", provenance: { ...COMPLETE_PROVENANCE, mappingVersion: 0 }, confirmedMappingVersion: 3 },
    expect: { kind: "invalid" },
  },

  // --- section 6: strict numeric parsing ----------------------------------
  {
    name: "numeric: mapping_version = 1.5 (decimal) -> invalid, not truncated to 1",
    input: { itemRows: [], decisionRows: [], reviewerStatus: "pending", taskName: "task", hazard: "hazard", provenance: { ...COMPLETE_PROVENANCE, mappingVersion: 1.5 }, confirmedMappingVersion: 1 },
    expect: { kind: "invalid" },
  },
  {
    name: 'numeric: mapping_version = "1.5" (decimal string) -> invalid',
    input: { itemRows: [], decisionRows: [], reviewerStatus: "pending", taskName: "task", hazard: "hazard", provenance: { ...COMPLETE_PROVENANCE, mappingVersion: "1.5" }, confirmedMappingVersion: 1 },
    expect: { kind: "invalid" },
  },
  {
    name: "numeric: sheet_index = NaN -> invalid",
    input: { itemRows: [], decisionRows: [], reviewerStatus: "pending", taskName: "task", hazard: "hazard", provenance: { ...COMPLETE_PROVENANCE, sheetIndex: NaN }, confirmedMappingVersion: 3 },
    expect: { kind: "invalid" },
  },
  {
    name: "numeric: sheet_index = Infinity -> invalid",
    input: { itemRows: [], decisionRows: [], reviewerStatus: "pending", taskName: "task", hazard: "hazard", provenance: { ...COMPLETE_PROVENANCE, sheetIndex: Infinity }, confirmedMappingVersion: 3 },
    expect: { kind: "invalid" },
  },
  {
    name: "numeric: decision_seq = 0 -> invalid",
    input: { itemRows: [], decisionRows: [{ decision_seq: 0, decision: "owner_exception_required", reason_code: "MISSING_REQUIRED_FIELD", item_id: null }], reviewerStatus: "pending", taskName: "task", hazard: "hazard", provenance: COMPLETE_PROVENANCE, confirmedMappingVersion: 3 },
    expect: { kind: "invalid" },
  },
  {
    name: "numeric: decision_seq = 1.5 (decimal) -> invalid",
    input: { itemRows: [], decisionRows: [{ decision_seq: 1.5, decision: "owner_exception_required", reason_code: "MISSING_REQUIRED_FIELD", item_id: null }], reviewerStatus: "pending", taskName: "task", hazard: "hazard", provenance: COMPLETE_PROVENANCE, confirmedMappingVersion: 3 },
    expect: { kind: "invalid" },
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
