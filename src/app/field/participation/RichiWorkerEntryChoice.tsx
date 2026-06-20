type RichiWorkerEntryChoiceProps = {
  companyCode: string;
};

export default function RichiWorkerEntryChoice({ companyCode }: RichiWorkerEntryChoiceProps) {
  const signedHref = `/field/participation?company=${encodeURIComponent(companyCode)}&flow=signed`;
  const anonymousHref = `/field/anonymous-feedback?company=${encodeURIComponent(companyCode)}`;

  return (
    <main className="min-h-[100dvh] bg-white px-0 py-0 text-[#0B2742] sm:bg-[#EEF1F4] sm:px-3 sm:py-5">
      <section className="mx-auto flex min-h-[100dvh] w-full max-w-none flex-col bg-white sm:min-h-[calc(100dvh-40px)] sm:max-w-[430px] sm:rounded-[28px] sm:shadow-[0_18px_50px_rgba(11,39,66,0.14)]">
        <header className="border-b border-[#E3E7EC] px-5 pb-5 pt-[max(18px,env(safe-area-inset-top))]">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#EAF8F3] text-[#16A085]">
              <svg aria-hidden="true" viewBox="0 0 32 32" className="h-5 w-5" fill="none">
                <path d="M16 4.5c3.8 3.2 7.2 3.9 10.5 4.1v6.3c0 6.5-4.1 10.7-10.5 12.6C9.6 25.6 5.5 21.4 5.5 14.9V8.6C8.8 8.4 12.2 7.7 16 4.5Z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
                <path d="M11.2 16.1l3.1 3.1 6.6-7.1" stroke="#0B2742" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <div>
              <p className="text-[13px] font-black leading-none text-[#0B2742]">SafeMetrica 세이프메트리카</p>
              <p className="mt-1 text-[11px] font-bold text-[#16A085]">리치코리아 현장 QR</p>
            </div>
          </div>

          <h1 className="mt-5 text-[24px] font-black tracking-[-0.04em] text-[#0B2742]">
            현장 기록 선택
          </h1>
          <p className="mt-2 text-[15px] leading-7 text-[#64748B]">
            작업 전 확인기록과 익명 의견은 서로 다른 방식으로 저장됩니다.
          </p>
        </header>

        <section className="flex-1 px-5 py-5">
          <a
            href={signedHref}
            className="block w-full rounded-[24px] border border-[#BCE3D6] bg-[#EAF8F3] p-5 shadow-sm active:scale-[0.99]"
          >
            <p className="text-xs font-black text-[#16A085]">실명 확인기록</p>
            <h2 className="mt-2 text-xl font-black tracking-[-0.03em] text-[#0B2742]">
              작업 전 확인·서명
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#1C3A57]">
              작업 전 위생·안전 확인 후 회사 내부 확인기록으로 저장합니다.
            </p>
            <ul className="mt-4 space-y-2 text-sm font-bold text-[#0B2742]">
              <li>· 확인정보 입력</li>
              <li>· 모바일 자필 확인서명</li>
              <li>· 전자확인 원장 저장</li>
            </ul>
          </a>

          <a
            href={anonymousHref}
            className="mt-4 block w-full rounded-[24px] border border-[#D8DEE6] bg-white p-5 shadow-sm active:scale-[0.99]"
          >
            <p className="text-xs font-black text-[#64748B]">익명 의견</p>
            <h2 className="mt-2 text-xl font-black tracking-[-0.03em] text-[#0B2742]">
              익명 의견
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#52606D]">
              불편사항이나 개선의견만 익명으로 접수합니다.
            </p>
            <ul className="mt-4 space-y-2 text-sm font-bold text-[#0B2742]">
              <li>· 개인 식별정보 입력 없음</li>
              <li>· 확인서명 없음</li>
              <li>· 관리자 검토대상으로 접수</li>
            </ul>
          </a>

          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-black text-amber-900">구분 기준</p>
            <p className="mt-2 text-sm leading-6 text-amber-800">
              작업 전 확인은 확인자 정보와 확인서명이 필요한 내부 확인기록입니다. 익명 의견은 별도 경로로 분리해 접수합니다.
            </p>
          </div>
        </section>
      </section>
    </main>
  );
}
