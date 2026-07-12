import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import {
  activateOwnerTenant,
  normalizeStrictOwnerCompanyCode,
} from "@/lib/tenant-onboarding/ownerTenantCommercialActions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
  const companyCode = normalizeStrictOwnerCompanyCode(companyCodeInput);

  if (!companyCode) {
    return buildRedirect(request, {
      actionError: "invalid_company",
      companyCode: companyCodeInput,
    });
  }

  const result = await activateOwnerTenant({ companyCode });

  if (!result.ok) {
    return buildRedirect(request, {
      actionError: result.reason,
      companyCode,
    });
  }

  return buildRedirect(request, {
    companyCode: result.companyCode,
    activation: result.status,
  });
}
