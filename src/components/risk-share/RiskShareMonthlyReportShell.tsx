type RiskShareMonthlyReportShellProps = {
  companyLabel: string;
  periodLabel: string;
  periodRangeLabel: string;
  managerHref: string;
  fieldHref: string;
  monthlyCount: number;
  preworkCount: number;
  monthlyWorkerSignatureCount: number;
  preworkWorkerSignatureCount: number;
  anonymousCount: number;
  visitorCount: number;
  representativeCount: number;
  signatureConfirmedCount: number;
  signatureNotSubmittedCount: number;
};

function percent(value: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, (value / total) * 100));
}

function SidebarLink({ href, label, icon, active = false }: { href: string; label: string; icon: string; active?: boolean }) {
  return (
    <a
      href={href}
      className={
        active
          ? "flex items-center gap-3 rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-extrabold text-white"
          : "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-300 transition hover:bg-white/10 hover:text-white"
      }
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 text-[11px] font-black">
        {icon}
      </span>
      <span>{label}</span>
    </a>
  );
}

function ReportCard({ title, count, description }: { title: string; count: number; description: string }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <p className="text-xs font-extrabold text-blue-600">{title}</p>
      <p className="mt-3 flex items-baseline gap-1">
        <span className="text-4xl font-black tracking-tight text-slate-950">{count}</span>
        <span className="text-sm font-black text-slate-400">건</span>
      </p>
      <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">{description}</p>
    </article>
  );
}

function SummaryRow({ title, count, total }: { title: string; count: number; total: number }) {
  return (
    <div className="grid gap-3 border-b border-slate-100 px-5 py-4 last:border-b-0 md:grid-cols-[minmax(180px,250px)_1fr_56px] md:items-center">
      <p className="text-sm font-black text-slate-950">{title}</p>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <span className="block h-full rounded-full bg-blue-600" style={{ width: `${percent(count, total)}%` }} />
      </div>
      <p className="text-right text-base font-black text-slate-950">
        {count}
        <span className="ml-0.5 text-xs font-black text-slate-400">건</span>
      </p>
    </div>
  );
}

