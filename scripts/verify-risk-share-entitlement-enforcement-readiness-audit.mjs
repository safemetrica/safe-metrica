import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { RISK_SHARE_ENTITLEMENT_SHADOW_BOUNDARIES } from "../src/lib/risk-share/riskShareEntitlementShadow.ts";

const AUDIT_DOC_PATH =
  "docs/ops/SAFEMETRICA_RISK_SHARE_ENTITLEMENT_ENFORCEMENT_READINESS_AUDIT_V1.md";
const audit = readFileSync(AUDIT_DOC_PATH, "utf8");

for (const required of [
  /repository-only inspection record/,
  /authorizes nothing/,
  /must never be implemented as, or accompanied by, deletion of\s+entitlement or audit rows/,
  /does not change any Runtime access decision/,
  /does not flip a feature flag/,
  /does not touch a migration or Production schema/,
  /does not expand to actual customers/,
]) {
  assert.match(audit, required, `readiness audit omits: ${required}`);
}

/**
 * Removes // line comments and /* block comments while leaving string and
 * template literal contents untouched, so a guard name inside a comment or a
 * URL cannot be mistaken for a real reference. No parser dependency: this is
 * a single linear scan, not an AST.
 */
function stripComments(source) {
  let out = "";
  let i = 0;
  const n = source.length;
  while (i < n) {
    const two = source.slice(i, i + 2);
    if (two === "//") {
      while (i < n && source[i] !== "\n") i++;
      continue;
    }
    if (two === "/*") {
      i += 2;
      while (i < n && source.slice(i, i + 2) !== "*/") i++;
      i += 2;
      continue;
    }
    const ch = source[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      const quote = ch;
      out += ch;
      i++;
      while (i < n && source[i] !== quote) {
        if (source[i] === "\\") {
          out += source[i] + (source[i + 1] ?? "");
          i += 2;
          continue;
        }
        out += source[i];
        i++;
      }
      if (i < n) {
        out += source[i];
        i++;
      }
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

function isActuallyCalled(strippedSource, symbol) {
  return new RegExp(`\\b${symbol}\\s*\\(`).test(strippedSource);
}

function listSourceFilesRecursive(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listSourceFilesRecursive(full));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function parseInventoryTable(markdown) {
  const startIdx = markdown.indexOf("## Runtime boundary inventory");
  assert.ok(startIdx >= 0, "readiness audit missing 'Runtime boundary inventory' section");
  const rest = markdown.slice(startIdx);
  const endIdx = rest.indexOf("\n## ", 1);
  const section = endIdx >= 0 ? rest.slice(0, endIdx) : rest;

  const rows = section
    .split("\n")
    .filter((line) => line.trim().startsWith("|"))
    .filter((line) => !/^\|\s*-{2,}\s*\|/.test(line))
    .filter((line) => !/^\|\s*Boundary id\s*\|/.test(line));

  return rows.map((line) => {
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    assert.equal(cells.length, 5, `malformed inventory row (expected 5 columns): ${line}`);
    const [boundaryCell, kindCell, fileCell, guardCell, connectedCell] = cells;
    return {
      boundaryId: boundaryCell.replace(/^`|`$/g, ""),
      kind: kindCell,
      runtimeFile: fileCell.replace(/^`|`$/g, ""),
      guardSymbols: [...guardCell.matchAll(/`([^`]+)`/g)].map((m) => m[1]),
      connected: connectedCell,
    };
  });
}

// Ground truth for each boundary. runtimeFile/guardSymbols/connected are
// documentation-level facts that cannot be derived from the shadow boundary
// source; kind is read from that source directly so it cannot drift.
const boundaryKindById = new Map(
  RISK_SHARE_ENTITLEMENT_SHADOW_BOUNDARIES.map(({ id, kind }) => [id, kind]),
);

const boundaryDetails = {
  "saas.manager.page": {
    runtimeFile: "src/app/risk-share/manager/page.tsx",
    guardSymbols: ["requireTenantManagerAccessForCurrentSession", "canAccessRiskShareManagerTenant"],
    connected: "Shadow-only, `test-risk-pack-01` gate, non-blocking",
  },
  "saas.monthly.page": {
    runtimeFile: "src/app/risk-share/monthly/page.tsx",
    guardSymbols: ["requireTenantManagerAccessForCurrentSession", "resolveActiveRiskSharePublicTenant"],
    connected: "No",
  },
  "saas.publish.mutation": {
    runtimeFile: "src/app/api/risk-share/manager/publish/route.ts",
    guardSymbols: ["requireTenantAccessForCurrentSession", "resolveActiveRiskSharePublicTenant"],
    connected: "No",
  },
  "saas.preparation.mutation": {
    runtimeFile: "src/app/api/risk-share/manager/preparation/route.ts",
    guardSymbols: ["requireTenantAccessForCurrentSession", "resolveActiveRiskSharePublicTenant"],
    connected: "No",
  },
  "saas.share_review.mutation": {
    runtimeFile: "src/app/api/risk-share/manager/share-review/route.ts",
    guardSymbols: ["requireTenantAccessForCurrentSession", "resolveActiveRiskSharePublicTenant"],
    connected: "No",
  },
  "public.participation.submit": {
    runtimeFile: "src/app/api/risk-share/participation/submit/route.ts",
    guardSymbols: ["resolveActiveRiskSharePublicTenant", "resolveActiveRiskSharePublicVersion"],
    connected: "No",
  },
  "public.anonymous.submit": {
    runtimeFile: "src/app/api/risk-share/anonymous/submit/route.ts",
    guardSymbols: ["resolveActiveRiskSharePublicTenant", "consumeRiskSharePublicRateLimit"],
    connected: "No",
  },
  "public.visitor.submit": {
    runtimeFile: "src/app/api/risk-share/visitor/submit/route.ts",
    guardSymbols: ["resolveActiveRiskSharePublicTenant", "consumeRiskSharePublicRateLimit"],
    connected: "No",
  },
  "public.representative.submit": {
    runtimeFile: "src/app/api/risk-share/representative/submit/route.ts",
    guardSymbols: ["resolveActiveRiskSharePublicTenant", "consumeRiskSharePublicRateLimit"],
    connected: "No",
  },
  "legacy.manager.page": {
    runtimeFile: "src/app/manager/risk-share/page.tsx",
    guardSymbols: ["getCompanyConfig", "getCompanyConfigByCode"],
    connected: "No",
  },
  "legacy.field_participation.submit": {
    runtimeFile: "src/app/api/field/participation/submit/route.ts",
    guardSymbols: ["getCompanyConfig", "getCompanyConfigByCode"],
    connected: "No",
  },
};

assert.deepEqual(
  Object.keys(boundaryDetails).sort(),
  RISK_SHARE_ENTITLEMENT_SHADOW_BOUNDARIES.map(({ id }) => id).sort(),
  "readiness audit boundary map must cover exactly the shadow boundary inventory",
);

const ALLOWED_SHADOW_IMPORT_PATH = boundaryDetails["saas.manager.page"].runtimeFile;
const READER_MODULE = "riskShareEntitlementAccess";
const SHADOW_MODULE = "riskShareEntitlementRuntimeShadow";
const READER_IMPORT_PATTERN = new RegExp(`from\\s+["'][^"']*${READER_MODULE}["']`);
const SHADOW_IMPORT_PATTERN = new RegExp(`from\\s+["'][^"']*${SHADOW_MODULE}["']`);

// 1) Exact inventory-row verification: every documented row must match the
// ground truth on all 5 columns, with no duplicate, missing, or extra rows.
const parsedRows = parseInventoryTable(audit);

const parsedIds = parsedRows.map((row) => row.boundaryId);
assert.equal(
  new Set(parsedIds).size,
  parsedIds.length,
  "readiness audit inventory table has a duplicate boundary row",
);
assert.deepEqual(
  [...parsedIds].sort(),
  Object.keys(boundaryDetails).sort(),
  "readiness audit inventory table rows do not exactly match the shadow boundary source of truth",
);

for (const row of parsedRows) {
  const expected = boundaryDetails[row.boundaryId];
  const expectedKind = boundaryKindById.get(row.boundaryId);
  assert.equal(row.kind, expectedKind, `${row.boundaryId}: table 'Kind' column does not match the shadow boundary source`);
  assert.equal(row.runtimeFile, expected.runtimeFile, `${row.boundaryId}: table 'Runtime file' column mismatch`);
  assert.deepEqual(
    [...row.guardSymbols].sort(),
    [...expected.guardSymbols].sort(),
    `${row.boundaryId}: table 'Legacy decision guard' column mismatch`,
  );
  assert.equal(row.connected, expected.connected, `${row.boundaryId}: table 'Entitlement connected?' column mismatch`);
}

// 2) Guard invocation verification: each documented guard must appear as an
// actual function call in its Runtime file, not merely imported or
// mentioned in a comment.
for (const [boundaryId, detail] of Object.entries(boundaryDetails)) {
  const stripped = stripComments(readFileSync(detail.runtimeFile, "utf8"));
  for (const guardSymbol of detail.guardSymbols) {
    assert.ok(
      isActuallyCalled(stripped, guardSymbol),
      `${boundaryId}: ${detail.runtimeFile} does not call its legacy guard ${guardSymbol}() (import-only or a comment does not count)`,
    );
  }
}

// 3) Runtime import-spread verification: walk every src/app source file.
// The entitlement reader must never be imported there; the Runtime shadow
// helper must be imported by exactly the one approved file. This catches
// drift into a new route that the inventory table above does not even know
// about yet. Scanning only src/app (never src/lib) means the shadow
// helper's own legitimate import of the reader is out of scope by
// construction, not by exemption.
const appFiles = listSourceFilesRecursive("src/app");
const readerImportingFiles = [];
const shadowImportingFiles = [];

for (const file of appFiles) {
  const stripped = stripComments(readFileSync(file, "utf8"));
  if (READER_IMPORT_PATTERN.test(stripped)) readerImportingFiles.push(file);
  if (SHADOW_IMPORT_PATTERN.test(stripped)) shadowImportingFiles.push(file);
}

assert.deepEqual(
  readerImportingFiles,
  [],
  `entitlement reader must never be imported under src/app; found: ${readerImportingFiles.join(", ") || "none"}`,
);
assert.deepEqual(
  shadowImportingFiles,
  [ALLOWED_SHADOW_IMPORT_PATH],
  `Runtime shadow import must be limited to ${ALLOWED_SHADOW_IMPORT_PATH}; found: ${shadowImportingFiles.join(", ") || "none"}`,
);

// Rollback contract: the one Runtime call site must sit after both legacy
// guard branches resolve, and its result must never be read or branched on.
const managerPage = readFileSync(ALLOWED_SHADOW_IMPORT_PATH, "utf8");
const tenantAccessGateIndex = managerPage.indexOf("if (!tenantAccessResult.ok)");
const roleGateIndex = managerPage.indexOf("if (!canAccessRiskShareManagerTenant(");
const shadowCallIndex = managerPage.indexOf("observeInternalTestRiskShareEntitlementShadow({");

assert.ok(tenantAccessGateIndex >= 0, "session guard branch not found");
assert.ok(roleGateIndex >= 0, "role guard branch not found");
assert.ok(shadowCallIndex >= 0, "shadow observation call site not found");
assert.ok(
  shadowCallIndex > tenantAccessGateIndex && shadowCallIndex > roleGateIndex,
  "shadow observation must run after both legacy guard branches resolve",
);
assert.equal(
  managerPage.includes("= await observeInternalTestRiskShareEntitlementShadow"),
  false,
  "shadow observation result must not be assigned to a variable",
);
assert.equal(
  managerPage.includes("if (await observeInternalTestRiskShareEntitlementShadow"),
  false,
  "shadow observation must not gate a conditional",
);

const shadowHelper = readFileSync(
  "src/lib/risk-share/riskShareEntitlementRuntimeShadow.ts",
  "utf8",
);
assert.match(
  shadowHelper,
  /export async function observeInternalTestRiskShareEntitlementShadow\([^)]*\):\s*Promise<void>/,
  "shadow observer must return Promise<void> so deleting the call site cannot change control flow",
);
assert.equal(shadowHelper.includes("catch {"), true, "shadow observer must swallow lookup failure");
assert.equal(shadowHelper.includes("return input"), false);
assert.equal(shadowHelper.includes("throw "), false, "shadow observer must never throw to its caller");

// package.json wiring.
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
assert.equal(
  packageJson.scripts["verify:risk-share-entitlement-enforcement-readiness-audit"],
  "node scripts/verify-risk-share-entitlement-enforcement-readiness-audit.mjs",
);

console.log("PASS risk share entitlement enforcement readiness audit");
