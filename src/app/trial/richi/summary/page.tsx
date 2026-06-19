export default function RichiTrialSummaryPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950">
      <section className="mx-auto max-w-[760px]">
        <a href="/trial/richi" className="text-sm font-black text-blue-700">← 체험판 홈</a>

        <div className="mt-4 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-black text-amber-700">Weekly Trial Summary Candidate</p>
          <h1 className="mt-2 text-3xl font-black">리치코리아 주간 요약 후보</h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            전자확인 기록과 의견 접수 내용을 관리자 검토용 주간 요약 후보로 정리하는 샘플 화면입니다.
          </p>
        </div>

        <div className="mt-5 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black">이번 주 확인 요약</h2>
          <ul className="mt-4 space-y-3 text-sm font-bold leading-6 text-slate-700">
            <li>• 작업 전 위생·안전 전자확인: 3건</li>
            <li>• 불편사항·개선의견: 1건</li>
            <li>• 사진 첨부 의견: 0건</li>
            <li>• 관리자 후속 확인 필요: 1건</li>
          </ul>
        </div>

        <div className="mt-5 rounded-[24px] border border-blue-200 bg-blue-50 p-5">
          <p className="text-sm font-black text-blue-800">관리자 검토 후보</p>
          <p className="mt-3 text-sm leading-6 text-blue-950">
            포장실 세척도구 위치와 손 세척 동선에 대한 의견이 접수되었습니다. 현장 확인 후 개선 필요 여부를 검토합니다.
          </p>
        </div>

        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-900">
          이 화면은 주간 요약 후보 샘플입니다. 최종 판단과 조치 여부는 관리자 확인 후 결정합니다.
        </div>
      </section>
    </main>
  );
}
