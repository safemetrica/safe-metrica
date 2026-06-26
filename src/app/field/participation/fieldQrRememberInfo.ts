import type { FieldQrMode, FieldQrWorkerIdentity } from "./fieldQrCoreTypes";
import { normalizeFieldQrTenantCode } from "./fieldQrTenantConfig";

const FIELD_QR_REMEMBER_INFO_KEY_SUFFIX = "worker-confirmation-info:v1";
const FIELD_QR_IDENTITY_KEY_SUFFIX = "identity:v1";

function truncateText(value: string | undefined, maxLength: number): string {
  return (value ?? "").trim().slice(0, maxLength);
}

function getFieldQrRememberInfoTenantKey(tenantCode: string): string {
  const normalizedTenantCode = normalizeFieldQrTenantCode(tenantCode);

  if (normalizedTenantCode !== "unknown") {
    return normalizedTenantCode;
  }

  return (
    tenantCode
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-") || "unknown"
  );
}

export function getFieldQrRememberInfoStorageKey(tenantCode: string): string {
  return `safemetrica:${getFieldQrRememberInfoTenantKey(
    tenantCode,
  )}:${FIELD_QR_REMEMBER_INFO_KEY_SUFFIX}`;
}

export function getFieldQrIdentityStorageKey(
  tenantCode: string,
  mode: FieldQrMode,
): string {
  return `safemetrica:field-qr:${getFieldQrRememberInfoTenantKey(
    tenantCode,
  )}:${mode}:${FIELD_QR_IDENTITY_KEY_SUFFIX}`;
}

export function sanitizeFieldQrWorkerIdentity(
  input: Partial<FieldQrWorkerIdentity>,
): FieldQrWorkerIdentity {
  return {
    workerName: truncateText(input.workerName, 60),
    workerTeam: truncateText(input.workerTeam, 80),
    workerPhoneLast4: truncateText(
      input.workerPhoneLast4?.replace(/\D/g, ""),
      4,
    ),
    workerEmployeeNo: truncateText(input.workerEmployeeNo, 40),
  };
}

export function readFieldQrRememberedIdentity(
  tenantCode: string,
  mode?: FieldQrMode,
): FieldQrWorkerIdentity | null {
  if (typeof window === "undefined") {
    return null;
  }

  const storageKey = mode
    ? getFieldQrIdentityStorageKey(tenantCode, mode)
    : getFieldQrRememberInfoStorageKey(tenantCode);
  let rawValue: string | null;

  try {
    rawValue = window.localStorage.getItem(storageKey);
  } catch {
    return null;
  }

  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as Partial<FieldQrWorkerIdentity>;

    return sanitizeFieldQrWorkerIdentity(parsedValue);
  } catch {
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // Ignore storage cleanup failures so corrupted data never blocks the QR flow.
    }

    return null;
  }
}

export function writeFieldQrRememberedIdentity(
  tenantCode: string,
  identity: FieldQrWorkerIdentity,
  mode?: FieldQrMode,
): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      mode
        ? getFieldQrIdentityStorageKey(tenantCode, mode)
        : getFieldQrRememberInfoStorageKey(tenantCode),
      JSON.stringify(sanitizeFieldQrWorkerIdentity(identity)),
    );
  } catch {
    // Remember-info is optional; storage failures should not affect participation.
  }
}

export function clearFieldQrRememberedIdentity(
  tenantCode: string,
  mode?: FieldQrMode,
): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(
      mode
        ? getFieldQrIdentityStorageKey(tenantCode, mode)
        : getFieldQrRememberInfoStorageKey(tenantCode),
    );
  } catch {
    // Remember-info cleanup is best-effort.
  }
}
