import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getOwnerTenantOnboardingValidationMessages,
  validateOwnerTenantOnboardingDraft,
} from "@/lib/tenant-onboarding/ownerTenantOnboardingValidation";

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
    help: "현재 생성은 위공팩 고객코드와 운영 링크팩 발급 기준으로 처리합니다.",
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
      label: "관리자 홈",
      href: `/manager/risk-share?company=${encodedCode}`,
      description: "관리자가 공유확인, 의견, 검토 대기, 월간 결과물을 확인합니다.",
    },
    {
      label: "월간 결과물",
      href: `/monthly-report/risk-share?company=${encodedCode}`,
      description: "월간 안전운영 결과물과 고객 전달자료를 확인합니다.",
    },
  ];
}

function buildRiskShareLinkPack(companyCode: string) {
  const encodedCode = encodeURIComponent(companyCode);

  return [
    {
      label: "현장 QR 입구",
      href: `/risk-share/field?company=${encodedCode}`,
      description: "근로자와 외부인이 공유확인, 작업 전 확인, 익명 의견 입구를 선택합니다.",
    },
    {
      label: "위험성평가 공유확인",
      href: `/risk-share/participation?company=${encodedCode}&mode=monthly`,
      description: "이번 달 공유된 위험요인과 안전조치를 확인합니다.",
    },
    {
      label: "작업 전 안전확인",
      href: `/risk-share/participation?company=${encodedCode}&mode=prework`,
      description: "작업 전 보호구, 동선, 적재·하역, 설비 주변 주의사항을 확인합니다.",
    },
    {
      label: "익명 의견함",
      href: `/risk-share/anonymous?company=${encodedCode}`,
      description: "이름 없이 의견, 아차사고, 개선제안을 남깁니다.",
    },
    {
      label: "외부인 출입 전 안전 안내",
      href: `/risk-share/visitor?company=${encodedCode}`,
      description: "방문·납품·협력업체가 출입 전 안전 안내를 확인합니다.",
    },
  ];
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
  const createdOwnerLinks = createdCompanyCode
    ? buildOwnerOnlyLinks(createdCompanyCode)
    : [];
  const createdLinkPack = createdCompanyCode
    ? buildRiskShareLinkPack(createdCompanyCode)
    : [];

  const c = await cookies();
  const ownerToken = c.get("sm_owner_token")?.value;

  if (!isOwnerTokenValid(ownerToken)) {
    redirect("/login?error=owner_required");
  }

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
                    운영자 전용
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

                <div className="mt-5">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-200/70">
                    고객 전달용 링크팩 · 위험성평가 공유확인 운영팩
                  </p>
                  <div className="mt-2 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {createdLinkPack.map((link) => (
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
                  아래 값을 확인한 뒤 신규 위공팩 고객사 코드와 운영 링크팩을 생성합니다.
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
              생성 시 위공팩 고객사 코드와 운영 링크팩 기준정보가 저장됩니다. 실제 고객 민감정보, 인증정보, 비밀번호, 민감한 인증값은 입력하지 않습니다.
            </div>

            <button
              type="submit"
              className="mt-5 w-full rounded-2xl bg-emerald-400 px-5 py-4 text-sm font-black text-slate-950 hover:bg-emerald-300"
            >
              위공팩 고객사 코드 생성 및 링크팩 발급
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
