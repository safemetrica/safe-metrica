import type { TenantRole } from "@/lib/tenant-auth/tenantAuthTypes";

export type RiskShareManagerTenantStatus = "active" | "onboarding";

export function canAccessRiskShareManagerTenant(
  tenantStatus: RiskShareManagerTenantStatus,
  role: TenantRole,
) {
  if (tenantStatus === "onboarding") {
    return role === "tenant_admin";
  }

  return role === "tenant_admin" || role === "tenant_manager";
}
