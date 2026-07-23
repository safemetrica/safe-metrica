import crypto from "node:crypto";

const TENANT_CODE_PATTERN = /^sm-e2e-\d{8}-\d{3}$/;
const MANIFEST_ID_PATTERN = /^sm-e2e-prod-\d{8}-\d{3}$/;
const IDEMPOTENCY_NAMESPACE_PATTERN = /^sm-e2e-prod-\d{8}-\d{3}:v1$/;
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/;

const APPROVAL_SCOPES = [
  "fixture_creation",
  "authenticated_runtime",
  "public_qr_submission",
  "cleanup_writes",
];

const COUNT_FAMILIES = [
  "tenant",
  "site",
  "membership",
  "entitlement",
  "entitlement_event",
  "source",
  "item",
  "version",
  "submission",
  "manager_review",
  "storage_object",
];

const EXPECTED_MAXIMUMS = {
  tenants: 1,
  sites: 1,
  memberships: 1,
  entitlements: 1,
  entitlementEvents: 3,
  sources: 1,
  mappings: 1,
  candidates: 1,
  items: 1,
  versions: 1,
  publicConfirmations: 1,
  managerReviews: 1,
  storageObjects: 2,
};

function readRequiredText(value, label, maxLength = 500) {
  if (typeof value !== "string") {
    throw new Error(`${label}_required`);
  }

  const text = value.trim();
  if (!text || text.length > maxLength) {
    throw new Error(`${label}_invalid`);
  }

  return text;
}

function parseTimestamp(value, label) {
  const text = readRequiredText(value, label, 80);
  const timestamp = Date.parse(text);

  if (!Number.isFinite(timestamp)) {
    throw new Error(`${label}_invalid`);
  }

  return { text, timestamp };
}

function normalizeEmail(value) {
  const email = readRequiredText(value, "account_email", 320).toLowerCase();

  if (!EMAIL_PATTERN.test(email)) {
    throw new Error("account_email_invalid");
  }

  return email;
}

export function fingerprintSyntheticAccount(emailInput) {
  const email = normalizeEmail(emailInput);
  return `sha256:${crypto.createHash("sha256").update(email).digest("hex")}`;
}

export function buildSyntheticManifest({
  sequence,
  accountEmail,
  approvedBy,
  phaseApprovalReferences,
  now = new Date(),
  expiryDays = 7,
  cleanupHoursAfterExpiry = 24,
} = {}) {
  const numericSequence = Number(sequence);

  if (!Number.isInteger(numericSequence) || numericSequence < 1 || numericSequence > 999) {
    throw new Error("sequence_invalid");
  }

  if (!(now instanceof Date) || !Number.isFinite(now.valueOf())) {
    throw new Error("now_invalid");
  }

  if (!Number.isInteger(expiryDays) || expiryDays < 1 || expiryDays > 14) {
    throw new Error("expiry_days_invalid");
  }

  if (
    !Number.isInteger(cleanupHoursAfterExpiry)
    || cleanupHoursAfterExpiry < 1
    || cleanupHoursAfterExpiry > 48
  ) {
    throw new Error("cleanup_hours_invalid");
  }

  const datePart = now.toISOString().slice(0, 10).replaceAll("-", "");
  const sequencePart = String(numericSequence).padStart(3, "0");
  const identity = `${datePart}-${sequencePart}`;
  const expiresAt = new Date(now.valueOf() + expiryDays * 24 * 60 * 60 * 1000);
  const cleanupDeadline = new Date(
    expiresAt.valueOf() + cleanupHoursAfterExpiry * 60 * 60 * 1000,
  );
  const approvalReferences = Object.fromEntries(
    APPROVAL_SCOPES.map((scope) => [
      scope,
      readRequiredText(
        phaseApprovalReferences?.[scope],
        `${scope}_approval_reference`,
        200,
      ),
    ]),
  );
  if (new Set(Object.values(approvalReferences)).size !== APPROVAL_SCOPES.length) {
    throw new Error("phase_approval_references_must_be_distinct");
  }
  const approver = readRequiredText(approvedBy, "approved_by", 120);

  return {
    schemaVersion: 1,
    manifestId: `sm-e2e-prod-${identity}`,
    state: "approved_not_created",
    approvedAt: now.toISOString(),
    approvedBy: approver,
    phaseApprovals: Object.fromEntries(
      APPROVAL_SCOPES.map((scope) => [
        scope,
        {
          approvedAt: now.toISOString(),
          approvedBy: approver,
          approvalReference: approvalReferences[scope],
        },
      ]),
    ),
    runtimeTarget: "vercel_production",
    tenant: {
      code: `sm-e2e-${identity}`,
      displayName: `SafeMetrica Synthetic E2E ${identity}`,
      serviceMode: "risk_share_pack",
      defaultSiteName: `Synthetic Site ${identity}`,
    },
    account: {
      emailFingerprint: fingerprintSyntheticAccount(accountEmail),
      authMethod: "supabase_email_password",
    },
    entitlement: {
      productCode: "risk_share",
      activationSource: "internal_test",
      externalReference: `internal-test:sm-e2e-${identity}`,
      policyVersion: 1,
      expiresAt: expiresAt.toISOString(),
    },
    idempotencyNamespace: `sm-e2e-prod-${identity}:v1`,
    maximumRecords: { ...EXPECTED_MAXIMUMS },
    requiredBeforeCountFamilies: [...COUNT_FAMILIES],
    scenarioSet: [
      "signup_email_ownership",
      "company_default_site_profile",
      "owner_activation_internal_test_entitlement",
      "source_prepare_review_publish",
      "public_qr_confirmation",
      "manager_inbox_review",
      "monthly_read_export",
      "same_key_retry",
      "inactive_entitlement_observation_only",
    ],
    cleanup: {
      deadline: cleanupDeadline.toISOString(),
      terminateEntitlement: true,
      revokeMembershipAndSession: true,
      disableTenantAccess: true,
      removeAllowlistedStorageObjects: true,
      preserveAppendOnlyEvidence: true,
      reuseProhibited: true,
    },
  };
}

