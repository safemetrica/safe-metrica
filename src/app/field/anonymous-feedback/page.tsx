import type { Metadata } from "next";
import { getTenantRegistryConfigByCode } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

const ALLOWED_ANONYMOUS_FEEDBACK_COMPANY_CODES = new Set(["richi", "bubblemon"]);


type PageProps = {
  searchParams?: Promise<{
    company?: string | string[];
  }>;
};

function readSearchParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function normalizeCompanyCode(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 50);
}

function isRiskShareAnonymousFeedbackTenant(serviceMode?: string | null) {
  return serviceMode === "risk_share_pack" || serviceMode === "full_safemetrica";
}

export default async function AnonymousFeedbackPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const companyCode = normalizeCompanyCode(readSearchParam(params.company));
  const isRichi = companyCode === "richi";
  const isBubblemon = companyCode === "bubblemon";
  const tenant =
    companyCode && !isRichi && !isBubblemon
      ? await getTenantRegistryConfigByCode(companyCode).catch(() => null)
      : null;
  const isRegisteredRiskShareTenant = isRiskShareAnonymousFeedbackTenant(
    tenant?.serviceMode,
  );
  const isAllowedCompany =
    ALLOWED_ANONYMOUS_FEEDBACK_COMPANY_CODES.has(companyCode) ||
    isRegisteredRiskShareTenant;
  const feedbackTitle = isRichi
    ? "㈜리치코리아 익명 의견"
    : isBubblemon
      ? "㈜버블몬코리아 익명 의견"
      : tenant?.name
        ? `${tenant.name} 익명 의견`
        : "익명 현장 의견";
  const returnHref = isRegisteredRiskShareTenant
    ? `/risk-share/field?company=${encodeURIComponent(companyCode)}`
    : `/field/participation?company=${encodeURIComponent(companyCode)}`;
  const returnLabel = isRegisteredRiskShareTenant
    ? "현장 QR 입구로 돌아가기"
    : "{returnLabel}";

  if (!isAllowedCompany) {
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-[#EEF1F4] px-5 py-8 text-[#0B2742]">
        <section className="w-full max-w-[430px] rounded-[28px] bg-white p-6 shadow-[0_18px_50px_rgba(11,39,66,0.14)]">
          <p className="text-[13px] font-black text-[#16A085]">SafeMetrica 세이프메트리카</p>
          <h1 className="mt-3 text-[22px] font-black tracking-[-0.04em]">
            익명 의견 접수 화면을 열 수 없습니다.
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#64748B]">
            현재 이 익명 의견 경로는 지정된 현장 QR에서만 사용할 수 있습니다.
          </p>
          {companyCode ? (
            <a
              href={returnHref}
              className="mt-5 block rounded-full bg-[#0B2742] px-5 py-3 text-center text-sm font-black text-white"
            >
              {returnLabel}
            </a>
          ) : null}
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-white px-0 py-0 text-[#0B2742] sm:bg-[#EEF1F4] sm:px-3 sm:py-5">
      <form
        action="/api/field/anonymous-feedback/submit"
        method="post"
        encType="multipart/form-data"
        className="mx-auto flex min-h-[100dvh] w-full max-w-none flex-col bg-white sm:min-h-[calc(100dvh-40px)] sm:max-w-[430px] sm:rounded-[28px] sm:shadow-[0_18px_50px_rgba(11,39,66,0.14)]"
      >
        <input type="hidden" name="companyCode" value={companyCode} readOnly />
        <input type="hidden" name="identityMode" value="anonymous" readOnly />
        <input type="hidden" name="anonymous" value="true" readOnly />
        <input type="hidden" name="source" value="anonymous_worker_feedback_v1" readOnly />

        <header className="border-b border-[#E3E7EC] px-5 pb-4 pt-[max(18px,env(safe-area-inset-top))]">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#EAF8F3] text-[#16A085]">
              <svg aria-hidden="true" viewBox="0 0 32 32" className="h-5 w-5" fill="none">
                <path d="M16 4.5c3.8 3.2 7.2 3.9 10.5 4.1v6.3c0 6.5-4.1 10.7-10.5 12.6C9.6 25.6 5.5 21.4 5.5 14.9V8.6C8.8 8.4 12.2 7.7 16 4.5Z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
                <path d="M11.2 16.1l3.1 3.1 6.6-7.1" stroke="#0B2742" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <div>
              <p className="text-[13px] font-black leading-none text-[#0B2742]">SafeMetrica 세이프메트리카</p>
              <p className="mt-1 text-[11px] font-bold text-[#16A085]">익명 현장 의견 접수</p>
            </div>
          </div>

          <h1 className="mt-4 text-[22px] font-black tracking-[-0.04em] text-[#0B2742]">
            {feedbackTitle}
          </h1>
          <p className="mt-2 text-[15px] leading-7 text-[#64748B]">
            개인 식별정보와 확인서명을 입력하지 않는 익명 접수 화면입니다. 현장에서 불편하거나 개선이 필요한 내용을 남겨주세요.
          </p>
        </header>

        <section className="flex-1 overflow-y-auto px-5 pb-28 pt-5">
          <div className="rounded-[20px] border border-[#BCE3D6] bg-[#EAF8F3] p-4">
            <p className="text-sm font-black text-[#108469]">익명 제출 기준</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-[#1C3A57]">
              <li>· 개인 식별정보와 확인서명 입력 없이 접수합니다.</li>
              <li>· 관리자는 접수 내용, 유형, 위치, 사진만 기준으로 검토합니다.</li>
              <li>· 허위·반복 제출은 운영상 검토 대상에서 제외될 수 있습니다.</li>
            </ul>
          </div>

          <label className="mt-5 block text-sm font-black text-[#0B2742]">
            유형 *
            <select
              name="feedbackType"
              required
              defaultValue="불편사항"
              className="mt-2 w-full rounded-2xl border border-[#E3E7EC] bg-white px-4 py-3 text-base font-bold text-[#0B2742] outline-none focus:border-[#16A085]"
            >
              <option value="불편사항">불편사항</option>
              <option value="개선제안">개선제안</option>
              <option value="위험제보">위험제보</option>
              <option value="아차사고">아차사고</option>
              <option value="기타">기타</option>
            </select>
          </label>

          <label className="mt-4 block text-sm font-black text-[#0B2742]">
            위치/구역
            <input
              name="location"
              placeholder={
                isRichi
                  ? "예: 포장실 입구 / 세척실 바닥"
                  : isBubblemon
                    ? "예: 창고 통로 / 입고장 / 포장구역"
                    : "예: 작업장 입구 / 통로"
              }
              className="mt-2 w-full rounded-2xl border border-[#E3E7EC] px-4 py-3 text-base text-[#0B2742] outline-none focus:border-[#16A085]"
            />
          </label>

          <label className="mt-4 block text-sm font-black text-[#0B2742]">
            내용 *
            <textarea
              name="content"
              required
              minLength={2}
              placeholder="불편하거나 개선이 필요한 내용을 적어주세요."
              rows={6}
              className="mt-2 w-full resize-none rounded-2xl border border-[#E3E7EC] px-4 py-3 text-base leading-7 text-[#0B2742] outline-none focus:border-[#16A085]"
            />
          </label>

          <label className="mt-4 block text-sm font-black text-[#0B2742]">
            사진 첨부
            <input
              name="evidenceFiles"
              type="file"
              accept="image/*"
              multiple
              className="mt-2 w-full rounded-2xl border border-dashed border-[#C7CFD8] bg-white px-4 py-3 text-sm text-[#64748B]"
            />
          </label>

          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-black text-amber-900">제출 전 확인</p>
            <p className="mt-2 text-sm leading-6 text-amber-800">
              이 화면은 익명 의견 접수용입니다. 작업 전 전자확인 기록은 별도 확인 화면에서 제출해야 합니다.
            </p>
          </div>
        </section>

        <footer className="sticky bottom-0 border-t border-[#E3E7EC] bg-white/95 px-5 py-4 backdrop-blur">
          <button
            type="submit"
            className="w-full rounded-full bg-[#0B2742] px-5 py-4 text-base font-black text-white"
          >
            익명 의견 제출 →
          </button>
          {companyCode ? (
            <a
              href={returnHref}
              className="mt-3 block w-full rounded-full px-5 py-3 text-center text-sm font-black text-[#64748B]"
            >
              {returnLabel}
            </a>
          ) : null}
        </footer>
      </form>
    </main>
  );
}
