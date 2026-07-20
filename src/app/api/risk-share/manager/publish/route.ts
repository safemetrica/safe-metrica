import { NextRequest, NextResponse } from "next/server";

import { resolveActiveRiskSharePublicTenant } from "@/lib/risk-share/riskSharePublicTenantGuard";
import {
  publishRiskShareVersionForTenantChecked,
  type PublishRiskShareVersionCode,
} from "@/lib/risk-share/riskShareTenantPublish";
import { requireTenantAccessForCurrentSession } from "@/lib/tenant-auth/tenantAccessServerGuards";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAX_BODY_BYTES = 16 * 1024;
const MAX_ITEM_IDS = 200;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LOCK_MONTH_PATTERN = /^[0-9]{4}-(0[1-9]|1[0-2])$/;
const CONTROL_CHARACTER_PATTERN = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;

const ALLOWED_BODY_FIELDS = new Set([
  "lockMonth",
  "lockTitle",
  "notes",
  "itemIds",
  "expectedReviewRevisions",
  "idempotencyKey",
]);

/** These values are always derived by the authenticated server/RPC boundary.
 * Their presence is rejected rather than silently ignored so a client bug or
 * tampering attempt cannot be mistaken for a valid publish request. */
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
  "serviceRoleKey",
  "supabaseServiceRoleKey",
  "authorization",
  "credential",
  "workerVisible",
  "customerConfirmed",
  "customerCheckStatus",
  "shareStatus",
  "versionLockId",
  "lockedBy",
  "publishAction",
  "previousVersionId",
  "contentSourceVersionId",
  "supersededAt",
  "itemCount",
  "workerVisibleCount",
] as const;

type ValidatedRequestBody = {
  lockMonth: string;
  lockTitle: string;
  notes: string | null;
  itemIds: string[];
  expectedReviewRevisions: string[];
  idempotencyKey: string;
};

function jsonError(status: number, code: PublishRiskShareVersionCode) {
  return NextResponse.json(
    { ok: false, code, replayed: false },
    { status },
  );
}

function isCrossSiteRequest(request: NextRequest): boolean {
  const secFetchSite = request.headers.get("sec-fetch-site");

  if (secFetchSite === "cross-site") {
    return true;
  }

  const origin = request.headers.get("origin");

  return Boolean(origin && origin !== request.nextUrl.origin);
}

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

  const lockMonthRaw = body.lockMonth;

  if (typeof lockMonthRaw !== "string") {
    return null;
  }

  const lockMonth = lockMonthRaw.trim();

  if (!LOCK_MONTH_PATTERN.test(lockMonth)) {
    return null;
  }

  const lockTitleRaw = body.lockTitle;

  if (typeof lockTitleRaw !== "string") {
    return null;
  }

  const lockTitle = lockTitleRaw.trim();

  if (
    lockTitle.length < 1 ||
    lockTitle.length > 160 ||
    CONTROL_CHARACTER_PATTERN.test(lockTitle)
  ) {
    return null;
  }

  let notes: string | null = null;

  if (body.notes !== undefined && body.notes !== null) {
    if (typeof body.notes !== "string") {
      return null;
    }

    const normalizedNotes = body.notes.trim();

    if (
      normalizedNotes.length > 500 ||
      CONTROL_CHARACTER_PATTERN.test(normalizedNotes)
    ) {
      return null;
    }

    notes = normalizedNotes || null;
  }

  const idempotencyKeyRaw = body.idempotencyKey;

  if (typeof idempotencyKeyRaw !== "string") {
    return null;
  }

  const idempotencyKey = idempotencyKeyRaw.trim();

  if (idempotencyKey.length < 1 || idempotencyKey.length > 200) {
    return null;
  }

  const itemIdsRaw = body.itemIds;

  if (!Array.isArray(itemIdsRaw)) {
    return null;
  }

  if (itemIdsRaw.length < 1 || itemIdsRaw.length > MAX_ITEM_IDS) {
    return null;
  }

  const expectedReviewRevisionsRaw = body.expectedReviewRevisions;

  if (
    !Array.isArray(expectedReviewRevisionsRaw) ||
    expectedReviewRevisionsRaw.length !== itemIdsRaw.length
  ) {
    return null;
  }

  const seenItemIds = new Set<string>();
  const itemIds: string[] = [];
  const expectedReviewRevisions: string[] = [];

  for (const rawItemId of itemIdsRaw) {
    if (typeof rawItemId !== "string" || !UUID_PATTERN.test(rawItemId)) {
      return null;
    }

    const normalizedItemId = rawItemId.toLowerCase();

    if (seenItemIds.has(normalizedItemId)) {
      return null;
    }

    const rawRevision = expectedReviewRevisionsRaw[itemIds.length];

    if (
      typeof rawRevision !== "string" ||
      !/^[1-9][0-9]*$/.test(rawRevision) ||
      BigInt(rawRevision) > BigInt("9223372036854775807")
    ) {
      return null;
    }

    seenItemIds.add(normalizedItemId);
    itemIds.push(normalizedItemId);
    expectedReviewRevisions.push(rawRevision);
  }

  return {
    lockMonth,
    lockTitle,
    notes,
    itemIds,
    expectedReviewRevisions,
    idempotencyKey,
  };
}

const RESULT_CODE_STATUS: Record<PublishRiskShareVersionCode, number> = {
  ok: 200,
  validation_failed: 422,
  forbidden: 403,
  selection_mismatch: 409,
  active_month_exists: 409,
  idempotency_conflict: 409,
  request_failed: 503,
  invalid_response: 503,
};

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

  if (
    selectedTenantCode !== tenantCode ||
    (role !== "tenant_admin" && role !== "tenant_manager")
  ) {
    return jsonError(403, "forbidden");
  }

  const actorMembershipId =
    tenantAccessResult.context.membership.membershipId;

  if (!actorMembershipId) {
    return jsonError(403, "forbidden");
  }

  const result = await publishRiskShareVersionForTenantChecked({
    companyCode: selectedTenantCode,
    actorMembershipId,
    lockMonth: validatedBody.lockMonth,
    lockTitle: validatedBody.lockTitle,
    notes: validatedBody.notes,
    itemIds: validatedBody.itemIds,
    expectedReviewRevisions: validatedBody.expectedReviewRevisions,
    idempotencyKey: validatedBody.idempotencyKey,
  });

  const status = RESULT_CODE_STATUS[result.code] ?? 503;

  if (!result.ok) {
    return jsonError(status, result.code);
  }

  // versionLockId is intentionally omitted. The browser refreshes and reads
  // authoritative Version state instead of trusting a mutation snapshot.
  return NextResponse.json(
    {
      ok: true,
      code: "ok",
      replayed: result.replayed,
      itemCount: result.itemCount,
      workerVisibleCount: result.workerVisibleCount,
    },
    { status: 200 },
  );
}
