const TENANT_CODE_SAFE_CHARACTERS = /[^a-z0-9-]/g;

export const LEGACY_CUSTOMER_CODES = [
  "daedo",
  "dongwoo",
  "hankookgreen",
  "bubblemon",
] as const;

export const OWNER_TENANT_SERVICE_MODES = [
  "risk_share_pack",
  "full_safemetrica",
  "food_factory_e_confirmation_trial",
  "hoist_work_order_trial",
  "partner_demo",
  "internal_test",
] as const;

export const OWNER_TENANT_MEMBERSHIP_ROLES = [
  "owner_internal",
  "tenant_admin",
  "tenant_manager",
  "tenant_representative",
  "tenant_viewer",
] as const;

export const OWNER_TENANT_MEMBERSHIP_STATUSES = [
  "invited",
  "active",
  "suspended",
  "revoked",
] as const;

const FORBIDDEN_RAW_PAYLOAD_KEY_PATTERNS = [
  /token/i,
  /api[_-]?key/i,
  /service[_-]?role/i,
  /secret/i,
  /password/i,
  /owner[_-]?token/i,
  /env/i,
  /signature/i,
  /resident/i,
  /rrn/i,
  /personal[_-]?id/i,
  /confirmation[_-]?number/i,
];

export type OwnerTenantServiceMode =
  (typeof OWNER_TENANT_SERVICE_MODES)[number];

export type OwnerTenantMembershipRole =
  (typeof OWNER_TENANT_MEMBERSHIP_ROLES)[number];

export type OwnerTenantMembershipStatus =
  (typeof OWNER_TENANT_MEMBERSHIP_STATUSES)[number];

export type OwnerTenantOnboardingValidationInput = {
  companyCode?: string | null;
  displayName?: string | null;
  serviceMode?: string | null;
  enabledModules?: unknown;
  managerEmail?: string | null;
  role?: string | null;
  status?: string | null;
  rawPayload?: unknown;
};

export type OwnerTenantOnboardingValidationResult = {
  ok: boolean;
  normalized: {
    companyCode: string;
    displayName: string;
    serviceMode: OwnerTenantServiceMode | "";
    enabledModules: string[];
    managerEmail: string;
    role: OwnerTenantMembershipRole | "";
    status: OwnerTenantMembershipStatus | "";
    rawPayload: Record<string, unknown>;
  };
  errors: string[];
};

function isAllowedValue<T extends readonly string[]>(
  value: string,
  allowedValues: T,
): value is T[number] {
  return (allowedValues as readonly string[]).includes(value);
}

export function normalizeOwnerTenantCompanyCode(value?: string | null) {
  const normalized = (value ?? "")
    .trim()
    .toLowerCase()
    .replace(TENANT_CODE_SAFE_CHARACTERS, "")
    .slice(0, 64);

  return /^[a-z0-9][a-z0-9-]{0,63}$/.test(normalized) ? normalized : "";
}

export function isLegacyCustomerCode(value: string) {
  return (LEGACY_CUSTOMER_CODES as readonly string[]).includes(value);
}

export function normalizeOwnerTenantEmail(value?: string | null) {
  return (value ?? "").trim().toLowerCase().slice(0, 320);
}

export function normalizeOwnerTenantDisplayName(value?: string | null) {
  return (value ?? "").trim().slice(0, 120);
}

export function normalizeOwnerTenantEnabledModules(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((moduleKey) =>
      typeof moduleKey === "string"
        ? moduleKey.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 80)
        : "",
    )
    .filter(Boolean);
}

