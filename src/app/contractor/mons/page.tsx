import Link from "next/link";

const guideItems = [
  {
    title: "1. 오늘 작업 전 공유",
    body: "작업 전 핵심 위험요인, 날씨 주의사항, 피난·정리정돈 상태를 근로자에게 공유합니다.",
  },
  {
    title: "2. TBM 작성",
    body: "오늘 작업 내용과 특이사항을 TBM으로 남기고, 필요한 사진을 함께 첨부합니다.",
  },
  {
    title: "3. 근로자 의견 확인",
    body: "위험 제보, 아차사고, 개선 제안이 있으면 현장참여 링크로 접수합니다.",
  },
  {
    title: "4. 사진 증빙",
    body: "참석사진, 작업 전 현장사진, 특이사항 또는 조치 전·후 사진을 누락하지 않습니다.",
  },
];

export default function MonsManagerSafetyMeetingPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-4xl space-y-5">
        <Link href="/home" className="text-sm font-bold text-cyan-200 hover:text-cyan-100">
          ← 운영 홈으로
        </Link>

        <section className="rounded-3xl border border-cyan-500/30 bg-slate-900 p-6">
          <p className="text-sm font-black text-cyan-300">㈜몬스 · 현장관리자</p>
          <h1 className="mt-3 text-3xl font-black">몬스 현장관리자 안전회의</h1>
          <p className="mt-4 text-sm leading-6 text-slate-300">
            몬스는 현재 버블몬 협력사 제출 구조가 아니라, 3개월 단기 독립 운영으로 현장참여와 TBM 중심으로 관리합니다.
            이 화면은 현장관리자가 작업 전 공유할 내용과 근로자 참여 링크를 확인하는 안전회의용 화면입니다.
          </p>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          {guideItems.map((item) => (
            <div key={item.title} className="rounded-2xl border border-slate-700 bg-slate-900/80 p-4">
              <h2 className="text-base font-black text-white">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">{item.body}</p>
            </div>
          ))}
        </section>

        <section className="rounded-3xl border border-blue-500/30 bg-blue-950/30 p-5">
          <h2 className="text-xl font-black">바로가기</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Link
              href="/field/participation?company=mons"
              className="rounded-2xl bg-blue-600 px-4 py-4 text-center text-sm font-black text-white hover:bg-blue-500"
            >
              근로자 현장참여
            </Link>
            <Link
              href="/tbm"
              className="rounded-2xl border border-cyan-400/40 bg-cyan-500/10 px-4 py-4 text-center text-sm font-black text-cyan-100 hover:bg-cyan-500/20"
            >
              TBM 현황
            </Link>
            <Link
              href="/field"
              className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-4 text-center text-sm font-black text-emerald-100 hover:bg-emerald-500/20"
            >
              AI 현장 브리핑
            </Link>
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-400">
            TBM 현황과 AI 브리핑은 관리자 테넌트 접속 상태에서 사용합니다. 근로자에게는 현장참여 링크만 공유하세요.
          </p>
        </section>

        <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
          <strong>운영 기준:</strong> 기존 버블몬×몬스 원청·협력사 제출화면은 사용하지 않습니다.
          몬스 관련 제출은 근로자 현장참여와 TBM 기록 중심으로 운영합니다.
        </section>
      </div>
    </main>
  );
}
