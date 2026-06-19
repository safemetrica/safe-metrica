const summaryItems = [
  ["작업 전 위생·안전 전자확인", "3건"],
  ["불편사항·개선의견", "1건"],
  ["사진 첨부 의견", "0건"],
  ["관리자 후속 확인 필요", "1건"],
];

export default function RichiTrialSummaryPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950">
      <section className="mx-auto max-w-[760px]">
        <a href="/trial/richi" className="text-sm font-black text-blue-700">
          ← 체험판 홈
        </a>

        <div className="mt-4 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-black text-amber-700">Weekly Trial Summary Candidate</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">리치코리아 주간 요약 후보</h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            전자확인 기록과 의견 접수 내용을 주간 검토 후보로 정리한 샘플 화면입니다.
          </p>
        </div>

        <div className="mt-5 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-black text-slate-500">이번 주 확인 요약</p>
              <h2 className="mt-2 text-xl font-black">운영기록 후보</h2>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
              샘플
            </span>
          </div>

          <div className="mt-5 grid gap-3">
            {summaryItems.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-sm font-bold text-slate-700">{label}</p>
                <p className="text-base font-black text-slate-950">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 rounded-[24px] border border-blue-200 bg-blue-50 p-5">
          <p className="text-sm font-black text-blue-800">관리자 검토 후보</p>
          <h2 className="mt-2 text-xl font-black text-blue-950">포장실 동선·세척도구 위치 확인</h2>
          <p className="mt-3 text-sm leading-6 text-blue-950">
            포장실 세척도구 위치와 손 세척 동선에 대한 의견이 접수되었습니다.
            관리자가 현장을 확인한 뒤 개선 필요 여부를 검토합니다.
          </p>
        </div>

        <div className="mt-5 rounded-[24px] border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-sm font-black text-emerald-800">주간 요약 활용 예시</p>
          <p className="mt-2 text-sm leading-6 text-emerald-950">
            전자확인 건수, 의견 접수, 후속 확인 후보를 주간 단위로 모아 관리자 검토자료로 활용합니다.
          </p>
        </div>

        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-900">
          이 화면은 주간 요약 후보 샘플입니다. 최종 판단과 조치 여부는 관리자 확인 후 결정합니다.
        </div>
      </section>
    </main>
  );
}
