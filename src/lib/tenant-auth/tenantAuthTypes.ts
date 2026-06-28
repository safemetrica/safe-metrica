export type TenantRole =
  | "owner_internal"
  | "tenant_admin"
  | "tenant_manager"
  | "tenant_representative"
  | "tenant_viewer";

export type TenantAuthTenantCode =
  | "richi"
  | "hyundai-hoist"
  | "future"
  | "unknown";

export type TenantMembership = {
  userId: string | null;
  userEmail: string;
  tenantId: string;
  tenantCode: string;
  role: TenantRole;
  displayName?: string | null;
};

export type TenantAuthContext = {
  userId: string | null;
  userEmail: string;
  selectedTenantId: string;
  selectedTenantCode: string;
  role: TenantRole;
  membership: TenantMembership;
};

export type TenantAccessDeniedReason =
  | "unauthenticated"
  | "tenant_not_found"
  | "membership_required"
  | "forbidden";

export type TenantAccessResult =
  | { ok: true; context: TenantAuthContext }
  | {
      ok: false;
      reason: TenantAccessDeniedReason;
    };
