import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getOwnerTenantOnboardingValidationMessages,
  validateOwnerTenantOnboardingDraft,
} from "@/lib/tenant-onboarding/ownerTenantOnboardingValidation";
import {
  RISK_SHARE_LANGUAGE_OPTIONS,
  buildRiskShareLangHref,
} from "@/lib/risk-share/riskShareI18n";
import { listOwnerTenantSites } from "@/lib/tenant-onboarding/ownerTenantSiteActions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "신규업체 고객코드 생성 준비 | SafeMetrica",
  robots: {
    index: false,
    follow: false,
  },
};

const basicFields = [
  {
    label: "고객사 코드",
    name: "company_code",
    value: "hyundai-hoist",
    help: "영문 소문자, 숫자, 하이픈 중심으로 정리합니다.",
  },
  {
    label: "고객사명",
    name: "company_name",
    value: "(주)현대호이스트",
    help: "고객 화면에 노출될 회사명입니다.",
  },
  {
    label: "기본 현장명",
    name: "default_site_name",
    value: "본사 / 1공장",
    help: "초기 현장 QR과 관리자 화면의 기본 현장명입니다.",
  },
  {
    label: "담당자 표시명",
    name: "contact_label",
    value: "운영 담당자",
    help: "민감정보를 직접 입력하지 않고 내부 식별용으로만 사용합니다.",
  },
];

const selectFields = [
  {
    label: "서비스 범위",
    name: "service_mode",
    options: ["위험성평가 공유확인 운영팩"],
    help: "현재 생성은 위험성평가 공유확인 운영팩 고객코드와 운영 링크팩 발급 기준으로 처리합니다.",
  },
  {
    label: "과금 구분",
    name: "plan_type",
    options: ["유료 운영", "시범 운영", "내부 테스트"],
    help: "운영계약 상태에 맞춰 내부 검토용으로 구분합니다.",
  },
  {
    label: "상태",
    name: "status",
    options: ["생성 전 검토", "운영 준비", "운영 중", "중지"],
    help: "고객코드 생성 전 검토 상태를 기준으로 확인합니다.",
  },
];

const moduleOptions = [
  "근로자 QR",
  "빠른 의견",
  "관리자 접수함",
  "월간보고서",
  "내부 전달자료",
  "대표 확인",
];

type PageSearchParams = Record<string, string | string[] | undefined>;

function getSingleSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function buildOwnerOnlyLinks(companyCode: string) {
  const encodedCode = encodeURIComponent(companyCode);

  return [
    {
      label: "Full SafeMetrica 운영형 관리자 홈 (내부 참고)",
      href: `/manager/risk-share?company=${encodedCode}`,
      description:
        "기존 Full SafeMetrica 운영형 참고 route입니다. 위험성평가 공유확인 운영팩 고객 링크팩에는 포함하지 않습니다.",
    },
    {
      label: "Full SafeMetrica 운영형 월간 결과물 (내부 참고)",
      href: `/monthly-report/risk-share?company=${encodedCode}`,
      description:
        "기존 Full SafeMetrica 운영형 참고 route입니다. 위험성평가 공유확인 운영팩 고객 링크팩에는 포함하지 않습니다.",
    },
  ];
}

type RiskShareLinkPackEntry = {
  label: string;
  path: string;
  query: Record<string, string>;
  description: string;
};

function toRiskShareLinkPack(entries: RiskShareLinkPackEntry[]) {
  return entries.map((entry) => ({
    label: entry.label,
    description: entry.description,
    languageLinks: RISK_SHARE_LANGUAGE_OPTIONS.map((language) => ({
      code: language.code,
      label: language.code === "ko" ? `기본 · ${language.label}` : language.label,
      href: buildRiskShareLangHref(entry.path, entry.query, language.code),
    })),
  }));
}

