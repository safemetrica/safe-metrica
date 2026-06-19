const sampleRows = [
  {
    title: "전자확인",
    count: "3건",
    desc: "작업 전 위생·안전 확인 기록",
    tone: "blue",
  },
  {
    title: "의견 접수",
    count: "1건",
    desc: "불편사항·개선의견 분리",
    tone: "emerald",
  },
  {
    title: "검토 필요",
    count: "1건",
    desc: "관리자 후속 확인 후보",
    tone: "amber",
  },
];

const reviewItems = [
  {
    label: "개선의견",
    title: "포장실 세척도구 위치 개선 의견",
    meta: "처리상태: 검토중 · 현장 동선 확인 후 조정 검토",
  },
  {
    label: "전자확인",
    title: "작업 전 위생·안전 확인 완료",
    meta: "확인기록: 접수 · 별도 의견 없음",
  },
];

function getToneClass(tone: string) {
  if (tone === "emerald") {
    return "border-emerald-100 bg-emerald-50 text-emerald-700";
  }

  if (tone === "amber") {
    return "border-amber-100 bg-amber-50 text-amber-700";
  }

  return "border-blue-100 bg-blue-50 text-blue-700";
}

export default function RichiTrialManagerPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950">
      <section className="mx-auto max-w-[760px]">
        <a href="/trial/richi" className="text-sm font-black text-blue-700">
          ← 체험판 홈
        </a>

        <div className="mt-4 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-black text-blue-700">SafeMetrica Trial Manager</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">
            리치코리아 전자확인 관리자 화면
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            근로자가 남긴 전자확인과 의견을 관리자가 검토하는 샘플 화면입니다.
          </p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {sampleRows.map((row) => (
            <div key={row.title} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-black text-slate-500">{row.title}</p>
              <p className="mt-2 text-3xl font-black text-slate-950">{row.count}</p>
              <p className="mt-3 text-sm leading-6 text-slate-600">{row.desc}</p>
              <div className={["mt-4 h-1.5 rounded-full border", getToneClass(row.tone)].join(" ")} />
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-black text-slate-500">관리자 검토 후보</p>
              <h2 className="mt-2 text-xl font-black">오늘 확인할 항목</h2>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
              샘플
            </span>
          </div>

          <div className="mt-4 grid gap-3">
            {reviewItems.map((item) => (
              <div key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-black text-blue-700">{item.label}</p>
                <h3 className="mt-1 text-base font-black text-slate-950">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.meta}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 rounded-[24px] border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-sm font-black text-emerald-800">운영 메모</p>
          <p className="mt-2 text-sm leading-6 text-emerald-950">
            이 화면은 실제 원장이나 내부 관리자 기능을 노출하지 않는 체험판 샘플입니다.
            최종 검토와 조치 여부는 관리자가 확인합니다.
          </p>
        </div>

        <a
          href="/trial/richi/summary"
          className="mt-5 block rounded-2xl bg-blue-700 px-5 py-4 text-center text-base font-black text-white shadow-sm"
        >
          주간 요약 후보 보기 →
        </a>
      </section>
    </main>
  );
}
