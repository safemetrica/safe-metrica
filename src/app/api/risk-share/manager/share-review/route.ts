import { NextRequest, NextResponse } from "next/server";

import { resolveRiskShareCanonicalSiteScopeForTenant } from "@/lib/risk-share/riskShareCanonicalSiteScopeServer";
import { resolveActiveRiskSharePublicTenant } from "@/lib/risk-share/riskSharePublicTenantGuard";
import { requireTenantAccessForCurrentSession } from "@/lib/tenant-auth/tenantAccessServerGuards";
import {
  reviewRiskShareItemForTenant,
  type ReviewRiskShareItemAction,
  type ReviewRiskShareItemCode,
} from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAX_BODY_BYTES = 16 * 1024;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACTIONS = new Set<ReviewRiskShareItemAction>(["include", "edit_include", "exclude"]);

/** Field names a client must never be able to set. Present in the request
 * body at all (even with a harmless-looking value) is a validation failure,
 * not something to silently strip -- the server always re-derives these
 * from the session/RPC, never from the request. */
const FORBIDDEN_BODY_FIELDS = [
  "membershipId",
  "tenantId",
  "companyCode",
  "role",
  "actorRole",
  "customerConfirmed",
  "shareStatus",
  "customerCheckStatus",
  "versionLockId",
] as const;

const ALLOWED_BODY_FIELDS = new Set([
  "itemId",
  "expectedRevision",
  "action",
  "idempotencyKey",
  "workerVisible",
  "taskName",
  "hazard",
  "currentControls",
  "improvementPlan",
  "riskLevel",
  "workerShareSummary",
]);

const TEXT_FIELD_LIMITS = {
  taskName: 200,
  hazard: 500,
  currentControls: 800,
  improvementPlan: 800,
  riskLevel: 40,
  workerShareSummary: 800,
} as const;

type ValidatedRequestBody = {
  itemId: string;
  expectedRevision: number;
  action: ReviewRiskShareItemAction;
  idempotencyKey: string;
  workerVisible: boolean | null;
  taskName: string | null;
  hazard: string | null;
  currentControls: string | null;
  improvementPlan: string | null;
  riskLevel: string | null;
  workerShareSummary: string | null;
};

function jsonError(status: number, code: string) {
  return NextResponse.json({ ok: false, code, replayed: false }, { status });
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

/** Distinct from `undefined`/`null` (both of which mean "no value, field is
 * optional and absent -- valid") so a present-but-malformed field can be
 * told apart from a field the caller simply didn't send. */
const INVALID_TEXT_FIELD = Symbol("invalid-text-field");

function readOptionalNullableText(
  value: unknown,
  field: keyof typeof TEXT_FIELD_LIMITS,
): string | null | typeof INVALID_TEXT_FIELD {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return INVALID_TEXT_FIELD;
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return null;
  }

  if (trimmed.length > TEXT_FIELD_LIMITS[field]) {
    return INVALID_TEXT_FIELD;
  }

  return trimmed;
}

/** Returns null when the body fails any structural/shape/length rule. Every
 * failure collapses to the same outward validation_failed result -- callers
 * must not try to distinguish which rule failed from the response. */
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

  const itemId = body.itemId;

  if (typeof itemId !== "string" || !UUID_PATTERN.test(itemId)) {
    return null;
  }

  const expectedRevision = body.expectedRevision;

  if (
    typeof expectedRevision !== "number" ||
    !Number.isFinite(expectedRevision) ||
    !Number.isInteger(expectedRevision) ||
    expectedRevision < 1
  ) {
    return null;
  }

  const action = body.action;

  if (typeof action !== "string" || !ACTIONS.has(action as ReviewRiskShareItemAction)) {
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

  let workerVisible: boolean | null = null;

  if (body.workerVisible !== undefined) {
    if (typeof body.workerVisible !== "boolean") {
      return null;
    }

    workerVisible = body.workerVisible;
  }

  const taskName = readOptionalNullableText(body.taskName, "taskName");
  const hazard = readOptionalNullableText(body.hazard, "hazard");
  const currentControls = readOptionalNullableText(body.currentControls, "currentControls");
  const improvementPlan = readOptionalNullableText(body.improvementPlan, "improvementPlan");
  const riskLevel = readOptionalNullableText(body.riskLevel, "riskLevel");
  const workerShareSummary = readOptionalNullableText(body.workerShareSummary, "workerShareSummary");

  if (
    taskName === INVALID_TEXT_FIELD ||
    hazard === INVALID_TEXT_FIELD ||
    currentControls === INVALID_TEXT_FIELD ||
    improvementPlan === INVALID_TEXT_FIELD ||
    riskLevel === INVALID_TEXT_FIELD ||
    workerShareSummary === INVALID_TEXT_FIELD
  ) {
    return null;
  }

  return {
    itemId,
    expectedRevision,
    action: action as ReviewRiskShareItemAction,
    idempotencyKey,
    workerVisible,
    taskName,
    hazard,
    currentControls,
    improvementPlan,
    riskLevel,
    workerShareSummary,
  };
}

const RESULT_CODE_STATUS: Record<ReviewRiskShareItemCode, number> = {
  ok: 200,
  invalid_action: 422,
  validation_failed: 422,
  forbidden: 403,
  not_found: 404,
  target_scope_mismatch: 404,
  locked: 409,
  idempotency_conflict: 409,
  stale_revision: 409,
  request_failed: 503,
  invalid_response: 503,
};

export async function POST(request: NextRequest) {
  if (isCrossSiteRequest(request)) {
    return jsonError(403, "forbidden");
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

  const actorMembershipId = tenantAccessResult.context.membership.membershipId;

  if (!actorMembershipId) {
    return jsonError(403, "forbidden");
  }

  const siteScope = await resolveRiskShareCanonicalSiteScopeForTenant(
    selectedTenantCode,
    tenantResolution.tenant.defaultSiteId,
  ).catch(() => ({ ok: false as const }));

  if (!siteScope.ok) {
    return jsonError(403, "site_scope_unavailable");
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

  const result = await reviewRiskShareItemForTenant({
    itemId: validatedBody.itemId,
    companyCode: selectedTenantCode,
    siteId: siteScope.siteId,
    actorMembershipId,
    expectedRevision: validatedBody.expectedRevision,
    action: validatedBody.action,
    idempotencyKey: validatedBody.idempotencyKey,
    taskName: validatedBody.taskName,
    hazard: validatedBody.hazard,
    currentControls: validatedBody.currentControls,
    improvementPlan: validatedBody.improvementPlan,
    riskLevel: validatedBody.riskLevel,
    workerShareSummary: validatedBody.workerShareSummary,
    workerVisible: validatedBody.workerVisible,
  });

  const status = RESULT_CODE_STATUS[result.code] ?? 503;
  const responseCode =
    result.code === "target_scope_mismatch" ? "not_found" : result.code;

  // The browser only ever needs to know whether the mutation succeeded and
  // whether it was a replay -- it re-reads the authoritative item state via
  // router.refresh() rather than trusting a mutation response snapshot. The
  // RPC's item/reviewEventId/versionLockId are validated server-side (see
  // reviewRiskShareItemForTenant / toSafeReviewedRiskShareItem) but never
  // forwarded to the client.
  return NextResponse.json(
    { ok: result.ok, code: responseCode, replayed: result.replayed },
    { status },
  );
}
