import { createHash } from "node:crypto";

const RISK_SHARE_PRODUCT_CODE = "risk_share" as const;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TENANT_CODE_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const ACTIVATION_SOURCES = new Set([
  "owner_console",
  "contract",
  "payment_webhook",
  "partner",
  "complimentary",
  "internal_test",
]);

export type RiskShareBackfillManifestEntry = {
  tenantId: string;
  tenantCode: string;
  productCode: typeof RISK_SHARE_PRODUCT_CODE;
  status: "active";
  activationSource: string;
  effectiveAt: string;
  expiresAt: string | null;
  policyVersion: number;
  actorType: "owner_console";
  idempotencyKey: string;
  requestDigest: string;
  externalReference: string | null;
  approvalEvidenceReference: string;
};

export type RiskShareBackfillValidation =
  | { ok: true; entry: RiskShareBackfillManifestEntry }
  | { ok: false; errors: readonly string[] };

function canonicalTimestamp(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

export function canonicalRiskShareBackfillRequest(
  entry: Omit<RiskShareBackfillManifestEntry, "requestDigest">,
): string {
  return JSON.stringify({
    tenant_id: entry.tenantId,
    tenant_code: entry.tenantCode,
    product_code: entry.productCode,
    status: entry.status,
    activation_source: entry.activationSource,
    effective_at: entry.effectiveAt,
    expires_at: entry.expiresAt,
    policy_version: entry.policyVersion,
    actor_type: entry.actorType,
    idempotency_key: entry.idempotencyKey,
    external_reference: entry.externalReference,
    approval_evidence_reference: entry.approvalEvidenceReference,
  });
}

export function digestRiskShareBackfillRequest(
  entry: Omit<RiskShareBackfillManifestEntry, "requestDigest">,
): string {
  return createHash("sha256")
    .update(canonicalRiskShareBackfillRequest(entry), "utf8")
    .digest("hex");
}

export function validateRiskShareBackfillManifestEntry(
  value: unknown,
): RiskShareBackfillValidation {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, errors: ["entry_invalid"] };
  }

  const input = value as Record<string, unknown>;
  const effectiveAt = canonicalTimestamp(input.effectiveAt);
  const expiresAt = input.expiresAt === null ? null : canonicalTimestamp(input.expiresAt);
  const errors: string[] = [];

  if (typeof input.tenantId !== "string" || !UUID_PATTERN.test(input.tenantId)) errors.push("tenant_id_invalid");
  if (typeof input.tenantCode !== "string" || !TENANT_CODE_PATTERN.test(input.tenantCode)) errors.push("tenant_code_invalid");
  if (input.productCode !== RISK_SHARE_PRODUCT_CODE) errors.push("product_code_invalid");
  if (input.status !== "active") errors.push("status_not_approved_active");
  if (typeof input.activationSource !== "string" || !ACTIVATION_SOURCES.has(input.activationSource)) errors.push("activation_source_invalid");
  if (!effectiveAt) errors.push("effective_at_invalid");
  if (input.expiresAt !== null && !expiresAt) errors.push("expires_at_invalid");
  if (effectiveAt && expiresAt && Date.parse(expiresAt) <= Date.parse(effectiveAt)) errors.push("time_order_invalid");
  if (!Number.isInteger(input.policyVersion) || (input.policyVersion as number) < 1) errors.push("policy_version_invalid");
  if (input.actorType !== "owner_console") errors.push("actor_type_invalid");
  if (typeof input.idempotencyKey !== "string" || input.idempotencyKey.trim().length < 1 || input.idempotencyKey.trim().length > 200) errors.push("idempotency_key_invalid");
  if (typeof input.externalReference !== "string" && input.externalReference !== null) errors.push("external_reference_invalid");
  if (typeof input.externalReference === "string" && (input.externalReference.trim().length < 1 || input.externalReference.trim().length > 200)) errors.push("external_reference_invalid");
  if (
    input.activationSource === "internal_test" &&
    (!expiresAt ||
      typeof input.externalReference !== "string" ||
      !input.externalReference.trim().startsWith("internal-test:"))
  ) errors.push("internal_test_boundary_invalid");
  if (typeof input.approvalEvidenceReference !== "string" || !input.approvalEvidenceReference.trim()) errors.push("approval_evidence_required");
  if (typeof input.requestDigest !== "string" || !SHA256_PATTERN.test(input.requestDigest)) errors.push("request_digest_invalid");

  if (errors.length) return { ok: false, errors };

  const entry: RiskShareBackfillManifestEntry = {
    tenantId: input.tenantId as string,
    tenantCode: input.tenantCode as string,
    productCode: RISK_SHARE_PRODUCT_CODE,
    status: "active",
    activationSource: input.activationSource as string,
    effectiveAt: effectiveAt as string,
    expiresAt,
    policyVersion: input.policyVersion as number,
    actorType: "owner_console",
    idempotencyKey: (input.idempotencyKey as string).trim(),
    requestDigest: input.requestDigest as string,
    externalReference:
      typeof input.externalReference === "string" ? input.externalReference.trim() : null,
    approvalEvidenceReference: (input.approvalEvidenceReference as string).trim(),
  };

  if (digestRiskShareBackfillRequest(entry) !== entry.requestDigest) {
    return { ok: false, errors: ["request_digest_mismatch"] };
  }

  return { ok: true, entry };
}

export function summarizeRiskShareBackfillManifest(values: readonly unknown[]) {
  const results = values.map(validateRiskShareBackfillManifestEntry);
  const errorCounts: Record<string, number> = {};
  for (const result of results) {
    if (result.ok) continue;
    for (const error of result.errors) errorCounts[error] = (errorCounts[error] ?? 0) + 1;
  }
  return {
    inputCount: values.length,
    eligibleCount: results.filter((result) => result.ok).length,
    invalidCount: results.filter((result) => !result.ok).length,
    errorCounts,
  };
}