export default function RiskShareMonthlyReportShell({
  companyLabel,
  periodLabel,
  periodRangeLabel,
  managerHref,
  fieldHref,
  monthlyCount,
  preworkCount,
  monthlyWorkerSignatureCount,
  preworkWorkerSignatureCount,
  anonymousCount,
  visitorCount,
  representativeCount,
  signatureConfirmedCount,
  signatureNotSubmittedCount,
}: RiskShareMonthlyReportShellProps) {
  const totalCount = monthlyCount + preworkCount + anonymousCount + visitorCount + representativeCount;
  const fieldCount = monthlyCount + preworkCount;
  const workerSignatureConfirmedCount = monthlyWorkerSignatureCount + preworkWorkerSignatureCount;
  const workerSignatureNotSubmittedCount = Math.max(0, fieldCount - workerSignatureConfirmedCount);

  return (
    <main className="min-h-screen bg-[#F3F5F8] text-slate-950 lg:flex">
      <aside className="hidden w-[228px] shrink-0 flex-col bg-[#0E1F3D] px-3.5 py-5 text-white lg:sticky lg:top-0 lg:flex lg:h-screen">
        <div className="flex items-center gap-2 px-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-teal-400 text-sm font-black">S</span>
          <span className="text-base font-black tracking-tight">SafeMetrica</span>
        </div>
        <section className="mt-5 rounded-2xl bg-white/10 px-3 py-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">사업장</p>
          <p className="mt-1 text-sm font-black text-white">{companyLabel}</p>
          <p className="mt-0.5 text-xs font-semibold leading-5 text-slate-300">위험성평가 공유확인 운영팩</p>
        </section>
        <nav className="mt-5 space-y-1">
          <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">운영</p>
          <SidebarLink href={managerHref} label="대시보드" icon="대" />
          <SidebarLink href={fieldHref} label="현장 QR 입구" icon="QR" />
          <SidebarLink href="#" label="월간 안전운영 요약" icon="월" active />
        </nav>
        <p className="mt-auto border-t border-white/10 px-3 pt-4 text-xs font-semibold leading-5 text-slate-500">SafeMetrica 안전운영 기록</p>
      </aside>

      <section className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex min-h-14 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:px-7">
          <div>
            <p className="text-sm font-black text-slate-950">월간 안전운영 요약</p>
            <p className="text-xs font-semibold text-slate-500 lg:hidden">{companyLabel}</p>
          </div>
          <div className="hidden items-center gap-2 text-xs font-bold text-slate-500 sm:flex">
            <span>{periodLabel}</span>
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            <span>{companyLabel}</span>
          </div>
          <div className="ml-auto rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-700">관리자</div>
        </header>

        <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-6 px-4 py-6 lg:px-8">
          <section className="grid gap-6 rounded-[1.25rem] border border-slate-200 bg-white p-7 shadow-[0_1px_2px_rgba(15,23,42,0.04)] lg:grid-cols-[1fr_320px] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.08em] text-blue-600">{companyLabel}</p>
              <h1 className="mt-1 text-4xl font-black tracking-tight text-slate-950">월간 안전운영 요약</h1>
              <p className="mt-2 text-sm font-bold text-slate-500">{periodLabel} · {periodRangeLabel}</p>
              <p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-slate-500">이번 달 현장 공유·확인·의견 기록을 운영기록 관점에서 정리했습니다.</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <a href={managerHref} className="inline-flex min-h-10 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-black text-white transition hover:bg-blue-500">관리자 홈</a>
                <a href={fieldHref} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50">현장 QR 입구</a>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-2xl bg-slate-50 px-5 py-4"><p className="text-xs font-bold text-slate-500">이번 달 총 접수</p><p className="mt-1 text-2xl font-black text-slate-950">{totalCount}건</p></div>
              <div className="rounded-2xl bg-blue-50 px-5 py-4"><p className="text-xs font-bold text-blue-700">현장 확인</p><p className="mt-1 text-2xl font-black text-blue-950">{fieldCount}건</p></div>
              <div className="rounded-2xl bg-teal-50 px-5 py-4"><p className="text-xs font-bold text-teal-700">근로자 서명 포함</p><p className="mt-1 text-2xl font-black text-teal-950">{workerSignatureConfirmedCount}건</p></div>
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="flex min-w-0 flex-col gap-6">
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <p className="text-xs font-black uppercase tracking-[0.08em] text-blue-600">이번 달 한눈에 보기</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">공유·확인·의견 흐름 요약</h2>
                <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-slate-600">이번 달 현장 확인 {fieldCount}건, 익명 의견 {anonymousCount}건, 외부인 확인 {visitorCount}건, 근로자대표 확인 {representativeCount}건이 접수되었습니다.</p>
                <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">일반 근로자 서명 포함은 {workerSignatureConfirmedCount}건이며, 선택 서명 미제출 {workerSignatureNotSubmittedCount}건도 확인 기록으로 집계됩니다.</p>
                <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">근로자대표 확인 중 서명 포함은 {signatureConfirmedCount}건이며, 선택 서명 미제출 {signatureNotSubmittedCount}건도 확인 기록으로 집계됩니다.</p>
              </section>

              <section className="grid gap-5 md:grid-cols-2">
                <ReportCard title="위험성평가 공유확인" count={monthlyCount} description={`이번 달 공유확인 ${monthlyCount}건 중 서명 포함 ${monthlyWorkerSignatureCount}건입니다.`} />
                <ReportCard title="작업 전 안전확인" count={preworkCount} description={`이번 달 작업 전 확인 ${preworkCount}건 중 서명 포함 ${preworkWorkerSignatureCount}건입니다.`} />
                <ReportCard title="익명 의견 · 아차사고 · 개선제안" count={anonymousCount} description={`이번 달 접수된 익명 의견 ${anonymousCount}건입니다.`} />
                <ReportCard title="외부인 출입 전 안전확인" count={visitorCount} description={`이번 달 접수된 외부인 확인 ${visitorCount}건입니다.`} />
                <ReportCard title="근로자대표 확인·의견 기록" count={representativeCount} description={`이번 달 총 제출 ${representativeCount}건입니다.`} />
              </section>

              <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <div className="flex flex-wrap items-baseline justify-between gap-2 px-6 pt-6">
                  <h2 className="text-xl font-black text-slate-950">월간 결과 구성</h2>
                  <p className="text-xs font-bold text-slate-400">{periodRangeLabel}</p>
                </div>
                <div className="pt-2">
                  <SummaryRow title="위험성평가 공유확인" count={monthlyCount} total={totalCount} />
                  <SummaryRow title="작업 전 안전확인" count={preworkCount} total={totalCount} />
                  <SummaryRow title="익명 의견 · 아차사고 · 개선제안" count={anonymousCount} total={totalCount} />
                  <SummaryRow title="외부인 출입 전 안전확인" count={visitorCount} total={totalCount} />
                  <SummaryRow title="근로자대표 확인·의견 기록" count={representativeCount} total={totalCount} />
                </div>
                <p className="border-t border-slate-100 px-6 py-4 text-xs font-semibold leading-5 text-slate-400">막대는 이번 달 총 접수 {totalCount}건 대비 비중입니다.</p>
              </section>
            </div>

            <aside className="flex flex-col gap-6">
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <h2 className="text-base font-black text-slate-950">이동</h2>
                <div className="mt-4 space-y-3">
                  <a href={managerHref} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition hover:border-blue-300 hover:bg-blue-50"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-black text-blue-600">대</span><span><span className="block text-sm font-black text-slate-950">관리자 홈</span><span className="mt-0.5 block text-xs font-semibold leading-5 text-slate-500">이번 달 접수 현황 대시보드로 이동</span></span><span className="ml-auto text-sm font-black text-slate-400">→</span></a>
                  <a href={fieldHref} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition hover:border-blue-300 hover:bg-blue-50"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-black text-blue-600">QR</span><span><span className="block text-sm font-black text-slate-950">현장 QR 입구</span><span className="mt-0.5 block text-xs font-semibold leading-5 text-slate-500">근로자·외부인 확인 화면으로 이동</span></span><span className="ml-auto text-sm font-black text-slate-400">→</span></a>
                </div>
              </section>

              <section className="rounded-3xl bg-gradient-to-br from-[#123B8F] to-blue-700 p-6 text-white shadow-[0_8px_24px_rgba(18,59,143,0.18)]">
                <p className="text-xs font-black uppercase tracking-[0.08em] text-white/75">월간 운영 브리핑</p>
                <h2 className="mt-2 text-xl font-black tracking-tight">이번 달 기록 흐름</h2>
                <p className="mt-3 text-sm font-semibold leading-6 text-white/90">현장 확인 {fieldCount}건과 익명 의견 {anonymousCount}건이 월간 운영기록으로 정리되었습니다.</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-white/90">일반 근로자 서명 포함은 {workerSignatureConfirmedCount}건, 근로자대표 서명 포함은 {signatureConfirmedCount}건입니다.</p>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <p className="text-xs font-black uppercase tracking-[0.08em] text-blue-600">근로자 서명 포함 요약</p>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-2xl bg-slate-50 px-2 py-3"><p className="text-lg font-black text-slate-950">{workerSignatureConfirmedCount}</p><p className="mt-1 text-[11px] font-bold text-slate-400">서명 포함</p></div>
                  <div className="rounded-2xl bg-teal-50 px-2 py-3"><p className="text-lg font-black text-teal-800">{monthlyWorkerSignatureCount}</p><p className="mt-1 text-[11px] font-bold text-teal-700">공유확인</p></div>
                  <div className="rounded-2xl bg-blue-50 px-2 py-3"><p className="text-lg font-black text-blue-800">{preworkWorkerSignatureCount}</p><p className="mt-1 text-[11px] font-bold text-blue-700">작업 전</p></div>
                </div>
                <p className="mt-4 text-xs font-semibold leading-6 text-slate-500">선택 서명 미제출 {workerSignatureNotSubmittedCount}건도 일반 근로자 확인 기록으로 집계됩니다.</p>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <p className="text-xs font-black uppercase tracking-[0.08em] text-blue-600">근로자대표 확인 요약</p>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-2xl bg-slate-50 px-2 py-3"><p className="text-lg font-black text-slate-950">{representativeCount}</p><p className="mt-1 text-[11px] font-bold text-slate-400">총 제출</p></div>
                  <div className="rounded-2xl bg-teal-50 px-2 py-3"><p className="text-lg font-black text-teal-800">{signatureConfirmedCount}</p><p className="mt-1 text-[11px] font-bold text-teal-700">서명 포함</p></div>
                  <div className="rounded-2xl bg-slate-50 px-2 py-3"><p className="text-lg font-black text-slate-950">{signatureNotSubmittedCount}</p><p className="mt-1 text-[11px] font-bold text-slate-400">선택 미제출</p></div>
                </div>
                <p className="mt-4 text-xs font-semibold leading-6 text-slate-500">선택 서명 미제출 건도 근로자대표 확인 기록으로 집계됩니다.</p>
              </section>

              <p className="px-1 text-xs font-semibold leading-6 text-slate-400">이 화면은 현장 공유·확인·의견 흐름의 운영기록 요약입니다. 최종 판단과 조치는 관리자와 사업주가 검토합니다.</p>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}
