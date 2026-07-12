import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import {
  createOwnerTenantMembership,
  normalizeStrictOwnerCompanyCode,
} from "@/lib/tenant-onboarding/ownerTenantCommercialActions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ALLOWED_ROLES = new Set(["tenant_admin", "tenant_manager"]);
const ALLOWED_MEMBERSHIP_STATUSES = new Set(["invited", "active"]);
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function isOwnerTokenValid(ownerToken?: string) {
  const expectedToken = process.env.SAFEMETRICA_OWNER_TOKEN;
  return Boolean(expectedToken && ownerToken === expectedToken);
}

function readText(formData: FormData, key: string, max = 500) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function buildRedirect(request: NextRequest, params: Record<string, string>) {
  const url = new URL("/owner/tenant-onboarding/draft", request.url);

  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });

  return NextResponse.redirect(url);
}

export async function POST(request: NextRequest) {
  const c = await cookies();
  const ownerToken = c.get("sm_owner_token")?.value;

  if (!isOwnerTokenValid(ownerToken)) {
    return buildRedirect(request, { error: "owner_required" });
  }

  const formData = await request.formData();

  const companyCodeInput = readText(formData, "company_code", 80);
  const managerEmailInput = readText(formData, "manager_email", 320).toLowerCase();
  const displayName = readText(formData, "display_name", 120);
  const role = readText(formData, "role", 40);
  const membershipStatus = readText(formData, "membership_status", 40);
  const authAccountConfirmed = readText(formData, "auth_account_confirmed", 8) === "1";

  const companyCode = normalizeStrictOwnerCompanyCode(companyCodeInput);

  if (!companyCode) {
    return buildRedirect(request, {
      actionError: "invalid_company",
      companyCode: companyCodeInput,
    });
  }

  if (!managerEmailInput || managerEmailInput.length > 320 || !EMAIL_PATTERN.test(managerEmailInput)) {
    return buildRedirect(request, {
      actionError: "invalid_input",
      companyCode,
    });
  }

  if (!ALLOWED_ROLES.has(role)) {
    return buildRedirect(request, {
      actionError: "invalid_input",
      companyCode,
    });
  }

  if (!ALLOWED_MEMBERSHIP_STATUSES.has(membershipStatus)) {
    return buildRedirect(request, {
      actionError: "invalid_input",
      companyCode,
    });
  }

  if (membershipStatus === "active" && !authAccountConfirmed) {
    return buildRedirect(request, {
      actionError: "invalid_input",
      companyCode,
    });
  }

  const result = await createOwnerTenantMembership({
    companyCode,
    managerEmail: managerEmailInput,
    displayName,
    role: role as "tenant_admin" | "tenant_manager",
    membershipStatus: membershipStatus as "invited" | "active",
  });

  if (!result.ok) {
    return buildRedirect(request, {
      actionError: result.reason,
      companyCode,
    });
  }

  return buildRedirect(request, {
    companyCode: result.companyCode,
    membership: result.status,
  });
}
