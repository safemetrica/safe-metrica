import Link from "next/link";

export const dynamic = "force-dynamic";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-5 py-16">
        <div className="max-w-3xl">
          <div className="mb-6 inline-flex rounded-full border border-emerald-800 bg-emerald-950/40 px-4 py-2 text-sm font-bold text-emerald-300">
            SafeMetrica™ 산업안전 운영 플랫폼
          </div>

          <h1 className="text-4xl font-black leading-tight sm:text-6xl">
            TBM·증빙·PTW·위험성평가를
            <br />
            한 곳에서 관리합니다.
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
            SafeMetrica는 현장 TBM, Evidence Book, 고위험작업허가서, 월간 안전운영 보고서를
            업체별로 연결해 산업안전 운영 데이터를 정리하는 플랫폼입니다.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/select-tenant?code=demo"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-black text-white hover:bg-blue-500"
            >
              데모 보기
            </Link>
            <Link
              href="/login"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-700 px-5 text-sm font-bold text-slate-200 hover:bg-slate-900"
            >
              고객사 접속
            </Link>
          </div>

          <p className="mt-4 text-xs leading-relaxed text-slate-500">
            실제 고객사 운영 링크는 전용 보안 링크로만 접속할 수 있습니다.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["TBM", "작업 전 안전활동 기록"],
            ["Evidence Book", "사진·파일 증빙 연결"],
            ["PTW", "고위험작업허가서 관리"],
            ["월간보고서", "운영 데이터 자동 요약"],
          ].map(([title, desc]) => (
            <div key={title} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="text-lg font-black">{title}</div>
              <div className="mt-2 text-sm text-slate-400">{desc}</div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
