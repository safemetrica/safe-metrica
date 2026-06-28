import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "신규업체 기본정보 입력 준비 | SafeMetrica",
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
    label: "서비스 모드",
    name: "service_mode",
    options: ["전체 운영형", "공유확인팩", "시범 운영"],
    help: "Full 운영형, 공유팩, 시범 운영 중 하나로 정리합니다.",
  },
  {
    label: "과금 구분",
    name: "plan_type",
    options: ["시범 운영", "유료 운영", "내부 테스트"],
    help: "시범 운영, 유료 운영, 내부 테스트를 구분합니다.",
  },
  {
    label: "상태",
    name: "status",
    options: ["작성 중", "시범 운영", "운영 중", "중지"],
    help: "현재 화면은 작성 중 상태 후보만 정리합니다.",
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

const 미리보기Rows = [
  ["고객사 코드", "hyundai-hoist"],
  ["고객사명", "(주)현대호이스트"],
  ["상태", "작성 중"],
  ["서비스 범위", "trial"],
  ["사용 모듈", "근로자 QR, 빠른 의견, 관리자 접수함"],
];


function isOwnerTokenValid(ownerToken?: string) {
  const expectedToken = process.env.SAFEMETRICA_OWNER_TOKEN;
  return Boolean(expectedToken && ownerToken === expectedToken);
}

export default async function OwnerTenantRegistryDraftPage() {
  const c = await cookies();
  const ownerToken = c.get("sm_owner_token")?.value;

  if (!isOwnerTokenValid(ownerToken)) {
    redirect("/login?error=owner_required");
  }

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-white">
      <section className="mx-auto max-w-6xl">
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
          이 화면은 내부 운영자 입력 준비화면입니다. 입력값은 저장되지 않는 미리보기이며,
          실제 고객자료·인증정보·비밀번호·토큰은 입력하지 않습니다.
        </div>

        <div className="mt-5 flex flex-col gap-5 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-300">
              내부 운영 · 고객사 기본정보
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
              신규업체 기본정보 입력 준비
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
              신규 고객사 개설 전에 내부 운영자가 확인할 기본값을 정리하는 미리보기 화면입니다.
              실제 고객사 생성, 저장 기능, 인증 연결은 후속 단계에서 진행합니다.
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

        <div className="mt-6 grid gap-5 lg:grid-cols-[1.35fr_0.9fr]">
          <section className="rounded-3xl border border-slate-800 bg-white p-6 text-slate-950">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black">기본정보 후보</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  아래 값은 신규업체 개설 전 검토용 예시입니다. 저장 버튼은 아직 연결하지 않습니다.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                저장 안 됨
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
              <span className="text-sm font-black text-slate-800">내부 운영자 내부 메모</span>
              <textarea
                name="owner_notes"
                defaultValue="신규업체 개설 전 내부 검토 메모입니다. 고객 민감정보나 인증정보는 입력하지 않습니다."
                className="mt-2 min-h-28 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold leading-6 text-slate-800 outline-none focus:border-emerald-400 focus:bg-white"
              />
            </label>

            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
              현재 화면은 저장되지 않는 미리보기입니다. 입력값은 저장되지 않고, 고객사 기본정보에 저장하지 않습니다.
            </div>
          </section>

          <aside className="space-y-5">
            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-lg font-black">미리보기 요약</h2>
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
                  "실제 저장 기능은 별도 PR에서 검증 후 연결합니다.",
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
          이 화면은 내부 운영자 입력 준비화면입니다. 실제 고객자료, 토큰, 인증키, 비밀번호, 근로자 개인정보를 입력하지 않습니다.
        </div>
      </section>
    </main>
  );
}
