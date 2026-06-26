import type {
  TenantAccessDeniedReason,
  TenantAccessResult,
  TenantRole,
} from "./tenantAuthTypes";

const TENANT_CODE_SAFE_CHARACTERS = /[^a-z0-9-]/g;

export function normalizeTenantLoginCode(value?: string | null): string {
  return (value ?? "unknown")
    .trim()
    .toLowerCase()
    .replace(TENANT_CODE_SAFE_CHARACTERS, "")
    .slice(0, 64) || "unknown";
}

export function isOwnerInternalRole(role: TenantRole): boolean {
  return role === "owner_internal";
}

export function isTenantManagerRole(role: TenantRole): boolean {
  return role === "tenant_admin" || role === "tenant_manager";
}

export function canAccessTenantManager(role: TenantRole): boolean {
  return isOwnerInternalRole(role) || isTenantManagerRole(role);
}

export function createTenantAccessDeniedMessage(
  reason: TenantAccessDeniedReason,
): string {
  switch (reason) {
    case "unauthenticated":
      return "테넌트 로그인 확인 전에는 접근할 수 없습니다.";
    case "tenant_not_found":
      return "요청한 테넌트 공간을 확인할 수 없습니다.";
    case "membership_required":
      return "해당 테넌트 멤버십 확인이 필요합니다.";
    case "forbidden":
      return "이 테넌트 화면에 접근할 권한이 없습니다.";
  }
}

export async function requireTenantAccessPlaceholder(): Promise<TenantAccessResult> {
  return { ok: false, reason: "unauthenticated" };
}
