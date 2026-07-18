import { NextRequest, NextResponse } from "next/server";

import { resolveActiveRiskSharePublicTenant } from "@/lib/risk-share/riskSharePublicTenantGuard";
import { requireTenantAccessForCurrentSession } from "@/lib/tenant-auth/tenantAccessServerGuards";
import { prepareRiskShareItemsForTenant } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAX_BODY_BYTES = 16 * 1024;
const MAX_CANDIDATE_IDS = 200;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ALLOWED_BODY_FIELDS = new Set(["sourceId", "candidateIds", "idempotencyKey"]);

/** Field names a client must never be able to set. Present in the request
 * body at all (even with a harmless-looking value) is a validation failure,
 * not something to silently strip -- the server always re-derives tenant,
 * membership, and role from the authenticated session, never from the
 * request. Redundant with ALLOWED_BODY_FIELDS (every field below is
 * already outside the allowlist) but kept explicit so a future allowlist
 * edit cannot silently reopen one of these. */
const FORBIDDEN_BODY_FIELDS = [
  "company",
  "companyCode",
  "tenantCode",
  "tenantId",
  "actorMembershipId",
  "membershipId",
  "userId",
  "email",
  "role",
  "actorRole",
  "policyVersion",
  "correlationId",
  "serviceRoleKey",
  "supabaseServiceRoleKey",
  "authorization",
  "credential",
  "workerVisible",
  "customerConfirmed",
  "shareStatus",
  "customerCheckStatus",
  "versionLockId",
] as const;

type ValidatedRequestBody = {
  sourceId: string;
  candidateIds: string[];
  idempotencyKey: string;
};

function jsonError(status: number, code: string) {
  return NextResponse.json({ ok: false, code }, { status });
}

function isCrossSiteRequest(request: NextRequest): boolean {
  const secFetchSite = request.headers.get("sec-fetch-site");

  if (secFetchSite === "cross-site") {
    return true;
  }

  const origin = request.headers.get("origin");

  if (origin && origin !== request.nextUrl.origin) {
    return true;
  }

  return false;
}

/** Returns null when the body fails any structural/shape/length/uniqueness
 * rule. Every failure collapses to the same outward validation_failed
 * result -- callers must not try to distinguish which rule failed from the
 * response. */
function validateRequestBody(raw: unknown): ValidatedRequestBody | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }

  const body = raw as Record<string, unknown>;

  for (const key of Object.keys(body)) {
    if (!ALLOWED_BODY_FIELDS.has(key)) {
      return null;
    }
  }

  for (const forbiddenField of FORBIDDEN_BODY_FIELDS) {
    if (forbiddenField in body) {
      return null;
    }
  }

  const sourceId = body.sourceId;

  if (typeof sourceId !== "string" || !UUID_PATTERN.test(sourceId)) {
    return null;
  }

  const idempotencyKeyRaw = body.idempotencyKey;

  if (typeof idempotencyKeyRaw !== "string") {
    return null;
  }

  const idempotencyKey = idempotencyKeyRaw.trim();

  if (idempotencyKey.length < 1 || idempotencyKey.length > 200) {
    return null;
  }

  const candidateIdsRaw = body.candidateIds;

  // Omission (undefined) and null are both rejected here, same as any
  // other non-array value -- bulk-all-eligible processing (the RPC's own
  // "omit candidateIds" mode) is out of scope for this API, so there is no
  // valid meaning for a missing candidateIds field.
  if (!Array.isArray(candidateIdsRaw)) {
    return null;
  }

  if (candidateIdsRaw.length < 1 || candidateIdsRaw.length > MAX_CANDIDATE_IDS) {
    return null;
  }

  const seenCandidateIds = new Set<string>();
  const candidateIds: string[] = [];

  for (const rawId of candidateIdsRaw) {
    // A non-string element (including null, which has typeof "object")
    // and a nested array element are both rejected by this single check --
    // there is no separate "reject multidimensional" branch because every
    // element that isn't a plain string already fails here.
    if (typeof rawId !== "string" || !UUID_PATTERN.test(rawId)) {
      return null;
    }

    const normalizedId = rawId.toLowerCase();

    if (seenCandidateIds.has(normalizedId)) {
      return null;
    }

    seenCandidateIds.add(normalizedId);
    candidateIds.push(rawId);
  }

  return {
    sourceId,
    candidateIds,
    idempotencyKey,
  };
}

