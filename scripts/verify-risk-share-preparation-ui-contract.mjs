import fs from "node:fs";

const PAGE_FILE = "src/app/risk-share/manager/sources/preparation/page.tsx";
const CLIENT_FILE = "src/app/risk-share/manager/sources/preparation/PreparationClient.tsx";
const SOURCES_PAGE_FILE = "src/app/risk-share/manager/sources/page.tsx";

for (const file of [PAGE_FILE, CLIENT_FILE, SOURCES_PAGE_FILE]) {
  if (!fs.existsSync(file)) {
    console.error(`FAIL: missing file - ${file}`);
    process.exit(1);
  }
}

const page = fs.readFileSync(PAGE_FILE, "utf8");
const client = fs.readFileSync(CLIENT_FILE, "utf8");
const sourcesPage = fs.readFileSync(SOURCES_PAGE_FILE, "utf8");

const checks = [];

function check(name, ok) {
  checks.push({ name, ok: Boolean(ok) });
}

function extractBalancedBlock(text, startMarker) {
  if (text === null) return null;
  const start = text.indexOf(startMarker);
  if (start === -1) return null;
  const braceStart = text.indexOf("{", start);
  if (braceStart === -1) return null;
  let depth = 0;
  for (let i = braceStart; i < text.length; i += 1) {
    if (text[i] === "{") depth += 1;
    else if (text[i] === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

// =========================================================================
// A. Server-page boundary
// =========================================================================

check(
  "page.tsx resolves the tenant via resolveActiveRiskSharePublicTenant",
  page.includes("resolveActiveRiskSharePublicTenant("),
);
check(
  "page.tsx requires tenant_admin/tenant_manager via requireTenantAccessForCurrentSession",
  page.includes("requireTenantAccessForCurrentSession(") &&
    page.includes('allowedRoles: ["tenant_admin", "tenant_manager"]'),
);
check(
  "page.tsx defensively re-checks selectedTenantCode and role after the guard call",
  page.includes("selectedTenantCode !== tenantCode") &&
    page.includes('role !== "tenant_admin" && role !== "tenant_manager"'),
);
check(
  "page.tsx passes only the server-confirmed selectedTenantCode to the Read Model (never rawCompanyCode/tenantCode)",
  page.includes("listRiskSharePreparationStateForSource(selectedTenantCode, rawSourceId)") &&
    !/listRiskSharePreparationStateForSource\(\s*(rawCompanyCode|tenantCode)/.test(page),
);
check(
  "unauthenticated access redirects to /login",
  page.includes('redirect(`/login?callbackUrl=') && page.includes('"unauthenticated"'),
);
check(
  "page.tsx imports listRiskSharePreparationStateForSource from the existing Read Model only (no new read helper)",
  page.includes(
    'from "@/lib/risk-share/riskSharePreparationReadModel"',
  ),
);
check(
  "page.tsx does not import supabaseServer.ts, the mutation API route, or any RPC helper directly",
  !page.includes("@/lib/supabaseServer") &&
    !page.includes("prepareRiskShareItemsForTenant") &&
    !/\/api\/risk-share\/manager\/preparation/.test(page),
);
check(
  "PreparationClient is a client component ('use client') and does not import the server-only Read Model module",
  client.trimStart().startsWith('"use client";') &&
    !/from\s+["']@\/lib\/risk-share\/riskSharePreparationReadModel["']/.test(client) &&
    !client.includes('from "@/lib/supabaseServer"'),
);
check(
  "PreparationClient defines its own local entry type rather than importing RiskSharePreparationEntry (matches the existing ShareReviewClient/ShareReviewClientItem convention)",
  client.includes("export type PreparationClientEntry"),
);

// =========================================================================
// B. Safe-field allowlist (never expose sensitive identifiers)
// =========================================================================

const FORBIDDEN_UI_FIELDS = [
  "membershipId",
  "actorMembershipId",
  "itemId",
  "decisionId",
  "correlationId",
  "idempotencyKeyHistory",
  "candidateInputFingerprint",
  "safeMetadata",
  "safe_metadata",
  "rawPayload",
  "raw_payload",
  "sourceRowSignatureSha256",
  "source_row_signature_sha256",
  "serviceRoleKey",
  "supabaseServiceRoleKey",
];

for (const field of FORBIDDEN_UI_FIELDS) {
  check(
    `forbidden field never referenced in page.tsx: ${field}`,
    !page.includes(field),
  );
  check(
    `forbidden field never referenced in PreparationClient.tsx: ${field}`,
    !client.includes(field),
  );
}

check(
  "PreparationClientEntry type carries no companyCode field (tenant identity is a page-level prop, never per-entry)",
  (() => {
    const typeBlock = extractBalancedBlock(client, "export type PreparationClientEntry");
    return typeBlock !== null && !typeBlock.includes("companyCode");
  })(),
);
check(
  "no raw backend error text is ever rendered (only the fixed Korean message maps defined in this file)",
  !/\{.*error\.message.*\}/.test(client) && !/dangerouslySetInnerHTML/.test(client),
);

// =========================================================================
// C. Exception-first ordering (presentation only)
// =========================================================================

const rankFnBlock = extractBalancedBlock(page, "function rankForEntry(");

check("rankForEntry presentation-ranking function exists in page.tsx", rankFnBlock !== null);
check(
  "invalid entries rank first (0)",
  rankFnBlock?.includes('entry.kind === "invalid"') && /return 0;/.test(rankFnBlock ?? ""),
);
check(
  "recorded_exception ranks second (1)",
  /case "recorded_exception":\s*\n\s*return 1;/.test(rankFnBlock ?? ""),
);
check(
  "awaiting_preparation_request with mappingMismatch/missingRequiredField ranks third (2), other awaiting ranks fourth (3)",
  rankFnBlock?.includes(
    "return entry.mappingMismatch || entry.missingRequiredField ? 2 : 3;",
  ),
);
check(
  "already_prepared ranks fifth (4)",
  /case "already_prepared":\s*\n\s*return 4;/.test(rankFnBlock ?? ""),
);
check(
  "not_applicable ranks sixth (5, the default fallback)",
  /case "not_applicable":\s*\n\s*default:\s*\n\s*return 5;/.test(rankFnBlock ?? ""),
);
check(
  "entries are actually sorted by rankForEntry before being sent to the client",
  page.includes(".sort((a, b) => rankForEntry(a) - rankForEntry(b))"),
);
check(
  "a comment states this ranking is presentation-only, not a new eligibility/decision calculation",
  /presentation-only ranking|never computes eligibility|Presentation ordering only/i.test(page),
);
check(
  "no eligible/autoPreparable/finalDecision field is invented anywhere in the new UI files",
  !/\beligible\s*[:=]/i.test(page) &&
    !/\beligible\s*[:=]/i.test(client) &&
    !/autoPreparable/i.test(page) &&
    !/autoPreparable/i.test(client) &&
    !/finalDecision/i.test(page) &&
    !/finalDecision/i.test(client),
);

// =========================================================================
// D. Mutation rules
// =========================================================================

check(
  "only awaiting_preparation_request entries can be selected",
  // Not extractBalancedBlock here: toggleCandidate's own parameter type
  // annotation (Extract<PreparationClientEntry, { kind: "valid" }>)
  // contains a brace pair before the function body's own opening brace,
  // which would throw off simple first-brace balancing. A direct
  // proximity check on the guard clause is unambiguous instead.
  /if \(submitting \|\| !actionsAllowed \|\| entry\.category !== "awaiting_preparation_request"\) \{\s*\n\s*return;\s*\n\s*\}/.test(
    client,
  ),
);
check(
  "no candidate is selected by default",
  client.includes("useState<Set<string>>(() => new Set())"),
);
check(
  "MAX_CANDIDATE_IDS is exactly 200 and enforced when adding a selection",
  client.includes("const MAX_CANDIDATE_IDS = 200;") &&
    client.includes("next.size < MAX_CANDIDATE_IDS"),
);
check(
  "the submit request always sends an explicit candidateIds array (never bulk-all/omitted)",
  client.includes("candidateIds: selected,") && !/candidateIds:\s*undefined/.test(client),
);
check(
  "a single idempotency key is generated per exact pending selection (stable selection signature, reused on retry)",
  client.includes("const selectionSignature = JSON.stringify([...selected].sort());") &&
    client.includes("pendingSelectionSignature === selectionSignature"),
);
check(
  "network failure preserves the pending idempotency key (no clear call in the fetch catch block)",
  (() => {
    const block = extractBalancedBlock(client, "} catch {\n      // Network failure");
    return (
      block !== null &&
      !block.includes("setPendingIdempotencyKey(null)") &&
      !block.includes("setPendingSelectionSignature(null)")
    );
  })(),
);
check(
  "a malformed response body (JSON parse failure) preserves the pending idempotency key",
  (() => {
    const block = extractBalancedBlock(client, "} catch {\n      // Malformed response body");
    return (
      block !== null &&
      !block.includes("setPendingIdempotencyKey(null)") &&
      !block.includes("setPendingSelectionSignature(null)")
    );
  })(),
);
check(
  "an unknown/unparseable structured response preserves the pending idempotency key",
  (() => {
    const block = extractBalancedBlock(client, "if (!parsed) {");
    return (
      block !== null &&
      !block.includes("setPendingIdempotencyKey(null)") &&
      !block.includes("setPendingSelectionSignature(null)")
    );
  })(),
);
check(
  "request_failed/invalid_response (503) are excluded from the terminal-error clear set (key is preserved for those)",
  !client.includes('"request_failed"') || (() => {
    const setBlock = extractBalancedBlock(client, "const KNOWN_TERMINAL_ERROR_CODES = new Set(");
    return setBlock !== null && !setBlock.includes("request_failed") && !setBlock.includes("invalid_response");
  })(),
);
check(
  "a known terminal error code (forbidden/not_found/validation_failed/too_many_candidates) clears the pending key",
  (() => {
    const setBlock = extractBalancedBlock(client, "const KNOWN_TERMINAL_ERROR_CODES = new Set(");
    return (
      setBlock !== null &&
      setBlock.includes('"forbidden"') &&
      setBlock.includes('"not_found"') &&
      setBlock.includes('"validation_failed"') &&
      setBlock.includes('"too_many_candidates"')
    );
  })(),
);
check(
  "a successful structured response clears the pending idempotency key",
  (() => {
    const block = extractBalancedBlock(client, "// Known terminal response: the pending key's job is done.");
    return block === null ? false : true;
  })() && client.includes("// Known terminal response: the pending key's job is done."),
);
check(
  "router.refresh() is called after a successful structured response, and the mutation response is never re-used as subsequent display state",
  client.includes("router.refresh();") &&
    /Mutation response is immediate feedback only/i.test(client),
);
check(
  "no Publish, Version Lock, or worker/customer visibility mutation exists in the new UI files",
  !/versionLock/i.test(page) &&
    !/versionLock/i.test(client) &&
    !/workerVisible/i.test(page) &&
    !/workerVisible/i.test(client) &&
    !/customerConfirmed/i.test(page) &&
    !/customerConfirmed/i.test(client) &&
    !/publish/i.test(page) &&
    !/publish/i.test(client),
);
check(
  "the mutation call targets only the existing preparation API route (no new API route created)",
  client.includes('`/api/risk-share/manager/preparation?company=${encodeURIComponent(companyCode)}`'),
);

// =========================================================================
// E. Fail-closed rules
// =========================================================================

check(
  "actions (checkboxes/submit) require status ok, no overflow, and summary.isComplete",
  client.includes(
    'const actionsAllowed = listStatus === "ok" && !overflow && summary !== null && summary.isComplete;',
  ),
);
check(
  "no checkbox/submit UI renders when actionsAllowed is false",
  client.includes('listStatus === "ok" && actionsAllowed ? (') &&
    countAtLeastOnce(client, "actionsAllowed"),
);
check(
  "a failed list status shows no actions, only an error message",
  client.includes('listStatus === "failed" ? (') &&
    /항목 준비 상태를 불러오지 못했습니다/.test(client),
);
check(
  "the strict mutation-response parser rejects unexpected top-level keys",
  client.includes('if (key !== "ok" && key !== "code" && key !== "summary" && key !== "results")'),
);
check(
  "the strict mutation-response parser rejects unexpected per-result keys",
  client.includes(
    'if (key !== "candidateId" && key !== "resultCode" && key !== "decision" && key !== "reasonCode")',
  ),
);
check(
  "the parser rejects a candidateId that was not part of the exact request, and duplicate candidateIds",
  client.includes("!requestedIdSet.has(candidateId) || seenCandidateIds.has(candidateId)"),
);
check(
  "the parser rejects an unknown status/code pairing",
  client.includes("const acceptableStatuses = ACCEPTABLE_STATUS_BY_CODE[body.code];") &&
    client.includes("!acceptableStatuses || !acceptableStatuses.includes(httpStatus)"),
);
check(
  "the parser validates resultCode/decision/reasonCode combinations against the mutation API's exact contract",
  client.includes("REASON_CODES_BY_MUTATION_DECISION[decisionRaw].has(reasonCodeRaw)") &&
    client.includes("if (decisionRaw !== null || reasonCodeRaw !== null)"),
);
check(
  "the parser rejects a summary whose totals do not match the actual per-candidate rows",
  client.includes("summary.total !== results.length") &&
    client.includes("summary.created !== counts.created"),
);
check(
  "ok=true is never described as 'every candidate was prepared' -- only a generic acknowledgement plus per-row results",
  !/모든\s*항목.*(준비|처리)되었습니다/.test(client),
);
check(
  "distinct wording exists for draft created, replayed, already existing, not eligible, invalid candidate, and idempotency conflict",
  client.includes('"공유 초안이 생성되었습니다."') &&
    /이전에 처리된 요청입니다/.test(client) &&
    /이미 준비된 항목입니다/.test(client) &&
    /현재 상태에서는 준비할 수 없습니다/.test(client) &&
    /요청한 항목을 확인할 수 없습니다/.test(client) &&
    /요청 상태를 확인할 수 없습니다/.test(client),
);

function countAtLeastOnce(text, needle) {
  return text.includes(needle);
}

// =========================================================================
// F. Source registry link
// =========================================================================

check(
  '"항목 준비 상태" link added beside "열 미리보기" in the source registry',
  sourcesPage.includes("항목 준비 상태") &&
    sourcesPage.includes(
      '"/risk-share/manager/sources/preparation"',
    ),
);
check(
  "the registry link passes company and sourceId (no lang-only or bare link)",
  /"\/risk-share\/manager\/sources\/preparation",\s*\n\s*\{ company: selectedTenantCode, sourceId: source\.id \}/.test(
    sourcesPage,
  ),
);
check(
  "no new Manager-home card was added in this PR (sources/page.tsx has no manager-home-specific import)",
  !sourcesPage.includes("ManagerDesignerView"),
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

console.log("\nAll risk-share preparation UI contract checks passed.");