export function validateSyntheticManifest(manifest, {
  accountEmail,
  now = new Date(),
} = {}) {
  const errors = [];

  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    return { ok: false, errors: ["manifest_object_required"] };
  }

  if (manifest.schemaVersion !== 1) errors.push("schema_version_invalid");
  if (!MANIFEST_ID_PATTERN.test(manifest.manifestId ?? "")) {
    errors.push("manifest_id_invalid");
  }
  if (manifest.state !== "approved_not_created") errors.push("state_invalid");
  if (manifest.runtimeTarget !== "vercel_production") {
    errors.push("runtime_target_invalid");
  }
  if (!TENANT_CODE_PATTERN.test(manifest.tenant?.code ?? "")) {
    errors.push("tenant_code_invalid");
  }
  if (manifest.tenant?.serviceMode !== "risk_share_pack") {
    errors.push("service_mode_invalid");
  }
  if (!SHA256_PATTERN.test(manifest.account?.emailFingerprint ?? "")) {
    errors.push("account_fingerprint_invalid");
  }
  if (manifest.account?.authMethod !== "supabase_email_password") {
    errors.push("auth_method_invalid");
  }
  if (manifest.entitlement?.productCode !== "risk_share") {
    errors.push("product_code_invalid");
  }
  if (manifest.entitlement?.activationSource !== "internal_test") {
    errors.push("activation_source_invalid");
  }
  if (
    !String(manifest.entitlement?.externalReference ?? "").startsWith(
      `internal-test:${manifest.tenant?.code ?? ""}`,
    )
  ) {
    errors.push("external_reference_invalid");
  }
  if (manifest.entitlement?.policyVersion !== 1) {
    errors.push("policy_version_invalid");
  }
  if (!IDEMPOTENCY_NAMESPACE_PATTERN.test(manifest.idempotencyNamespace ?? "")) {
    errors.push("idempotency_namespace_invalid");
  }

  const approvalReferences = [];
  for (const scope of APPROVAL_SCOPES) {
    const approval = manifest.phaseApprovals?.[scope];
    if (
      typeof approval?.approvedAt !== "string"
      || typeof approval?.approvedBy !== "string"
      || !approval.approvedBy.trim()
      || typeof approval?.approvalReference !== "string"
      || !approval.approvalReference.trim()
    ) {
      errors.push(`${scope}_approval_invalid`);
      continue;
    }
    approvalReferences.push(approval.approvalReference.trim());
  }
  if (
    approvalReferences.length === APPROVAL_SCOPES.length
    && new Set(approvalReferences).size !== APPROVAL_SCOPES.length
  ) {
    errors.push("phase_approval_references_must_be_distinct");
  }

  const maximums = manifest.maximumRecords ?? {};
  for (const [family, maximum] of Object.entries(EXPECTED_MAXIMUMS)) {
    if (maximums[family] !== maximum) {
      errors.push(`maximum_${family}_invalid`);
    }
  }

  const beforeFamilies = Array.isArray(manifest.requiredBeforeCountFamilies)
    ? manifest.requiredBeforeCountFamilies
    : [];
  if (COUNT_FAMILIES.some((family) => !beforeFamilies.includes(family))) {
    errors.push("before_count_families_invalid");
  }

  try {
    const approvedAt = parseTimestamp(manifest.approvedAt, "approved_at");
    const expiresAt = parseTimestamp(manifest.entitlement?.expiresAt, "expires_at");
    const cleanupDeadline = parseTimestamp(
      manifest.cleanup?.deadline,
      "cleanup_deadline",
    );

    if (expiresAt.timestamp <= approvedAt.timestamp) {
      errors.push("expiry_order_invalid");
    }
    if (cleanupDeadline.timestamp <= expiresAt.timestamp) {
      errors.push("cleanup_order_invalid");
    }
    if (cleanupDeadline.timestamp - expiresAt.timestamp > 48 * 60 * 60 * 1000) {
      errors.push("cleanup_window_invalid");
    }
    if (cleanupDeadline.timestamp <= now.valueOf()) {
      errors.push("cleanup_deadline_elapsed");
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "timestamp_invalid");
  }

  if (
    manifest.cleanup?.terminateEntitlement !== true
    || manifest.cleanup?.revokeMembershipAndSession !== true
    || manifest.cleanup?.disableTenantAccess !== true
    || manifest.cleanup?.removeAllowlistedStorageObjects !== true
    || manifest.cleanup?.preserveAppendOnlyEvidence !== true
    || manifest.cleanup?.reuseProhibited !== true
  ) {
    errors.push("cleanup_contract_invalid");
  }

  if (accountEmail) {
    try {
      if (
        fingerprintSyntheticAccount(accountEmail)
        !== manifest.account?.emailFingerprint
      ) {
        errors.push("account_fingerprint_mismatch");
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "account_email_invalid");
    }
  }

  return { ok: errors.length === 0, errors };
}

