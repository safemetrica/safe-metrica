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
  /** tenant_membership.id -- the membership row's own primary key. Re-derived
   * from the DB on every request; never sourced from client input, a URL, or
   * a persisted session token. */
  membershipId: string;
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
