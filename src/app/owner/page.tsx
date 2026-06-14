import OwnerExportPanel from "./OwnerExportPanel";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const tenants = [
  {
    code: "daedo",
    name: "㈜대도환경",
    industry: "생활폐기물",
    status: "운영중",
    desc: "TBM, EB, PTW, 위험성평가, 월간보고서 운영",
  },
  {
    code: "dongwoo",
    name: "동우환경",
    category: "생활폐기물",
    status: "운영중",
    description: "TBM, EB, PTW, 위험성평가, 현장참여, 월간보고서 운영",
  },
  {
    code: "hankookgreen",
    name: "한국그린환경",
    category: "생활폐기물",
    status: "운영중",
    description: "TBM, EB, PTW, 위험성평가, 현장참여, 월간보고서 운영",
  },
  {
    code: "demo",
    name: "데모 사업장",
    industry: "공통 데모",
    status: "데모",
    desc: "SafeMetrica 기본 화면 확인용",
  },
  {
    code: "bubblemon",
    name: "버블몬코리아",
    industry: "물류업 · 원청",
    status: "운영중",
    desc: "원청·협력사 안전운영, TBM, 점검·교육, 위험성평가, 월간보고서 운영",
  },
];

const riskShareTenants = tenants.filter((tenant) => tenant.code !== "demo");

function buildOwnerSelectHref(companyCode: string, nextPath: string) {
  return `/api/owner/select?code=${encodeURIComponent(companyCode)}&next=${encodeURIComponent(nextPath)}`;
}

function buildWorkerParticipationHref(companyCode: string) {
  return `/field/participation?company=${encodeURIComponent(companyCode)}`;
}

function getTenantIndustry(tenant: (typeof tenants)[number]) {
  return tenant.industry ?? tenant.category ?? "업종 확인";
}

function getTenantDescription(tenant: (typeof tenants)[number]) {
  return tenant.desc ?? tenant.description ?? "운영 범위 확인";
}

function isRecommendedCaptureTenant(companyCode: string) {
  return companyCode === "hankookgreen";
}

function isLiveWorkerTenant(companyCode: string) {
  return companyCode === "bubblemon";
}

function isRiskShareReadyTenant(companyCode: string) {
  return companyCode === "daedo" || companyCode === "dongwoo" || companyCode === "hankookgreen" || companyCode === "bubblemon";
}

function isRiskShareDisabledTenant(companyCode: string) {
  return companyCode === "mons";
}

function getRiskShareTenantNote(companyCode: string) {
  if (isRecommendedCaptureTenant(companyCode)) {
    return "운영 가능";
  }

  if (isLiveWorkerTenant(companyCode)) {
    return "운영 가능";
  }

  if (isRiskShareDisabledTenant(companyCode)) {
    return "공유팩 제외";
  }

  return "운영 가능";
}

function getRiskShareTenantTone(companyCode: string) {
  if (isRecommendedCaptureTenant(companyCode)) {
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-200";
  }

  if (isLiveWorkerTenant(companyCode)) {
    return "border-amber-500/40 bg-amber-500/10 text-amber-200";
  }

  return "border-slate-700 bg-slate-950/60 text-slate-300";
}

function isRiskShareQuickLinkEnabled(companyCode: string) {
  return isRiskShareReadyTenant(companyCode);
}

function getRiskShareButtonClass(companyCode: string) {
  return isRiskShareQuickLinkEnabled(companyCode)
    ? "rounded-xl border border-cyan-500/40 px-3 py-2 text-center text-xs font-black text-cyan-100 hover:bg-cyan-500/10"
    : "pointer-events-none rounded-xl border border-slate-700 px-3 py-2 text-center text-xs font-black text-slate-600";
}

function isWorkerQrLinkEnabled(companyCode: string) {
  return isRiskShareReadyTenant(companyCode);
}

