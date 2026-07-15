import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  createOwnerTenantSite,
  setOwnerTenantDefaultSite,
  setOwnerTenantSiteStatus,
  updateOwnerTenantSiteProfile,
} from "@/lib/tenant-onboarding/ownerTenantSiteActions";

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

function readTristate(formData: FormData, key: string): "unset" | "true" | "false" {
  const value = formData.get(key);
  return value === "true" || value === "false" ? value : "unset";
}

function readList(formData: FormData, key: string, maxItems = 20) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return [];
  }

  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, maxItems);
}

const FORBIDDEN_FREE_TEXT_PATTERN =
  /(token|api[_ -]?key|service[_ -]?role|secret|password|owner[_ -]?token|env|토큰|인증키|비밀번호|패스워드|주민번호|주민등록번호|계좌번호|카드번호)/i;

function hasForbiddenFreeText(...values: string[]) {
  return values.some((value) => FORBIDDEN_FREE_TEXT_PATTERN.test(value));
}

function buildRedirect(request: NextRequest, params: Record<string, string>) {
  const url = new URL("/owner/tenant-onboarding/draft", request.url);

  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });

  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(request: NextRequest) {
  const c = await cookies();
  const ownerToken = c.get("sm_owner_token")?.value;

  if (!isOwnerTokenValid(ownerToken)) {
    return buildRedirect(request, { siteActionError: "owner_required" });
  }

  const formData = await request.formData();
  const action = readText(formData, "action", 40);
  const companyCode = readText(formData, "company_code", 80);

  if (!companyCode) {
    return buildRedirect(request, { companyCode, siteActionError: "invalid_company" });
  }

  if (action === "create") {
    const siteName = readText(formData, "site_name", 160);
    const industryProfile = readText(formData, "industry_profile", 80);
    const workerCountBand = readText(formData, "worker_count_band", 40);
    const majorProcesses = readList(formData, "major_processes");
    const majorEquipment = readList(formData, "major_equipment");

    if (hasForbiddenFreeText(siteName, industryProfile, workerCountBand, ...majorProcesses, ...majorEquipment)) {
      return buildRedirect(request, { companyCode, siteActionError: "sensitive_text_not_allowed" });
    }

    const result = await createOwnerTenantSite({
      companyCode,
      siteName,
      industryProfile,
      majorProcesses,
      majorEquipment,
      workerCountBand,
      usesExternalWorkforce: readTristate(formData, "uses_external_workforce"),
      hasWorkerRepresentative: readTristate(formData, "has_worker_representative"),
    });

    if (!result.ok) {
      return buildRedirect(request, { companyCode, siteActionError: result.reason });
    }

    return buildRedirect(request, { companyCode: result.companyCode, siteAction: "created" });
  }

  if (action === "update_profile") {
    const siteId = readText(formData, "site_id", 80);
    const siteName = readText(formData, "site_name", 160);
    const industryProfile = readText(formData, "industry_profile", 80);
    const workerCountBand = readText(formData, "worker_count_band", 40);
    const majorProcesses = readList(formData, "major_processes");
    const majorEquipment = readList(formData, "major_equipment");

    if (!siteId) {
      return buildRedirect(request, { companyCode, siteActionError: "site_not_found" });
    }

    if (hasForbiddenFreeText(siteName, industryProfile, workerCountBand, ...majorProcesses, ...majorEquipment)) {
      return buildRedirect(request, { companyCode, siteActionError: "sensitive_text_not_allowed" });
    }

    const result = await updateOwnerTenantSiteProfile({
      companyCode,
      siteId,
      siteName,
      industryProfile,
      majorProcesses,
      majorEquipment,
      workerCountBand,
      usesExternalWorkforce: readTristate(formData, "uses_external_workforce"),
      hasWorkerRepresentative: readTristate(formData, "has_worker_representative"),
    });

    if (!result.ok) {
      return buildRedirect(request, { companyCode, siteActionError: result.reason });
    }

    return buildRedirect(request, { companyCode: result.companyCode, siteAction: "profile_updated" });
  }

  if (action === "set_default") {
    const siteId = readText(formData, "site_id", 80);

    if (!siteId) {
      return buildRedirect(request, { companyCode, siteActionError: "site_not_found" });
    }

    const result = await setOwnerTenantDefaultSite({ companyCode, siteId });

    if (!result.ok) {
      return buildRedirect(request, { companyCode, siteActionError: result.reason });
    }

    return buildRedirect(request, { companyCode: result.companyCode, siteAction: "default_set" });
  }

  if (action === "set_status") {
    const siteId = readText(formData, "site_id", 80);
    const statusValue = readText(formData, "status", 20);
    const status = statusValue === "archived" ? "archived" : statusValue === "active" ? "active" : null;

    if (!siteId || !status) {
      return buildRedirect(request, { companyCode, siteActionError: "site_not_found" });
    }

    const result = await setOwnerTenantSiteStatus({ companyCode, siteId, status });

    if (!result.ok) {
      return buildRedirect(request, { companyCode, siteActionError: result.reason });
    }

    return buildRedirect(request, { companyCode: result.companyCode, siteAction: "status_updated" });
  }

  return buildRedirect(request, { companyCode, siteActionError: "invalid_input" });
}