export async function POST(request: NextRequest) {
  if (isCrossSiteRequest(request)) {
    return jsonError(403, "forbidden");
  }

  const contentLengthHeader = request.headers.get("content-length");

  if (contentLengthHeader && Number(contentLengthHeader) > MAX_BODY_BYTES) {
    return jsonError(422, "validation_failed");
  }

  let rawBodyText: string;

  try {
    rawBodyText = await request.text();
  } catch {
    return jsonError(422, "validation_failed");
  }

  if (Buffer.byteLength(rawBodyText, "utf8") > MAX_BODY_BYTES) {
    return jsonError(422, "validation_failed");
  }

  let parsedBody: unknown;

  try {
    parsedBody = JSON.parse(rawBodyText);
  } catch {
    return jsonError(422, "validation_failed");
  }

  const validatedBody = validateRequestBody(parsedBody);

  if (!validatedBody) {
    return jsonError(422, "validation_failed");
  }

  const rawCompanyCode = request.nextUrl.searchParams.get("company") ?? "";
  const tenantResolution = await resolveActiveRiskSharePublicTenant(rawCompanyCode);

  if (!tenantResolution.ok) {
    return jsonError(403, "forbidden");
  }

  const tenantCode = tenantResolution.tenant.code;

  const tenantAccessResult = await requireTenantAccessForCurrentSession({
    tenantCode,
    allowedRoles: ["tenant_admin", "tenant_manager"],
  });

  if (!tenantAccessResult.ok) {
    if (tenantAccessResult.reason === "unauthenticated") {
      return jsonError(401, "forbidden");
    }

    return jsonError(403, "forbidden");
  }

  const selectedTenantCode = tenantAccessResult.context.selectedTenantCode;
  const role = tenantAccessResult.context.role;

  // owner_internal is deliberately excluded from allowedRoles above, but
  // this defensive re-check exists so a future allowedRoles edit cannot
  // silently widen who this route accepts without also touching this line.
  if (
    selectedTenantCode !== tenantCode ||
    (role !== "tenant_admin" && role !== "tenant_manager")
  ) {
    return jsonError(403, "forbidden");
  }

  const actorMembershipId = tenantAccessResult.context.membership.membershipId;

  if (!actorMembershipId) {
    return jsonError(403, "forbidden");
  }

  const result = await prepareRiskShareItemsForTenant({
    companyCode: selectedTenantCode,
    sourceId: validatedBody.sourceId,
    actorMembershipId,
    idempotencyKey: validatedBody.idempotencyKey,
    candidateIds: validatedBody.candidateIds,
  });

  if (!result.ok) {
    switch (result.code) {
      case "forbidden":
        return jsonError(403, "forbidden");
      case "source_not_found":
        return jsonError(404, "not_found");
      case "invalid_request":
        return jsonError(422, "validation_failed");
      case "too_many_candidates":
        return jsonError(422, "too_many_candidates");
      case "request_failed":
        return jsonError(503, "request_failed");
      case "invalid_response":
      default:
        return jsonError(503, "invalid_response");
    }
  }

  const summary = {
    total: result.results.length,
    created: 0,
    replayed: 0,
    autoPrepared: 0,
    ownerExceptionRequired: 0,
    itemAlreadyExists: 0,
    idempotencyConflict: 0,
    notEligible: 0,
    invalidCandidate: 0,
  };

  for (const row of result.results) {
    switch (row.resultCode) {
      case "created":
        summary.created += 1;
        break;
      case "replayed":
        summary.replayed += 1;
        break;
      case "item_already_exists":
        summary.itemAlreadyExists += 1;
        break;
      case "idempotency_conflict":
        summary.idempotencyConflict += 1;
        break;
      case "not_eligible":
        summary.notEligible += 1;
        break;
      case "invalid_candidate":
        summary.invalidCandidate += 1;
        break;
    }

    if (row.decision === "auto_prepared") {
      summary.autoPrepared += 1;
    } else if (row.decision === "owner_exception_required") {
      summary.ownerExceptionRequired += 1;
    }
  }

  // itemId/decisionId are validated internally (see
  // prepareRiskShareItemsForTenant) but never forwarded to the client --
  // the browser only needs the classification outcome per candidate, and
  // re-reads authoritative item state through existing owner/manager read
  // routes rather than trusting a mutation response snapshot.
  return NextResponse.json(
    {
      ok: true,
      code: "ok",
      summary,
      results: result.results.map((row) => ({
        candidateId: row.candidateId,
        resultCode: row.resultCode,
        decision: row.decision,
        reasonCode: row.reasonCode,
      })),
    },
    { status: 200 },
  );
}