function getWorkerQrButtonClass(companyCode: string) {
  return isWorkerQrLinkEnabled(companyCode)
    ? "rounded-xl border border-blue-500/40 px-3 py-2 text-center text-xs font-black text-blue-100 hover:bg-blue-500/10"
    : "pointer-events-none rounded-xl border border-slate-700 px-3 py-2 text-center text-xs font-black text-slate-600";
}

function isCaptureWarningVisible(companyCode: string) {
  return isLiveWorkerTenant(companyCode);
}

function getRiskShareQuickLinkAriaLabel(tenantName: string, label: string) {
  return `${tenantName} ${label}`;
}

function getRiskShareManagerHref(companyCode: string) {
  return buildOwnerSelectHref(companyCode, "/manager/risk-share");
}

function getRiskShareMonthlyHref(companyCode: string) {
  return buildOwnerSelectHref(companyCode, "/monthly-report/risk-share");
}

function getRiskShareRepresentativeHref(companyCode: string) {
  return buildOwnerSelectHref(companyCode, "/manager/representative-confirmations");
}

function getRiskShareWorkerHref(companyCode: string) {
  return buildWorkerParticipationHref(companyCode);
}

function isRiskShareCaptionVisible(companyCode: string) {
  return isRecommendedCaptureTenant(companyCode) || isLiveWorkerTenant(companyCode);
}

function getRiskShareCaption(companyCode: string) {
  if (isRecommendedCaptureTenant(companyCode)) {
    return "이미 등록된 고객사의 공유팩 운영화면을 확인합니다.";
  }

  if (isLiveWorkerTenant(companyCode)) {
    return "이미 등록된 고객사의 공유팩 운영화면을 확인합니다.";
  }

  return "";
}

function isRiskShareQuickSectionVisible() {
  return riskShareTenants.length > 0;
}

function isRiskShareLinkDisabled(companyCode: string) {
  return !isRiskShareQuickLinkEnabled(companyCode);
}

function getRiskShareLinkHref(companyCode: string, nextPath: string) {
  return isRiskShareLinkDisabled(companyCode) ? "#" : buildOwnerSelectHref(companyCode, nextPath);
}

function getRiskShareWorkerLinkHref(companyCode: string) {
  return isWorkerQrLinkEnabled(companyCode) ? buildWorkerParticipationHref(companyCode) : "#";
}

function getRiskShareWorkerLinkTitle(companyCode: string) {
  return isLiveWorkerTenant(companyCode)
    ? "운영 가능이므로 제출 테스트는 피하세요."
    : "회사코드 포함 근로자 QR 화면";
}

function isRiskShareQuickTenantDimmed(companyCode: string) {
  return !isRiskShareQuickLinkEnabled(companyCode);
}

function getRiskShareQuickTenantClass(companyCode: string) {
  return isRiskShareQuickTenantDimmed(companyCode)
    ? "rounded-2xl border border-slate-800 bg-slate-900/60 p-4 opacity-60"
    : "rounded-2xl border border-slate-700 bg-slate-900 p-4";
}

function isRiskShareHankookgreen(companyCode: string) {
  return companyCode === "hankookgreen";
}

function getRiskSharePrimaryButtonClass(companyCode: string) {
  return isRiskShareHankookgreen(companyCode)
    ? "rounded-xl bg-emerald-500 px-3 py-2 text-center text-xs font-black text-slate-950 hover:bg-emerald-400"
    : getRiskShareButtonClass(companyCode);
}

function getRiskSharePrimaryHref(companyCode: string) {
  return getRiskShareManagerHref(companyCode);
}

function getRiskSharePrimaryLabel(companyCode: string) {
  return isRiskShareHankookgreen(companyCode) ? "공유팩 홈" : "공유팩 홈";
}

function isOwnerTokenValid(ownerToken?: string) {
  const expectedToken = process.env.SAFEMETRICA_OWNER_TOKEN;
  return Boolean(expectedToken && ownerToken === expectedToken);
}