function buildRiskShareLinkPackGroups(companyCode: string) {
  const fieldEntries: RiskShareLinkPackEntry[] = [
    {
      label: "현장 QR 입구",
      path: "/risk-share/field",
      query: { company: companyCode },
      description: "근로자와 외부인이 공유확인, 작업 전 확인, 익명 의견 입구를 선택합니다.",
    },
    {
      label: "위험성평가 공유확인",
      path: "/risk-share/participation",
      query: { company: companyCode, mode: "monthly" },
      description: "이번 달 공유된 위험요인과 안전조치를 확인합니다.",
    },
    {
      label: "작업 전 안전확인",
      path: "/risk-share/participation",
      query: { company: companyCode, mode: "prework" },
      description: "작업 전 보호구, 동선, 적재·하역, 설비 주변 주의사항을 확인합니다.",
    },
    {
      label: "익명 의견함",
      path: "/risk-share/anonymous",
      query: { company: companyCode },
      description: "이름 없이 의견, 아차사고, 개선제안을 남깁니다.",
    },
    {
      label: "외부인 출입 전 안전 안내",
      path: "/risk-share/visitor",
      query: { company: companyCode },
      description: "방문·납품·협력업체가 출입 전 안전 안내를 확인합니다.",
    },
    {
      label: "근로자대표 확인·의견 기록",
      path: "/risk-share/representative",
      query: { company: companyCode },
      description: "근로자대표가 확인과 의견을 남깁니다.",
    },
  ];

  const managerEntries: RiskShareLinkPackEntry[] = [
    {
      label: "관리자 홈",
      path: "/risk-share/manager",
      query: { company: companyCode },
      description: "공유확인, 익명 의견, 외부인 확인, 근로자대표 확인 현황을 확인합니다.",
    },
    {
      label: "월간 안전운영 요약",
      path: "/risk-share/monthly",
      query: { company: companyCode },
      description: "이번 달 확인·의견 현황을 요약으로 확인합니다.",
    },
  ];

  return {
    fieldLinkPack: toRiskShareLinkPack(fieldEntries),
    managerLinkPack: toRiskShareLinkPack(managerEntries),
  };
}

const 미리보기Rows = [
  ["고객사 코드", "hyundai-hoist"],
  ["고객사명", "(주)현대호이스트"],
  ["상태", "생성 전 검토"],
  ["서비스 범위", "위험성평가 공유확인 운영팩"],
  ["사용 모듈", "근로자 QR, 빠른 의견, 관리자 접수함, 월간 결과물"],
];


const ownerDraftValidationPreview = validateOwnerTenantOnboardingDraft({
  companyCode: "future",
  displayName: "(주)샘플제조",
  serviceMode: "full_safemetrica",
  enabledModules: [
    "worker_qr_e_confirmation",
    "quick_feedback",
    "manager_inbox",
  ],
  managerEmail: "manager@example.com",
  role: "tenant_manager",
  status: "invited",
  rawPayload: {
    source: "owner_draft_preview",
  },
});

const ownerDraftValidationMessages =
  getOwnerTenantOnboardingValidationMessages(ownerDraftValidationPreview.errors);

const commercialActionErrorMessages: Record<string, string> = {
  invalid_company: "고객사 코드 형식을 확인해 주세요.",
  invalid_input: "입력값을 다시 확인해 주세요.",
  tenant_not_found: "등록된 고객사 코드를 찾을 수 없습니다.",
  tenant_not_eligible: "이 고객사는 현재 상태에서 이 작업을 진행할 수 없습니다.",
  membership_exists: "이미 등록된 관리자 멤버십입니다.",
  membership_insert_failed: "관리자 멤버십 저장에 실패했습니다.",
  default_site_required: "기본 현장명이 필요합니다.",
  active_manager_required: "활성 관리자 멤버십이 필요합니다.",
  activation_conflict: "활성화 처리 중 상태가 변경되어 다시 확인이 필요합니다.",
  activation_failed: "활성화 처리에 실패했습니다.",
  missing_server_config: "운영 서버 설정을 확인할 수 없습니다.",
};

const siteActionErrorMessages: Record<string, string> = {
  invalid_company: "고객사 코드 형식을 확인해 주세요.",
  tenant_not_found: "등록된 고객사 코드를 찾을 수 없습니다.",
  tenant_not_eligible: "이 고객사는 현재 상태에서 이 작업을 진행할 수 없습니다.",
  site_name_required: "사업장명을 입력해야 합니다.",
  site_name_too_long: "사업장명이 너무 깁니다.",
  profile_list_invalid: "주요 공정·설비는 20개, 항목당 80자 이내로 입력해야 합니다.",
  sensitive_text_not_allowed: "민감정보 또는 내부 인증값으로 보이는 입력은 저장할 수 없습니다.",
  site_not_found: "사업장을 찾을 수 없습니다.",
  site_insert_failed: "사업장 저장에 실패했습니다.",
  site_update_failed: "사업장 정보 수정에 실패했습니다.",
  default_already_exists: "이미 기본사업장이 등록되어 있습니다.",
  site_tenant_mismatch: "다른 고객사의 사업장은 지정할 수 없습니다.",
  site_not_active: "보관 처리된 사업장은 기본사업장으로 지정할 수 없습니다.",
  cannot_archive_default_site: "기본사업장은 보관 처리할 수 없습니다. 다른 사업장을 기본으로 지정한 후 다시 시도하세요.",
  missing_server_config: "운영 서버 설정을 확인할 수 없습니다.",
  invalid_input: "입력값을 다시 확인해 주세요.",
  owner_required: "운영자 인증이 필요합니다.",
};

const siteActionSuccessMessages: Record<string, string> = {
  created: "사업장이 추가되었습니다.",
  profile_updated: "사업장 정보가 저장되었습니다.",
  default_set: "기본사업장이 변경되었습니다.",
  status_updated: "사업장 상태가 변경되었습니다.",
};

