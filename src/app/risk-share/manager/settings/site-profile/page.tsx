import { redirect } from "next/navigation";

import { getDefaultTenantSiteConfigByTenantCode } from "@/lib/supabaseServer";
import { buildRiskShareLangHref, getRiskShareLocale } from "@/lib/risk-share/riskShareI18n";
import { resolveActiveRiskSharePublicTenant } from "@/lib/risk-share/riskSharePublicTenantGuard";
import { requireTenantAccessForCurrentSession } from "@/lib/tenant-auth/tenantAccessServerGuards";
import type { SiteProfileActionState } from "./actions";
import SiteProfileForm from "./SiteProfileForm";
import SiteProfileShell from "./SiteProfileShell";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  searchParams?: Promise<{
    company?: string | string[];
    lang?: string | string[];
  }>;
};

function readSearchParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function normalizeCompanyCode(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 64);
}

function boolToFormValue(value: boolean | null) {
  if (value === true) return "yes";
  if (value === false) return "no";
  return "";
}

const initialSiteProfileActionState: SiteProfileActionState = {
  values: {
    siteName: "",
    industryProfile: "",
    majorProcesses: "",
    majorEquipment: "",
    workerCountBand: "",
    usesExternalWorkforce: "",
    hasWorkerRepresentative: "",
  },
  fieldErrors: {},
  formError: null,
};

function buildInitialState(site: Awaited<ReturnType<typeof getDefaultTenantSiteConfigByTenantCode>>): SiteProfileActionState {
  if (!site) {
    return initialSiteProfileActionState;
  }

  return {
    values: {
      siteName: site.siteName,
      industryProfile: site.industryProfile ?? "",
      majorProcesses: site.majorProcesses?.join("\n") ?? "",
      majorEquipment: site.majorEquipment?.join("\n") ?? "",
      workerCountBand: site.workerCountBand ?? "",
      usesExternalWorkforce: boolToFormValue(site.usesExternalWorkforce),
      hasWorkerRepresentative: boolToFormValue(site.hasWorkerRepresentative),
    },
    fieldErrors: {},
    formError: null,
  };
}

export default async function ManagerSiteProfileSettingsPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const rawCompanyCode = readSearchParam(params.company);
  const companyCode = normalizeCompanyCode(rawCompanyCode);
  const lang = getRiskShareLocale(readSearchParam(params.lang));
  const settingsHref = buildRiskShareLangHref("/risk-share/manager/settings/site-profile", { company: companyCode }, lang);
  const tenantResolution = await resolveActiveRiskSharePublicTenant(rawCompanyCode);

  if (!tenantResolution.ok) {
    return (
      <SiteProfileShell>
        <div className="content">
              <section className="card card--pad" style={{ maxWidth: "720px", margin: "40px auto" }}>
                <p className="eyebrow">SafeMetrica · 안전운영</p>
                <h1>사업장 운영정보를 열 수 없습니다.</h1>
                <p className="muted">등록된 고객사 코드가 필요합니다. 관리자 홈 링크로 다시 접속해 주세요.</p>
              </section>
        </div>
      </SiteProfileShell>
    );
  }

  const tenantAccessResult = await requireTenantAccessForCurrentSession({
    tenantCode: tenantResolution.tenant.code,
    allowedRoles: ["tenant_admin", "tenant_manager"],
  });

  if (!tenantAccessResult.ok) {
    if (tenantAccessResult.reason === "unauthenticated") {
      redirect(`/login?callbackUrl=${encodeURIComponent(settingsHref)}`);
    }

    return (
      <SiteProfileShell>
        <div className="content">
              <section className="card card--pad" style={{ maxWidth: "720px", margin: "40px auto" }}>
                <p className="eyebrow">SafeMetrica · 안전운영</p>
                <h1>사업장 운영정보 권한이 확인되지 않았습니다.</h1>
                <p className="muted">운영 담당자에게 문의해 주세요.</p>
              </section>
        </div>
      </SiteProfileShell>
    );
  }

  const tenantCode = tenantAccessResult.context.membership.tenantCode;
  const siteResult = await getDefaultTenantSiteConfigByTenantCode(tenantCode)
    .then((site) => ({ ok: true as const, site }))
    .catch(() => ({ ok: false as const }));

  if (!siteResult.ok) {
    return (
      <SiteProfileShell>
        <div className="content" style={{ padding: "24px", overflowX: "hidden" }}>
              <section className="card card--pad" style={{ maxWidth: "720px" }}>
                <p className="eyebrow">SafeMetrica · 안전운영</p>
                <h1>사업장 운영정보</h1>
                <p className="muted" style={{ marginTop: "10px" }}>
                  사업장 운영정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
                </p>
                <p style={{ marginTop: "18px" }}>
                  <a className="btn btn--ghost" href={buildRiskShareLangHref("/risk-share/manager", { company: tenantCode }, lang)}>
                    관리자 홈으로 돌아가기
                  </a>
                </p>
              </section>
        </div>
      </SiteProfileShell>
    );
  }

  return (
    <SiteProfileShell>
      <div className="content" style={{ padding: "24px", overflowX: "hidden" }}>
            <div className="page-head" style={{ maxWidth: "860px" }}>
              <div>
                <p className="eyebrow">SafeMetrica · 안전운영</p>
                <h1>사업장 운영정보</h1>
                <p>위험성평가 공유확인과 월간 운영기록에 사용할 기본 사업장 정보를 입력합니다.</p>
              </div>
            </div>
            <SiteProfileForm
              companyCode={tenantCode}
              lang={lang}
              managerHref={buildRiskShareLangHref("/risk-share/manager", { company: tenantCode }, lang)}
              initialState={buildInitialState(siteResult.site)}
            />
      </div>
    </SiteProfileShell>
  );
}