export default async function OwnerConsolePage({
  searchParams,
}: {
  searchParams?: Promise<{ token?: string; error?: string }>;
}) {
  const params = (await searchParams) ?? {};

  if (params.token) {
    redirect(`/api/owner/login?token=${encodeURIComponent(params.token)}`);
  }

  const c = await cookies();
  const ownerToken = c.get("sm_owner_token")?.value;

  if (!isOwnerTokenValid(ownerToken)) {
    redirect("/login?error=owner_required");
  }

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-6 text-white">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-3xl border border-blue-500/30 bg-slate-900 p-6 shadow-2xl">
          <p className="text-sm font-bold text-blue-300">SafeMetrica Owner Console</p>
          <h1 className="mt-2 text-3xl font-black">관리자 전체앱</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            고객사 전용 토큰을 매번 복사하지 않고, 관리자 권한으로 운영 고객사를 선택해 접속합니다.
            이 화면은 고객사 홈 메뉴에 노출되지 않습니다.
          </p>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          {tenants.map((tenant) => (
            <article key={tenant.code} className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-slate-400">{getTenantIndustry(tenant)}</p>
                  <h2 className="mt-1 text-xl font-black">{tenant.name}</h2>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300">
                  {tenant.status}
                </span>
              </div>

              <p className="mt-3 text-sm leading-6 text-slate-300">{getTenantDescription(tenant)}</p>

              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <a
                  href={`/api/owner/select?code=${tenant.code}`}
                  className="rounded-xl bg-blue-600 px-4 py-3 text-center text-sm font-black hover:bg-blue-500"
                >
                  운영 홈 접속
                </a>
                <a
                  href={`/api/owner/select?code=${tenant.code}`}
                  className="rounded-xl border border-slate-600 px-4 py-3 text-center text-sm font-black text-slate-200 hover:bg-slate-800"
                >
                  고객사 선택
                </a>
              </div>
            </article>
          ))}
        </section>

        {isRiskShareQuickSectionVisible() ? (
          <section className="mt-6 rounded-3xl border border-cyan-500/30 bg-slate-900 p-6 shadow-2xl">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-bold text-cyan-300">Risk Share Pack</p>
                <h2 className="mt-2 text-2xl font-black text-white">기존 고객 공유팩 운영화면</h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
                  Owner 권한으로 이미 등록된 고객사를 선택한 뒤 공유팩 관리자 홈, 월간보고서, 근로자대표 확인 관리로 이동합니다. 신규 고객 공유팩 활성화는 Source Intake / Activation 단계에서 별도로 진행합니다.
                </p>
              </div>
              <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-200">
                기존 고객 전용
              </span>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {riskShareTenants.map((tenant) => (
                <article key={`risk-share-${tenant.code}`} className={getRiskShareQuickTenantClass(tenant.code)}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-slate-400">{getTenantIndustry(tenant)}</p>
                      <h3 className="mt-1 text-lg font-black text-white">{tenant.name}</h3>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-black ${getRiskShareTenantTone(tenant.code)}`}>
                      {getRiskShareTenantNote(tenant.code)}
                    </span>
                  </div>

                  {isRiskShareCaptionVisible(tenant.code) ? (
                    <p className="mt-3 rounded-xl border border-slate-700 bg-slate-950/60 p-3 text-xs leading-5 text-slate-300">
                      {getRiskShareCaption(tenant.code)}
                    </p>
                  ) : null}

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <a
                      aria-label={getRiskShareQuickLinkAriaLabel(tenant.name, getRiskSharePrimaryLabel(tenant.code))}
                      href={getRiskSharePrimaryHref(tenant.code)}
                      className={getRiskSharePrimaryButtonClass(tenant.code)}
                    >
                      {getRiskSharePrimaryLabel(tenant.code)}
                    </a>
                    <a
                      aria-label={getRiskShareQuickLinkAriaLabel(tenant.name, "월간보고서")}
                      href={getRiskShareLinkHref(tenant.code, "/monthly-report/risk-share")}
                      className={getRiskShareButtonClass(tenant.code)}
                    >
                      월간보고서
                    </a>
                    <a
                      aria-label={getRiskShareQuickLinkAriaLabel(tenant.name, "대표확인 관리")}
                      href={getRiskShareLinkHref(tenant.code, "/manager/representative-confirmations")}
                      className={getRiskShareButtonClass(tenant.code)}
                    >
                      대표확인 관리
                    </a>
                    <a
                      aria-label={getRiskShareQuickLinkAriaLabel(tenant.name, "근로자 QR 화면")}
                      href={getRiskShareWorkerLinkHref(tenant.code)}
                      title={getRiskShareWorkerLinkTitle(tenant.code)}
                      className={getWorkerQrButtonClass(tenant.code)}
                    >
                      근로자 QR 화면
                    </a>
                  </div>
                </article>
              ))}
            </div>

            <p className="mt-5 rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 text-xs leading-5 text-amber-100">
              Owner Token, 고객 민감정보, 실제 제보 원문은 외부 자료에 포함하지 않습니다. 신규 고객 공유팩은 고객사 코드 생성, 위험성평가 source 접수, 공유항목 정리, QR 활성화 단계를 별도로 거칩니다.
            </p>
          </section>
        ) : null}

        <section className="mt-6 rounded-3xl border border-emerald-500/30 bg-slate-900 p-6 shadow-2xl">
          <p className="text-sm font-bold text-emerald-300">Risk Share Pack Activation</p>
          <h2 className="mt-2 text-2xl font-black text-white">신규 고객 공유팩 활성화</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            신규 고객 코드 후보, 위험성평가 source 접수, 공유항목 정리, 고객 확인, 버전 잠금, QR 활성화 상태를 확인합니다.
            실제 운영 전 Companies DB 등록과 active 상태 확인이 필요합니다.
          </p>
          <div className="mt-5">
            <a
              href="/owner/risk-share-activation"
              className="inline-flex rounded-xl bg-emerald-500 px-4 py-3 text-sm font-black text-slate-950 hover:bg-emerald-400"
            >
              신규 공유팩 활성화 화면 열기
            </a>
          </div>
        </section>

        <OwnerExportPanel />

        <section className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-950/20 p-5">
          <p className="text-sm font-bold text-amber-200">Principal · Contractor</p>
          <h2 className="mt-2 text-2xl font-black text-white">몬스 독립 테넌트 운영</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            몬스는 버블몬 협력사가 아니라 3개월 단기 독립 테넌트입니다. 현장참여와 TBM 중심으로
            TBM, 점검·교육, 위험성평가 공유, 교육증빙, 월간보고서 관리 범위를 확인합니다.
          </p>
          <div className="mt-5">
            <a
              href="/owner"
              className="inline-flex rounded-xl bg-amber-500 px-4 py-3 text-sm font-black text-slate-950 hover:bg-amber-400"
            >
              물류업 계약 준비 화면 열기
            </a>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-blue-500/30 bg-slate-900 p-5">
          <p className="text-sm font-bold text-blue-300">Partner Console</p>
          <h2 className="mt-2 text-2xl font-black text-white">SafeMetrica EduLink™</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            교육기관 제휴형 파트너 콘솔입니다. 가온에듀 지사와 파일럿 고객사의 교육이수증빙 운영 현황을 확인합니다.
            이 메뉴는 관리자 전체앱에만 표시되며 고객사 홈에는 노출되지 않습니다.
          </p>
          <div className="mt-5">
            <a
              href="/partner/gaon"
              className="inline-flex rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white hover:bg-blue-500"
            >
              가온에듀 파트너 콘솔 열기
            </a>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-950/20 p-5">
          <h2 className="text-lg font-black text-amber-200">운영 원칙</h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
            <li>• 고객사 일반 화면에는 전체 고객사 목록을 노출하지 않습니다.</li>
            <li>• 고객사는 기존 전용 보안 링크로만 접속합니다.</li>
            <li>• 관리자는 owner token으로만 전체앱에 접근합니다.</li>
            <li>• token 값은 GitHub, 채팅, 공개 문서에 남기지 않습니다.</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