function isOwnerTokenValid(ownerToken?: string) {
  const expectedToken = process.env.SAFEMETRICA_OWNER_TOKEN;
  return Boolean(expectedToken && ownerToken === expectedToken);
}

export default async function OwnerTenantRegistryDraftPage({
  searchParams,
}: {
  searchParams?: Promise<PageSearchParams>;
}) {
  const params = (await searchParams) ?? {};
  const createdStatus = getSingleSearchParam(params.created);
  const createdCompanyCode = getSingleSearchParam(params.companyCode) ?? "";
  const errorCode = getSingleSearchParam(params.error) ?? "";
  const membershipStatus = getSingleSearchParam(params.membership) ?? "";
  const activationStatus = getSingleSearchParam(params.activation) ?? "";
  const actionErrorCode = getSingleSearchParam(params.actionError) ?? "";
  const siteAction = getSingleSearchParam(params.siteAction) ?? "";
  const siteActionError = getSingleSearchParam(params.siteActionError) ?? "";
  const siteWarning = getSingleSearchParam(params.siteWarning) ?? "";
  const createdOwnerLinks = createdCompanyCode
    ? buildOwnerOnlyLinks(createdCompanyCode)
    : [];
  const createdLinkPackGroups = createdCompanyCode
    ? buildRiskShareLinkPackGroups(createdCompanyCode)
    : null;

  const c = await cookies();
  const ownerToken = c.get("sm_owner_token")?.value;

  if (!isOwnerTokenValid(ownerToken)) {
    redirect("/login?error=owner_required");
  }

  const siteListResult = createdCompanyCode
    ? await listOwnerTenantSites(createdCompanyCode)
    : null;
  const tenantSites = siteListResult?.ok ? siteListResult.sites : [];

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-white">
      <section className="mx-auto max-w-6xl">
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
          이 화면은 내부 운영자가 고객코드 생성과 링크팩 발급 전에 입력값을 검토하는 화면입니다.
          실제 고객자료·인증정보·비밀번호·민감한 인증값은 입력하지 않습니다.
        </div>

        <div className="mt-5 flex flex-col gap-5 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-300">
              내부 운영 · 고객사 기본정보
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
              신규업체 고객코드 생성 준비
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
              신규 고객사 개설 전에 내부 운영자가 고객사 코드, 표시명, 현장명, 운영 범위를 확인합니다.
              확인 후 고객사 코드를 생성하고 관리자 홈, 월간 결과물, 근로자 QR 링크팩을 발급합니다.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/owner/tenant-onboarding"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-700 px-4 py-3 text-sm font-black text-slate-200 hover:bg-slate-800"
            >
              체크리스트로
            </Link>
            <Link
              href={
                createdCompanyCode
                  ? `/owner/risk-share/sources?companyCode=${encodeURIComponent(createdCompanyCode)}`
                  : "/owner/risk-share/sources"
              }
              className="inline-flex items-center justify-center rounded-2xl border border-emerald-400/60 px-4 py-3 text-sm font-black text-emerald-300 hover:bg-emerald-400/10"
            >
              위험성평가 원본 등록
            </Link>
            <Link
              href="/owner"
              className="inline-flex items-center justify-center rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-black text-slate-950 hover:bg-emerald-300"
            >
              내부 운영 홈으로
            </Link>
          </div>
        </div>

        {createdStatus || errorCode ? (
          <section className={[
            "mt-6 rounded-3xl border p-5",
            errorCode
              ? "border-rose-500/40 bg-rose-500/10 text-rose-100"
              : "border-emerald-500/40 bg-emerald-500/10 text-emerald-100",
          ].join(" ")}>
            <p className="text-sm font-black">
              {errorCode
                ? "고객사 코드 생성 확인 필요"
                : createdStatus === "already_exists"
                  ? "이미 등록된 고객사 코드입니다"
                  : "고객사 코드가 생성되었습니다"}
            </p>
            <h2 className="mt-2 text-2xl font-black">
              {createdCompanyCode || "입력값을 다시 확인하세요"}
            </h2>
            {errorCode ? (
              <p className="mt-3 text-sm font-bold leading-6">
                오류 코드: {errorCode}. 고객사 코드, 고객사명, 기존 고객 코드 사용 여부를 확인하세요.
              </p>
            ) : (
              <>
                <div className="mt-4">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-200/70">
                    운영자 전용 · Full SafeMetrica 운영형 참고 (고객 전달 금지)
                  </p>
                  <div className="mt-2 grid gap-3 md:grid-cols-2">
                    {createdOwnerLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="rounded-2xl border border-emerald-300/40 bg-slate-950/40 p-4 text-sm font-bold text-emerald-50 hover:border-emerald-200"
                      >
                        <span className="block text-base font-black">{link.label}</span>
                        <span className="mt-2 block text-xs leading-5 text-emerald-100/80">
                          {link.href}
                        </span>
                        <span className="mt-2 block text-xs leading-5 text-emerald-100/70">
                          {link.description}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>

                {createdLinkPackGroups ? (
                  <>
                    <div className="mt-5">
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-200/70">
                        고객 전달용 링크팩 · 위험성평가 공유확인 운영팩 · 현장 QR 배포용
                      </p>
                      <div className="mt-2 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {createdLinkPackGroups.fieldLinkPack.map((link) => (
                          <div
                            key={link.label}
                            className="rounded-2xl border border-emerald-300/40 bg-slate-950/40 p-4 text-sm font-bold text-emerald-50"
                          >
                            <span className="block text-base font-black">{link.label}</span>
                            <span className="mt-2 block text-xs leading-5 text-emerald-100/70">
                              {link.description}
                            </span>
                            <div className="mt-3 space-y-1.5">
                              {link.languageLinks.map((languageLink) => (
                                <Link
                                  key={languageLink.code}
                                  href={languageLink.href}
                                  className="flex items-center gap-2 rounded-xl border border-emerald-300/30 bg-slate-950/30 px-3 py-2 hover:border-emerald-200"
                                >
                                  <span className="shrink-0 rounded-full bg-emerald-400/20 px-2 py-0.5 text-[0.62rem] font-black text-emerald-200">
                                    {languageLink.label}
                                  </span>
                                  <span className="truncate text-[0.7rem] font-bold text-emerald-100/80">
                                    {languageLink.href}
                                  </span>
                                </Link>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-5">
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-200/70">
                        고객 전달용 링크팩 · 위험성평가 공유확인 운영팩 · 관리자 확인용
                      </p>
                      <div className="mt-2 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {createdLinkPackGroups.managerLinkPack.map((link) => (
                          <div
                            key={link.label}
                            className="rounded-2xl border border-emerald-300/40 bg-slate-950/40 p-4 text-sm font-bold text-emerald-50"
                          >
                            <span className="block text-base font-black">{link.label}</span>
                            <span className="mt-2 block text-xs leading-5 text-emerald-100/70">
                              {link.description}
                            </span>
                            <div className="mt-3 space-y-1.5">
                              {link.languageLinks.map((languageLink) => (
                                <Link
                                  key={languageLink.code}
                                  href={languageLink.href}
                                  className="flex items-center gap-2 rounded-xl border border-emerald-300/30 bg-slate-950/30 px-3 py-2 hover:border-emerald-200"
                                >
                                  <span className="shrink-0 rounded-full bg-emerald-400/20 px-2 py-0.5 text-[0.62rem] font-black text-emerald-200">
                                    {languageLink.label}
                                  </span>
                                  <span className="truncate text-[0.7rem] font-bold text-emerald-100/80">
                                    {languageLink.href}
                                  </span>
                                </Link>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : null}
              </>
            )}
          </section>
        ) : null}

        <div className="mt-6 grid gap-5 lg:grid-cols-[1.35fr_0.9fr]">
          <form action="/api/owner/tenant-onboarding/create" method="post" className="rounded-3xl border border-slate-800 bg-white p-6 text-slate-950">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black">고객코드 생성 전 검토</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  아래 값을 확인한 뒤 신규 위험성평가 공유확인 운영팩 고객사 코드와 운영 링크팩을 생성합니다.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                내부 생성
              </span>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {basicFields.map((field) => (
                <label key={field.name} className="block">
                  <span className="text-sm font-black text-slate-800">{field.label}</span>
                  <input
                    name={field.name}
                    defaultValue={field.value}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-emerald-400 focus:bg-white"
                  />
                  <span className="mt-2 block text-xs leading-5 text-slate-500">{field.help}</span>
                </label>
              ))}
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {selectFields.map((field) => (
                <label key={field.name} className="block">
                  <span className="text-sm font-black text-slate-800">{field.label}</span>
                  <select
                    name={field.name}
                    defaultValue={field.options[0]}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-emerald-400 focus:bg-white"
                  >
                    {field.options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <span className="mt-2 block text-xs leading-5 text-slate-500">{field.help}</span>
                </label>
              ))}
            </div>

            <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-base font-black">사용 모듈 후보</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                계약 범위와 현장 운영 목적에 맞는 모듈만 먼저 선택합니다.
              </p>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {moduleOptions.map((moduleName, index) => (
                  <label
                    key={moduleName}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-black text-slate-700"
                  >
                    <input type="checkbox" defaultChecked={index < 3} />
                    {moduleName}
                  </label>
                ))}
              </div>
            </div>

            <label className="mt-6 block">
              <span className="text-sm font-black text-slate-800">내부 운영 메모</span>
              <textarea
                name="owner_notes"
                defaultValue="신규업체 개설 전 내부 검토 메모입니다. 고객 민감정보나 민감한 인증값은 입력하지 않습니다."
                className="mt-2 min-h-28 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold leading-6 text-slate-800 outline-none focus:border-emerald-400 focus:bg-white"
              />
            </label>

            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
              생성 시 위험성평가 공유확인 운영팩 고객사 코드와 운영 링크팩 기준정보가 저장됩니다. 실제 고객 민감정보, 인증정보, 비밀번호, 민감한 인증값은 입력하지 않습니다.
            </div>

            <button
              type="submit"
              className="mt-5 w-full rounded-2xl bg-emerald-400 px-5 py-4 text-sm font-black text-slate-950 hover:bg-emerald-300"
            >
              위험성평가 공유확인 운영팩 고객사 코드 생성 및 링크팩 발급
            </button>
          </form>

          <aside className="space-y-5">
            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-lg font-black">생성 전 검토 요약</h2>
              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-800">
                {미리보기Rows.map(([key, value]) => (
                  <div
                    key={key}
                    className="grid grid-cols-[0.85fr_1.15fr] border-b border-slate-800 last:border-b-0"
                  >
                    <div className="bg-slate-950 px-4 py-3 text-xs font-black text-slate-400">
                      {key}
                    </div>
                    <div className="bg-slate-900 px-4 py-3 text-xs font-bold leading-5 text-slate-200">
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-lg font-black">저장 전 확인</h2>
              <div className="mt-4 space-y-3">
                {[
                  "내부 운영자 승인 후에만 고객사 단위로 개설합니다.",
                  "근로자·외부인 QR에는 로그인을 강제하지 않습니다.",
                  "기존 고객 route와 저장 흐름은 강제 변경하지 않습니다.",
                  "고객사 코드는 내부 운영자 승인 후 운영 기준정보로 저장합니다.",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm leading-6 text-slate-300"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>

        {membershipStatus || activationStatus || actionErrorCode ? (
          <section
            className={[
              "mt-6 rounded-3xl border p-5",
              actionErrorCode
                ? "border-rose-500/40 bg-rose-500/10 text-rose-100"
                : "border-emerald-500/40 bg-emerald-500/10 text-emerald-100",
            ].join(" ")}
          >
            <p className="text-sm font-black">
              {actionErrorCode
                ? commercialActionErrorMessages[actionErrorCode] ?? "요청을 처리하지 못했습니다."
                : membershipStatus === "created"
                  ? "관리자 멤버십이 연결되었습니다."
                  : membershipStatus === "already_exists"
                    ? "이미 등록된 관리자 멤버십입니다."
                    : activationStatus === "activated"
                      ? "고객사가 활성화되었습니다."
                      : activationStatus === "already_active"
                        ? "이미 활성화된 고객사입니다."
                        : "요청을 처리했습니다."}
            </p>
          </section>
        ) : null}

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <form
            action="/api/owner/tenant-onboarding/membership/create"
            method="post"
            className="rounded-3xl border border-slate-800 bg-white p-6 text-slate-950"
          >
            <h2 className="text-xl font-black">관리자 멤버십 연결</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              이 작업은 로그인 권한 원장을 연결하며, Auth 계정이나 비밀번호를 자동 생성하지 않습니다.
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              활성 상태는 Supabase Auth 계정과 이메일 확인을 별도로 완료한 경우에만 선택합니다.
            </p>

            <div className="mt-5 grid gap-4">
              <label className="block">
                <span className="text-sm font-black text-slate-800">고객사 코드</span>
                <input
                  name="company_code"
                  defaultValue={createdCompanyCode}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-emerald-400 focus:bg-white"
                />
              </label>

              <label className="block">
                <span className="text-sm font-black text-slate-800">관리자 이메일</span>
                <input
                  name="manager_email"
                  type="email"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-emerald-400 focus:bg-white"
                />
              </label>

              <label className="block">
                <span className="text-sm font-black text-slate-800">관리자 표시명</span>
                <input
                  name="display_name"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-emerald-400 focus:bg-white"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-black text-slate-800">역할</span>
                  <select
                    name="role"
                    defaultValue="tenant_manager"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-emerald-400 focus:bg-white"
                  >
                    <option value="tenant_admin">tenant_admin</option>
                    <option value="tenant_manager">tenant_manager</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-black text-slate-800">멤버십 상태</span>
                  <select
                    name="membership_status"
                    defaultValue="invited"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-emerald-400 focus:bg-white"
                  >
                    <option value="invited">invited</option>
                    <option value="active">active</option>
                  </select>
                </label>
              </div>

              <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-700">
                <input type="checkbox" name="auth_account_confirmed" value="1" className="mt-0.5" />
                Supabase Auth 계정과 이메일 확인을 별도로 완료했습니다. (활성 상태 선택 시 필수)
              </label>
            </div>

            <button
              type="submit"
              className="mt-5 w-full rounded-2xl bg-emerald-400 px-5 py-4 text-sm font-black text-slate-950 hover:bg-emerald-300"
            >
              관리자 멤버십 연결
            </button>
          </form>

          <div className="flex flex-col gap-5">
            <form
              action="/api/owner/tenant-onboarding/activate"
              method="post"
              className="rounded-3xl border border-slate-800 bg-white p-6 text-slate-950"
            >
              <h2 className="text-xl font-black">고객 운영 상태 활성화</h2>

              <label className="mt-5 block">
                <span className="text-sm font-black text-slate-800">고객사 코드</span>
                <input
                  name="company_code"
                  defaultValue={createdCompanyCode}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-emerald-400 focus:bg-white"
                />
              </label>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-black text-slate-800">필수 확인</p>
                <ul className="mt-2 space-y-1.5 text-xs font-bold leading-5 text-slate-600">
                  <li>- 기본 현장명</li>
                  <li>- 활성 관리자 멤버십</li>
                  <li>- 운영자 최종 확인</li>
                </ul>
              </div>

              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
                활성화 후 Public QR route가 열릴 수 있습니다. 실제 위험성평가 공유본과 현장 안내
                준비가 끝나기 전에는 고객에게 QR을 배포하지 않습니다.
              </div>

              <button
                type="submit"
                className="mt-5 w-full rounded-2xl bg-emerald-400 px-5 py-4 text-sm font-black text-slate-950 hover:bg-emerald-300"
              >
                활성화
              </button>
            </form>
          </div>
        </div>

        {siteAction || siteActionError || siteWarning ? (
          <section
            className={[
              "mt-6 rounded-3xl border p-5",
              siteActionError
                ? "border-rose-500/40 bg-rose-500/10 text-rose-100"
                : "border-emerald-500/40 bg-emerald-500/10 text-emerald-100",
            ].join(" ")}
          >
            <p className="text-sm font-black">
              {siteActionError
                ? siteActionErrorMessages[siteActionError] ?? "요청을 처리하지 못했습니다."
                : siteAction
                  ? siteActionSuccessMessages[siteAction] ?? "요청을 처리했습니다."
                  : `고객사가 생성되었지만 기본사업장 연결 확인이 필요합니다: ${siteActionErrorMessages[siteWarning] ?? siteWarning}`}
            </p>
          </section>
        ) : null}

        <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-black text-white">
            사업장 관리 (Company/Site Operational Profile)
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            고객사 코드를 입력한 뒤 사업장 목록을 확인하고 기본사업장·운영 프로필을 관리합니다.
            여러 사업장이 있어도 관리자 화면에는 사업장 전환 기능을 만들지 않습니다.
          </p>

          <form method="get" className="mt-4 flex flex-wrap gap-3">
            <input
              name="companyCode"
              defaultValue={createdCompanyCode}
              placeholder="고객사 코드"
              className="min-w-[200px] flex-1 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none focus:border-emerald-400"
            />
            <button
              type="submit"
              className="rounded-2xl border border-slate-700 px-4 py-3 text-sm font-black text-slate-200 hover:bg-slate-800"
            >
              사업장 목록 불러오기
            </button>
          </form>

          {createdCompanyCode ? (
            <div className="mt-5 space-y-4">
              {siteListResult && !siteListResult.ok ? (
                <p className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm font-bold text-amber-200">
                  사업장 목록 조회 상태를 확인해 주세요. ({siteActionErrorMessages[siteListResult.reason] ?? siteListResult.reason})
                </p>
              ) : tenantSites.length === 0 ? (
                <p className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm font-bold text-slate-400">
                  등록된 사업장이 없습니다.
                </p>
              ) : (
                tenantSites.map((site) => (
                  <div key={site.id} className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-black text-white">{site.siteName}</span>
                      {site.isDefault ? (
                        <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-[0.65rem] font-black text-emerald-300">
                          기본사업장
                        </span>
                      ) : null}
                      <span
                        className={
                          site.status === "active"
                            ? "rounded-full bg-slate-700 px-2 py-0.5 text-[0.65rem] font-black text-slate-200"
                            : "rounded-full bg-rose-500/20 px-2 py-0.5 text-[0.65rem] font-black text-rose-200"
                        }
                      >
                        {site.status === "active" ? "운영중" : "보관됨"}
                      </span>
                    </div>

                    <dl className="mt-3 grid gap-2 text-xs font-bold text-slate-400 md:grid-cols-2">
                      <div>
                        <dt className="text-slate-500">업종 프로필</dt>
                        <dd className="text-slate-200">{site.industryProfile ?? "미확인"}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">근로자 규모</dt>
                        <dd className="text-slate-200">{site.workerCountBand ?? "미확인"}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">외부 인력 사용</dt>
                        <dd className="text-slate-200">
                          {site.usesExternalWorkforce === null
                            ? "미확인"
                            : site.usesExternalWorkforce
                              ? "예"
                              : "아니오"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">근로자대표 존재</dt>
                        <dd className="text-slate-200">
                          {site.hasWorkerRepresentative === null
                            ? "미확인"
                            : site.hasWorkerRepresentative
                              ? "예"
                              : "아니오"}
                        </dd>
                      </div>
                      <div className="md:col-span-2">
                        <dt className="text-slate-500">주요 공정</dt>
                        <dd className="text-slate-200">{site.majorProcesses?.join(", ") ?? "미확인"}</dd>
                      </div>
                      <div className="md:col-span-2">
                        <dt className="text-slate-500">주요 설비</dt>
                        <dd className="text-slate-200">{site.majorEquipment?.join(", ") ?? "미확인"}</dd>
                      </div>
                    </dl>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {!site.isDefault && site.status === "active" ? (
                        <form action="/api/owner/tenant-onboarding/sites" method="post">
                          <input type="hidden" name="action" value="set_default" />
                          <input type="hidden" name="company_code" value={createdCompanyCode} />
                          <input type="hidden" name="site_id" value={site.id} />
                          <button
                            type="submit"
                            className="rounded-xl border border-emerald-400/50 px-3 py-2 text-xs font-black text-emerald-300 hover:bg-emerald-400/10"
                          >
                            기본사업장으로 지정
                          </button>
                        </form>
                      ) : null}

                      <form action="/api/owner/tenant-onboarding/sites" method="post">
                        <input type="hidden" name="action" value="set_status" />
                        <input type="hidden" name="company_code" value={createdCompanyCode} />
                        <input type="hidden" name="site_id" value={site.id} />
                        <input
                          type="hidden"
                          name="status"
                          value={site.status === "active" ? "archived" : "active"}
                        />
                        <button
                          type="submit"
                          className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-black text-slate-300 hover:bg-slate-800"
                        >
                          {site.status === "active" ? "보관 처리" : "다시 운영중으로"}
                        </button>
                      </form>
                    </div>

                    <details className="mt-4">
                      <summary className="cursor-pointer text-xs font-black text-slate-400">
                        운영 프로필 수정
                      </summary>
                      <form
                        action="/api/owner/tenant-onboarding/sites"
                        method="post"
                        className="mt-3 grid gap-3"
                      >
                        <input type="hidden" name="action" value="update_profile" />
                        <input type="hidden" name="company_code" value={createdCompanyCode} />
                        <input type="hidden" name="site_id" value={site.id} />

                        <label className="block">
                          <span className="text-xs font-black text-slate-400">사업장명</span>
                          <input
                            name="site_name"
                            defaultValue={site.siteName}
                            className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-bold text-white outline-none focus:border-emerald-400"
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs font-black text-slate-400">업종 프로필</span>
                          <input
                            name="industry_profile"
                            defaultValue={site.industryProfile ?? ""}
                            className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-bold text-white outline-none focus:border-emerald-400"
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs font-black text-slate-400">근로자 규모</span>
                          <input
                            name="worker_count_band"
                            defaultValue={site.workerCountBand ?? ""}
                            className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-bold text-white outline-none focus:border-emerald-400"
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs font-black text-slate-400">
                            주요 공정 (줄바꿈으로 구분, 최대 20개)
                          </span>
                          <textarea
                            name="major_processes"
                            defaultValue={site.majorProcesses?.join("\n") ?? ""}
                            className="mt-1 min-h-20 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-bold text-white outline-none focus:border-emerald-400"
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs font-black text-slate-400">
                            주요 설비 (줄바꿈으로 구분, 최대 20개)
                          </span>
                          <textarea
                            name="major_equipment"
                            defaultValue={site.majorEquipment?.join("\n") ?? ""}
                            className="mt-1 min-h-20 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-bold text-white outline-none focus:border-emerald-400"
                          />
                        </label>
                        <div className="grid gap-3 md:grid-cols-2">
                          <label className="block">
                            <span className="text-xs font-black text-slate-400">외부 인력 사용</span>
                            <select
                              name="uses_external_workforce"
                              defaultValue={
                                site.usesExternalWorkforce === null
                                  ? "unset"
                                  : String(site.usesExternalWorkforce)
                              }
                              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-bold text-white outline-none focus:border-emerald-400"
                            >
                              <option value="unset">미확인</option>
                              <option value="true">예</option>
                              <option value="false">아니오</option>
                            </select>
                          </label>
                          <label className="block">
                            <span className="text-xs font-black text-slate-400">근로자대표 존재</span>
                            <select
                              name="has_worker_representative"
                              defaultValue={
                                site.hasWorkerRepresentative === null
                                  ? "unset"
                                  : String(site.hasWorkerRepresentative)
                              }
                              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-bold text-white outline-none focus:border-emerald-400"
                            >
                              <option value="unset">미확인</option>
                              <option value="true">예</option>
                              <option value="false">아니오</option>
                            </select>
                          </label>
                        </div>
                        <button
                          type="submit"
                          className="rounded-xl bg-emerald-400 px-4 py-2 text-xs font-black text-slate-950 hover:bg-emerald-300"
                        >
                          프로필 저장
                        </button>
                      </form>
                    </details>
                  </div>
                ))
              )}

              <details className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <summary className="cursor-pointer text-sm font-black text-emerald-300">
                  + 새 사업장 추가
                </summary>
                <form action="/api/owner/tenant-onboarding/sites" method="post" className="mt-4 grid gap-3">
                  <input type="hidden" name="action" value="create" />
                  <input type="hidden" name="company_code" value={createdCompanyCode} />
                  <label className="block">
                    <span className="text-xs font-black text-slate-400">사업장명</span>
                    <input
                      name="site_name"
                      className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-bold text-white outline-none focus:border-emerald-400"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-black text-slate-400">업종 프로필</span>
                    <input
                      name="industry_profile"
                      className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-bold text-white outline-none focus:border-emerald-400"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-black text-slate-400">근로자 규모</span>
                    <input
                      name="worker_count_band"
                      className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-bold text-white outline-none focus:border-emerald-400"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-black text-slate-400">
                      주요 공정 (줄바꿈으로 구분, 최대 20개)
                    </span>
                    <textarea
                      name="major_processes"
                      className="mt-1 min-h-20 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-bold text-white outline-none focus:border-emerald-400"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-black text-slate-400">
                      주요 설비 (줄바꿈으로 구분, 최대 20개)
                    </span>
                    <textarea
                      name="major_equipment"
                      className="mt-1 min-h-20 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-bold text-white outline-none focus:border-emerald-400"
                    />
                  </label>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="block">
                      <span className="text-xs font-black text-slate-400">외부 인력 사용</span>
                      <select
                        name="uses_external_workforce"
                        defaultValue="unset"
                        className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-bold text-white outline-none focus:border-emerald-400"
                      >
                        <option value="unset">미확인</option>
                        <option value="true">예</option>
                        <option value="false">아니오</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-xs font-black text-slate-400">근로자대표 존재</span>
                      <select
                        name="has_worker_representative"
                        defaultValue="unset"
                        className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-bold text-white outline-none focus:border-emerald-400"
                      >
                        <option value="unset">미확인</option>
                        <option value="true">예</option>
                        <option value="false">아니오</option>
                      </select>
                    </label>
                  </div>
                  <button
                    type="submit"
                    className="rounded-xl bg-emerald-400 px-4 py-3 text-sm font-black text-slate-950 hover:bg-emerald-300"
                  >
                    사업장 추가
                  </button>
                </form>
              </details>
            </div>
          ) : (
            <p className="mt-4 text-sm font-bold text-slate-500">
              고객사 코드를 입력하면 사업장 목록이 표시됩니다.
            </p>
          )}
        </div>

        <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-900 p-5 text-xs leading-6 text-slate-400">
          이 화면은 내부 운영자 검토 화면입니다. 실제 고객자료, 민감한 인증값, 비밀번호, 근로자 개인정보를 입력하지 않습니다.
        </div>
      </section>
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
        <p className="text-sm font-black text-emerald-700">저장 전 검토 기준</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
          신규 고객사 개설 전 확인할 항목입니다
        </h2>
        <p className="mt-3 text-sm font-semibold leading-6 text-slate-700">
          이 카드는 내부 운영자가 신규 고객사 정보를 저장하기 전에 확인해야 할 기준을 보여주는 안내입니다.
          저장 후 고객사 코드 기준 운영 링크팩을 발급합니다. 메일 발송 자동화나 사용자 자동 가입은 연결하지 않습니다.
        </p>

        <div className="mt-4 rounded-2xl border border-white/80 bg-white p-4">
          <p className="text-sm font-black text-slate-800">
            샘플 검토 상태
          </p>
          {ownerDraftValidationPreview.ok ? (
            <p className="mt-2 text-sm font-bold leading-6 text-emerald-800">
              현재 샘플 기준으로 고객사 코드, 표시명, 서비스 모드, 사용 모듈, 관리자 이메일, 역할, 상태 값이 저장 전 검토 기준을 통과했습니다.
            </p>
          ) : (
            <ul className="mt-2 space-y-2 text-sm font-bold leading-6 text-rose-800">
              {ownerDraftValidationMessages.map((message) => (
                <li key={message}>- {message}</li>
              ))}
            </ul>
          )}
        </div>

        <p className="mt-4 text-xs font-bold leading-5 text-slate-500">
          이 단계는 고객사 코드와 운영 링크팩 생성까지만 수행합니다. 로그인 계정 자동 생성이나 이메일 발송 자동화는 연결하지 않습니다.
        </p>
      </section>


    </main>
  );
}
