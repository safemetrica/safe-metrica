import Link from "next/link";

export default function FieldParticipationSubmittedPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-900">
      <div className="mx-auto max-w-2xl">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-black text-blue-700">SafeMetrica 현장참여</p>
          <h1 className="mt-2 text-2xl font-black text-slate-950">현장참여 접수 완료</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            입력한 내용이 접수되었습니다. 다음 단계에서는 회사별 현장 의견 DB에 자동 저장됩니다.
          </p>

          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-bold text-emerald-700">
              안전관리자가 확인하고 필요한 조치 또는 위험성평가 반영 후보로 검토합니다.
            </p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Link
              href="/field/participation"
              className="rounded-xl bg-blue-700 px-4 py-3 text-center text-sm font-black text-white"
            >
              다른 의견 남기기
            </Link>
            <Link
              href="/"
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-center text-sm font-black text-slate-700"
            >
              홈으로
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