function parseExactCount(response) {
  const contentRange = response.headers.get("content-range") ?? "";
  const match = contentRange.match(/\/(\d+)$/);
  return match ? Number(match[1]) : null;
}

async function exactCount({
  supabaseUrl,
  serviceRoleKey,
  label,
  table,
  filters,
}) {
  const query = new URLSearchParams({
    select: "id",
    limit: "1",
    ...filters,
  });
  const response = await fetch(
    `${supabaseUrl}/rest/v1/${table}?${query.toString()}`,
    {
      method: "GET",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Prefer: "count=exact",
        Range: "0-0",
      },
      cache: "no-store",
    },
  ).catch(() => null);

  if (!response?.ok) {
    return {
      ok: false,
      label,
      table,
      status: response?.status ?? 0,
      count: null,
    };
  }

  const count = parseExactCount(response);
  return {
    ok: Number.isInteger(count),
    label,
    table,
    status: response.status,
    count,
  };
}

export async function runReadOnlySyntheticPreflight({
  manifest,
  accountEmail,
  supabaseUrl,
  serviceRoleKey,
  now = new Date(),
} = {}) {
  const validation = validateSyntheticManifest(manifest, { accountEmail, now });
  if (!validation.ok) {
    return { ok: false, result: "HOLD", errors: validation.errors, counts: {} };
  }

  const normalizedUrl = readRequiredText(
    supabaseUrl,
    "supabase_url",
    500,
  ).replace(/\/+$/, "");
  const key = readRequiredText(serviceRoleKey, "service_role_key", 5000);
  const normalizedEmail = normalizeEmail(accountEmail);
  const tenantCode = manifest.tenant.code;

  const checks = await Promise.all([
    exactCount({
      supabaseUrl: normalizedUrl,
      serviceRoleKey: key,
      label: "tenant_registry_by_code",
      table: "tenant_registry",
      filters: { company_code: `eq.${tenantCode}` },
    }),
    exactCount({
      supabaseUrl: normalizedUrl,
      serviceRoleKey: key,
      label: "tenant_membership_by_tenant",
      table: "tenant_membership",
      filters: { tenant_code: `eq.${tenantCode}` },
    }),
    exactCount({
      supabaseUrl: normalizedUrl,
      serviceRoleKey: key,
      label: "tenant_membership_by_account",
      table: "tenant_membership",
      filters: { user_email: `eq.${normalizedEmail}` },
    }),
    exactCount({
      supabaseUrl: normalizedUrl,
      serviceRoleKey: key,
      label: "entitlement_by_tenant",
      table: "tenant_product_entitlements",
      filters: { tenant_code: `eq.${tenantCode}` },
    }),
  ]);

  const errors = [];
  const counts = {};
  for (const check of checks) {
    counts[check.label] = check.count;

    if (!check.ok) errors.push(`${check.label}_count_unavailable`);
    else if (check.count !== 0) errors.push(`${check.label}_not_absent`);
  }

  return {
    ok: errors.length === 0,
    result: errors.length === 0 ? "READ_ONLY_PREFLIGHT_PASS" : "HOLD",
    errors,
    counts,
    migrationInventoryVerified: false,
    schemaAndGrantFingerprintVerified: false,
    storageBoundaryVerified: false,
    writeAuthorized: false,
  };
}

export const syntheticTenantProductionE2eContract = Object.freeze({
  approvalScopes: [...APPROVAL_SCOPES],
  countFamilies: [...COUNT_FAMILIES],
  expectedMaximums: { ...EXPECTED_MAXIMUMS },
});
