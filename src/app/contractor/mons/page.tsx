import Link from "next/link";

export const dynamic = "force-dynamic";

const MONS_TBM_WRITE_URL = "여기에_실제_몬스_TBM_작성_노션링크";
const MONS_FIELD_PARTICIPATION_URL = "/field/participation?company=mons";

const guideItems = [
  {
    title: "1. 작업 전 공유",
    body: "작업 전 핵심 위험요인, 날씨 주의사항, 피난·정리정돈 상태를 근로자에게 공유합니다.",
  },
  {
    title: "2. TBM 기록",
    body: "오늘 작업 내용과 특이사항은 TBM 또는 현장 운영기록으로 남깁니다.",
  },
  {
    title: "3. 근로자 의견",
    body: "위험 제보, 아차사고, 개선 제안은 현장참여 링크로 접수합니다.",
  },
  {
    title: "4. 사진 증빙",
    body: "참석사진, 작업 전 현장사진, 특이사항 또는 조치 전·후 사진을 누락하지 않습니다.",
  },
];

export default function MonsSubmitSpacePage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-3xl space-y-5">
        <section className="rounded-3xl border border-cyan-500/30 bg-slate-900 p-6">
          <p className="text-sm font-black text-cyan-300">㈜몬스 · 현장 제출공간</p>
          <h1 className="mt-3 text-3xl font-black">몬스 안전회의 제출공간</h1>
          <p className="mt-4 text-sm leading-6 text-slate-300">
            몬스는 현재 버블몬 협력사 제출 구조가 아니라, 3개월 단기 독립 운영으로 현장참여와 TBM 중심으로 관리합니다.
            이 화면은 별도 대표 홈이 아니라 현장 제출 및 근로자 참여 안내용 화면입니다.
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
          <h2 className="text-xl font-black">현장 제출 바로가기</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            현장관리자는 오늘 TBM을 작성하고, 근로자에게는 현장참여 링크만 공유합니다.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <a
              href={MONS_TBM_WRITE_URL}
              target="_blank"
              rel="noreferrer"
              className="block rounded-2xl bg-cyan-500 px-4 py-4 text-center text-base font-black text-slate-950 hover:bg-cyan-400"
            >
              오늘 TBM 작성하기
            </a>

            <Link
              href={MONS_FIELD_PARTICIPATION_URL}
              className="block rounded-2xl bg-blue-600 px-4 py-4 text-center text-base font-black text-white hover:bg-blue-500"
            >
              근로자 현장참여 열기
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
          <strong>운영 기준:</strong> 몬스는 세메앱 별도 대표 홈을 개발하지 않습니다.
          대표/관리자 확인은 노션 운영자료를 기준으로 하고, 세메앱은 현장참여와 TBM 기록 중심으로 운영합니다.
        </section>
      </div>
    </main>
  );
}
