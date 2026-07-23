"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createTenantDefaultSite,
  getDefaultTenantSiteConfigByTenantCode,
  listTenantSitesByTenantCode,
  updateTenantSiteProfile,
} from "@/lib/supabaseServer";
import { buildRiskShareLangHref, getRiskShareLocale } from "@/lib/risk-share/riskShareI18n";
import { resolveRiskShareSingleSiteScope } from "@/lib/risk-share/riskShareDefaultSiteScope";
import { canAccessRiskShareManagerTenant } from "@/lib/risk-share/riskShareManagerTenantAccess";
import { resolveRiskShareManagerTenant } from "@/lib/risk-share/riskSharePublicTenantGuard";
import { requireTenantAccessForCurrentSession } from "@/lib/tenant-auth/tenantAccessServerGuards";
import {
  validateTenantSiteProfile,
  type TenantSiteProfileFieldErrors,
} from "@/lib/tenant-onboarding/tenantSiteProfileValidation";

export type SiteProfileActionState = {
  values: {
    siteName: string;
    industryProfile: string;
    majorProcesses: string;
    majorEquipment: string;
    workerCountBand: string;
    usesExternalWorkforce: string;
    hasWorkerRepresentative: string;
  };
  fieldErrors: TenantSiteProfileFieldErrors;
  formError: string | null;
};

function readFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function getSubmittedValues(formData: FormData): SiteProfileActionState["values"] {
  return {
    siteName: readFormString(formData, "siteName"),
    industryProfile: readFormString(formData, "industryProfile"),
    majorProcesses: readFormString(formData, "majorProcesses"),
    majorEquipment: readFormString(formData, "majorEquipment"),
    workerCountBand: readFormString(formData, "workerCountBand"),
    usesExternalWorkforce: readFormString(formData, "usesExternalWorkforce"),
    hasWorkerRepresentative: readFormString(formData, "hasWorkerRepresentative"),
  };
}

function normalizeNavigationCode(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 64);
}

async function resolveSiteIdForUpdate(tenantId: string, tenantCode: string, siteName: string) {
  const resolveCanonicalSite = async () => {
    const [defaultSite, tenantSites] = await Promise.all([
      getDefaultTenantSiteConfigByTenantCode(tenantCode),
      listTenantSitesByTenantCode(tenantCode),
    ]);
    const singleSiteScope = resolveRiskShareSingleSiteScope(defaultSite, tenantSites);

    if (!singleSiteScope.ok) {
      return { ok: false as const, siteId: null };
    }

    return { ok: true as const, siteId: singleSiteScope.siteId };
  };

  const existingScope = await resolveCanonicalSite();

  if (!existingScope.ok) {
    return null;
  }

  if (existingScope.siteId) {
    return existingScope.siteId;
  }

  const createResult = await createTenantDefaultSite({ tenantId, tenantCode, siteName });

  if (!createResult.ok && createResult.reason !== "default_already_exists") {
    return null;
  }

  const recoveredScope = await resolveCanonicalSite();
  return recoveredScope.ok ? recoveredScope.siteId : null;
}

export async function saveSiteProfileAction(
  companyCode: string,
  langValue: string,
  _previousState: SiteProfileActionState,
  formData: FormData,
): Promise<SiteProfileActionState> {
  const values = getSubmittedValues(formData);
  const tenantResolution = await resolveRiskShareManagerTenant(companyCode);
  const lang = getRiskShareLocale(langValue);
  const callbackUrl = buildRiskShareLangHref(
    "/risk-share/manager/settings/site-profile",
    { company: normalizeNavigationCode(companyCode) },
    lang,
  );

  if (!tenantResolution.ok) {
    return { values, fieldErrors: {}, formError: "사업장 정보를 확인할 수 없습니다. 관리자 홈 링크로 다시 접속해 주세요." };
  }

  const accessResult = await requireTenantAccessForCurrentSession({
    tenantCode: tenantResolution.tenant.code,
    allowedRoles: ["tenant_admin", "tenant_manager"],
  });

  if (!accessResult.ok) {
    if (accessResult.reason === "unauthenticated") {
      redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    }

    return { values, fieldErrors: {}, formError: "사업장 운영정보를 수정할 권한이 확인되지 않았습니다." };
  }

  if (!canAccessRiskShareManagerTenant(tenantResolution.tenant.status, accessResult.context.role)) {
    return { values, fieldErrors: {}, formError: "사업장 운영정보를 수정할 권한이 확인되지 않았습니다." };
  }

  const tenantId = accessResult.context.membership.tenantId;
  const tenantCode = accessResult.context.membership.tenantCode;
  const validation = validateTenantSiteProfile(values);

  if (!validation.ok) {
    return { values, fieldErrors: validation.fieldErrors, formError: "입력값을 확인해 주세요." };
  }

  const siteId = await resolveSiteIdForUpdate(tenantId, tenantCode, validation.value.siteName).catch(() => null);

  if (!siteId) {
    return { values, fieldErrors: {}, formError: "저장할 기본 사업장을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }

  let finalUpdateResult = await updateTenantSiteProfile({
    tenantId,
    siteId,
    ...validation.value,
  }).catch(() => ({ ok: false, id: null, reason: "request_failed" }));

  if (!finalUpdateResult.ok && finalUpdateResult.reason === "site_not_found") {
    const recoveredSiteId = await Promise.all([
      getDefaultTenantSiteConfigByTenantCode(tenantCode),
      listTenantSitesByTenantCode(tenantCode),
    ])
      .then(([defaultSite, tenantSites]) => {
        const singleSiteScope = resolveRiskShareSingleSiteScope(defaultSite, tenantSites);
        return singleSiteScope.ok ? singleSiteScope.siteId : null;
      })
      .catch(() => null);

    if (recoveredSiteId && recoveredSiteId !== siteId) {
      finalUpdateResult = await updateTenantSiteProfile({
        tenantId,
        siteId: recoveredSiteId,
        ...validation.value,
      }).catch(() => ({ ok: false, id: null, reason: "request_failed" }));
    }
  }

  if (!finalUpdateResult.ok) {
    const formError = finalUpdateResult.reason === "site_name_duplicate"
      ? "같은 이름의 사업장이 이미 있습니다. 다른 사업장명을 입력해 주세요."
      : "저장하지 못했습니다. 입력값을 유지했으니 잠시 후 다시 시도해 주세요.";

    return { values, fieldErrors: {}, formError };
  }

  revalidatePath("/risk-share/manager");
  revalidatePath("/risk-share/manager/settings/site-profile");
  redirect(buildRiskShareLangHref(
    "/risk-share/manager/settings/site-profile",
    { company: tenantCode, saved: "1" },
    lang,
  ));
}
