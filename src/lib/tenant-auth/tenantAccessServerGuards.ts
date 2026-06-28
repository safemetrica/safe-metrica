import "server-only";

import {
  getActiveTenantMembershipByEmailAndCode,
  type TenantMembershipConfig,
} from "@/lib/supabaseServer";

import {
  canAccessTenantManager,
  normalizeTenantLoginCode,
} from "./tenantAuthGuards";

import type {
  TenantAccessResult,
  TenantAuthContext,
  TenantRole,
} from "./tenantAuthTypes";

type RequireTenantAccessByEmailAndCodeParams = {
  userEmail?: string | null;
  tenantCode?: string | null;
  allowedRoles?: TenantRole[];
};

function normalizeTenantSessionEmail(value?: string | null) {
  return value?.trim().toLowerCase().slice(0, 320) ?? "";
}

function toTenantAuthContext(
  membership: TenantMembershipConfig,
): TenantAuthContext {
  return {
    userId: membership.userId,
    userEmail: membership.userEmail,
    selectedTenantId: membership.tenantId,
    selectedTenantCode: membership.tenantCode,
    role: membership.role,
    membership: {
      userId: membership.userId,
      userEmail: membership.userEmail,
      tenantId: membership.tenantId,
      tenantCode: membership.tenantCode,
      role: membership.role,
      displayName: membership.displayName,
    },
  };
}

export async function requireTenantAccessByEmailAndCode(
  params: RequireTenantAccessByEmailAndCodeParams,
): Promise<TenantAccessResult> {
  const userEmail = normalizeTenantSessionEmail(params.userEmail);
  const tenantCode = normalizeTenantLoginCode(params.tenantCode);

  if (!userEmail) {
    return { ok: false, reason: "unauthenticated" };
  }

  if (!params.tenantCode || tenantCode === "unknown") {
    return { ok: false, reason: "tenant_not_found" };
  }

  const membership = await getActiveTenantMembershipByEmailAndCode({
    userEmail,
    tenantCode,
  }).catch(() => null);

  if (!membership) {
    return { ok: false, reason: "membership_required" };
  }

  if (
    params.allowedRoles?.length &&
    !params.allowedRoles.includes(membership.role)
  ) {
    return { ok: false, reason: "forbidden" };
  }

  return {
    ok: true,
    context: toTenantAuthContext(membership),
  };
}

export async function requireTenantManagerAccessByEmailAndCode(params: {
  userEmail?: string | null;
  tenantCode?: string | null;
}): Promise<TenantAccessResult> {
  const accessResult = await requireTenantAccessByEmailAndCode(params);

  if (!accessResult.ok) {
    return accessResult;
  }

  if (!canAccessTenantManager(accessResult.context.role)) {
    return { ok: false, reason: "forbidden" };
  }

  return accessResult;
}
