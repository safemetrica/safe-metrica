import Link from "next/link";

export const dynamic = "force-dynamic";

export default function DeprecatedBubblemonMonsPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-white">
      <section className="mx-auto max-w-3xl rounded-3xl border border-amber-400/40 bg-amber-950/30 p-6 shadow-2xl">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-amber-200">
          Legacy / Deprecated
        </p>
        <h1 className="mt-3 text-3xl font-black">
          버블몬 × 몬스 원청·협력사 화면은 사용하지 않습니다.
        </h1>
        <p className="mt-4 text-sm font-bold leading-7 text-amber-50">
          최신 운영 기준에서 몬스는 버블몬 협력사가 아니라 독립 테넌트입니다.
          기존 원청·협력사 화면은 과거 테스트/초기 설계 보존용이며, 신규 운영 동선으로 사용하지 않습니다.
        </p>

        <div className="mt-6 rounded-2xl border border-white/10 bg-slate-900 p-4 text-sm font-bold leading-7 text-slate-200">
          <p>운영 기준:</p>
          <ul className="mt-2 space-y-1">
            <li>• 몬스 = 3개월 단기 독립 테넌트</li>
            <li>• 운영 범위 = 현장참여 + TBM 중심</li>
            <li>• 버블몬 월간보고서, 원청·협력사 제출현황, Risk DB와 연결하지 않음</li>
            <li>• 원청·협력사 모듈은 향후 필요한 고객사에 선택형 legacy 모듈로만 보존</li>
          </ul>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link
            href="/owner"
            className="rounded-2xl bg-white px-4 py-3 text-center text-sm font-black text-slate-950"
          >
            Owner로 돌아가기
          </Link>
          <Link
            href="/field/participation?company=mons"
            className="rounded-2xl border border-cyan-300 px-4 py-3 text-center text-sm font-black text-cyan-100"
          >
            몬스 현장참여 열기
          </Link>
        </div>
      </section>
    </main>
  );
}