export function normalizeOwnerTenantRawPayload(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

export function findForbiddenRawPayloadKeys(
  value: Record<string, unknown>,
  prefix = "",
): string[] {
  const forbiddenKeys: string[] = [];

  for (const [key, nestedValue] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;

    if (FORBIDDEN_RAW_PAYLOAD_KEY_PATTERNS.some((pattern) => pattern.test(key))) {
      forbiddenKeys.push(path);
    }

    if (nestedValue && typeof nestedValue === "object" && !Array.isArray(nestedValue)) {
      forbiddenKeys.push(
        ...findForbiddenRawPayloadKeys(nestedValue as Record<string, unknown>, path),
      );
    }
  }

  return forbiddenKeys;
}

export function validateOwnerTenantOnboardingDraft(
  input: OwnerTenantOnboardingValidationInput,
): OwnerTenantOnboardingValidationResult {
  const errors: string[] = [];

  const companyCode = normalizeOwnerTenantCompanyCode(input.companyCode);
  const displayName = normalizeOwnerTenantDisplayName(input.displayName);
  const serviceModeValue = (input.serviceMode ?? "").trim().toLowerCase();
  const managerEmail = normalizeOwnerTenantEmail(input.managerEmail);
  const roleValue = (input.role ?? "").trim().toLowerCase();
  const statusValue = (input.status ?? "").trim().toLowerCase();
  const enabledModules = normalizeOwnerTenantEnabledModules(input.enabledModules);
  const rawPayload = normalizeOwnerTenantRawPayload(input.rawPayload);

  const serviceMode = isAllowedValue(
    serviceModeValue,
    OWNER_TENANT_SERVICE_MODES,
  )
    ? serviceModeValue
    : "";

  const role = isAllowedValue(roleValue, OWNER_TENANT_MEMBERSHIP_ROLES)
    ? roleValue
    : "";

  const status = isAllowedValue(statusValue, OWNER_TENANT_MEMBERSHIP_STATUSES)
    ? statusValue
    : "";

  if (!companyCode) {
    errors.push("company_code_required");
  }

  if (companyCode && isLegacyCustomerCode(companyCode)) {
    errors.push("legacy_customer_code_not_allowed");
  }

  if (!displayName) {
    errors.push("display_name_required");
  }

  if (!serviceMode) {
    errors.push("service_mode_invalid");
  }

  if (!enabledModules.length) {
    errors.push("enabled_modules_required");
  }

  if (managerEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(managerEmail)) {
    errors.push("manager_email_invalid");
  }

  if (roleValue && !role) {
    errors.push("membership_role_invalid");
  }

  if (statusValue && !status) {
    errors.push("membership_status_invalid");
  }

  const forbiddenRawPayloadKeys = findForbiddenRawPayloadKeys(rawPayload);

  if (forbiddenRawPayloadKeys.length) {
    errors.push("raw_payload_forbidden_keys");
  }

  return {
    ok: errors.length === 0,
    normalized: {
      companyCode,
      displayName,
      serviceMode,
      enabledModules,
      managerEmail,
      role,
      status,
      rawPayload,
    },
    errors,
  };
}

export function getOwnerTenantOnboardingValidationMessage(errorCode: string) {
  switch (errorCode) {
    case "company_code_required":
      return "고객사 코드를 입력해야 합니다.";
    case "legacy_customer_code_not_allowed":
      return "기존 운영 고객 코드는 신규 고객사 개설 흐름으로 사용할 수 없습니다.";
    case "display_name_required":
      return "고객사 표시명을 입력해야 합니다.";
    case "service_mode_invalid":
      return "서비스 모드를 허용된 값으로 선택해야 합니다.";
    case "enabled_modules_required":
      return "사용 모듈을 1개 이상 선택해야 합니다.";
    case "manager_email_invalid":
      return "관리자 이메일 형식을 확인해야 합니다.";
    case "membership_role_invalid":
      return "사용자 역할을 허용된 값으로 선택해야 합니다.";
    case "membership_status_invalid":
      return "멤버십 상태를 허용된 값으로 선택해야 합니다.";
    case "raw_payload_forbidden_keys":
      return "민감정보 또는 내부 인증값으로 보이는 항목은 저장 후보에서 제외해야 합니다.";
    default:
      return "입력값을 다시 확인해야 합니다.";
  }
}

export function getOwnerTenantOnboardingValidationMessages(errorCodes: string[]) {
  return errorCodes.map(getOwnerTenantOnboardingValidationMessage);
}
