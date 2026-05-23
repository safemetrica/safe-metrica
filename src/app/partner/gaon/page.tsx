const partnerCards = [
  {
    title: "본사 대시보드",
    description: "가온에듀 본사가 지사별 고객사 운영 현황을 확인합니다.",
    items: ["지사별 고객사 현황", "교육 진행 현황", "증빙 누락 현황", "월간보고서 발행 현황"],
  },
  {
    title: "지사 관리",
    description: "지사별 담당자와 고객사 운영 상태를 관리합니다.",
    items: ["지사명", "담당자", "거래처 수", "운영 상태"],
  },
  {
    title: "고객사 교육·이수증빙",
    description: "교육기관 수료증과 고객사 자체 교육기록을 구분 관리합니다.",
    items: ["교육명", "교육일", "교육기관", "참석자", "수료증", "서명·사진 증빙"],
  },
  {
    title: "위험성평가 공유 현황",
    description: "위험성평가 결과가 근로자에게 공유되었는지 확인합니다.",
    items: ["위험성평가 실시 여부", "근로자 참여 기록", "위험요인 공유 여부", "TBM 연결 여부"],
  },
  {
    title: "월간보고서",
    description: "교육·참여·증빙 누락 현황을 월간 단위로 정리합니다.",
    items: ["교육 이수 현황", "증빙 누락 항목", "위험성평가 공유 현황", "다음 달 보완사항"],
  },
  {
    title: "파트너 수익관리",
    description: "파트너 내부 전용 준비 항목입니다. 고객사 화면에는 노출하지 않습니다.",
    items: ["파트너 내부 전용", "준비중", "고객사 화면 비노출"],
    muted: true,
  },
];

export default function GaonEduLinkPartnerPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="mb-2 text-sm font-semibold text-blue-700">Partner Console</p>
          <h1 className="text-3xl font-bold tracking-tight">SafeMetrica EduLink™</h1>
          <p className="mt-2 text-xl font-semibold text-slate-700">
            가온에듀 × SafeMetrica EduLink™
          </p>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
            교육기관 제휴형 안전운영·교육이수증빙 관리 플랫폼입니다.
            가온에듀는 교육 콘텐츠와 수료증 발급을 담당하고,
            SafeMetrica EduLink™는 고객사의 위험성평가, TBM, 근로자 참여기록,
            교육 이수증빙, Evidence Book, 월간보고서까지 이어지도록 관리합니다.
          </p>
        </section>

        <section className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="text-lg font-bold text-amber-950">운영 원칙</h2>
          <p className="mt-2 text-sm leading-6 text-amber-950">
            SafeMetrica EduLink™는 교육기관을 대체하지 않습니다.
            교육기관의 수료증, 출석부, 교육시간 기록과 사업장 자체 TBM·위험성평가 공유 기록을
            구분하여 관리하도록 지원합니다.
          </p>
        </section>

        <section className="mb-6 grid gap-4 md:grid-cols-4">
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">운영 고객사</p>
            <p className="mt-2 text-3xl font-black text-slate-900">준비중</p>
            <p className="mt-2 text-sm text-slate-600">지사별 고객사 연결 예정</p>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">교육증빙 항목</p>
            <p className="mt-2 text-3xl font-black text-slate-900">v1</p>
            <p className="mt-2 text-sm text-slate-600">수료증·출석부·서명·사진</p>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">위험성평가 공유</p>
            <p className="mt-2 text-3xl font-black text-slate-900">설계중</p>
            <p className="mt-2 text-sm text-slate-600">근로자 참여·TBM 연결</p>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">월간보고서</p>
            <p className="mt-2 text-3xl font-black text-slate-900">예정</p>
            <p className="mt-2 text-sm text-slate-600">교육·참여·증빙 요약</p>
          </article>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {partnerCards.map((card) => (
            <article
              key={card.title}
              className={`rounded-3xl border p-5 shadow-sm ${
                card.muted
                  ? "border-slate-200 bg-slate-100 text-slate-600"
                  : "border-slate-200 bg-white"
              }`}
            >
              <h2 className="text-lg font-bold">{card.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{card.description}</p>
              <ul className="mt-4 space-y-2 text-sm leading-6">
                {card.items.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold">고객사 화면 노출 기준</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            가온에듀 지사, 거래처 수, 파트너 수익관리, 수익배분 정보는 고객사 홈에 노출하지 않습니다.
            고객사에는 “교육·이수증빙” 기능으로만 표시합니다.
          </p>
        </section>
      </div>
    </main>
  );
}
