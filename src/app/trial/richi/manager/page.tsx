const sampleRows = [
  {
    title: "전자확인 기록",
    count: "3건",
    desc: "작업 전 위생·안전 안내를 확인한 기록입니다.",
  },
  {
    title: "의견·불편사항",
    count: "1건",
    desc: "불편사항, 개선의견, 기타 의견을 관리자 확인자료로 분리합니다.",
  },
  {
    title: "관리자 확인 필요",
    count: "1건",
    desc: "사진 첨부, 반복 의견, 후속 확인이 필요한 항목입니다.",
  },
];

export default function RichiTrialManagerPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950">
      <section className="mx-auto max-w-[760px]">
        <a href="/trial/richi" className="text-sm font-black text-blue-700">← 체험판 홈</a>

        <div className="mt-4 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-black text-blue-700">SafeMetrica Trial Manager</p>
          <h1 className="mt-2 text-3xl font-black">리치코리아 전자확인 관리자 화면</h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            근로자가 제출한 전자확인, 불편사항, 개선의견을 관리자가 확인하는 흐름의 샘플 화면입니다.
          </p>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {sampleRows.map((row) => (
            <div key={row.title} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-black text-slate-500">{row.title}</p>
              <p className="mt-2 text-3xl font-black text-blue-700">{row.count}</p>
              <p className="mt-3 text-sm leading-6 text-slate-600">{row.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-[24px] border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-sm font-black text-emerald-800">관리자 확인 예시</p>
          <h2 className="mt-2 text-xl font-black">포장실 세척도구 위치 개선 의견</h2>
          <p className="mt-3 text-sm leading-6 text-emerald-900">
            제출 유형: 개선의견 · 처리상태: 검토중 · 관리자 메모: 현장 동선 확인 후 조정 검토
          </p>
        </div>

        <a
          href="/trial/richi/summary"
          className="mt-5 block rounded-2xl bg-blue-600 px-5 py-4 text-center text-base font-black text-white"
        >
          주간 요약 후보 보기 →
        </a>
      </section>
    </main>
  );
}
