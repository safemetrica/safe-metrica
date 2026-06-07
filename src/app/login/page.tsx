import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const error = (await searchParams)?.error;
  const isTenantRequired = error === "tenant_required";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 py-10 text-white">
      <section className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <div className="text-center">
          <div className="text-5xl">🦺</div>
          <h1 className="mt-4 text-3xl font-black">SafeMetrica™</h1>
          <p className="mt-2 text-sm text-slate-400">산업안전 운영 플랫폼</p>
        </div>

        {error && !isTenantRequired && (
          <div className="mt-6 rounded-2xl border border-red-800 bg-red-950/40 p-4 text-sm leading-relaxed text-red-200">
            접근 권한을 확인할 수 없습니다. 고객사 전용 보안 링크로 다시 접속해 주세요.
          </div>
        )}

        <div
          className={`mt-8 rounded-2xl border p-5 ${
            isTenantRequired
              ? "border-amber-700/70 bg-amber-950/30"
              : "border-slate-800 bg-slate-950"
          }`}
        >
          <h2 className="text-lg font-black">
            {isTenantRequired ? "고객사 전용 링크가 필요합니다." : "고객사 접속 안내"}
          </h2>
          {isTenantRequired ? (
            <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-200">
              <p>
                실제 고객사 운영 화면은 전용 보안 링크 또는 현장 QR 링크로만 접속할 수
                있습니다.
              </p>
              <p>
                현재 접속에는 고객사 정보가 포함되어 있지 않아 운영 화면을 열 수 없습니다.
                기존 링크가 열리지 않는 경우 관리자에게 새 링크를 요청해 주세요.
              </p>
              <p className="rounded-xl bg-slate-950/70 p-3 text-slate-300">
                체험만 원하신다면 실제 고객 데이터와 연결되지 않은 Partner Demo를 이용해
                주세요.
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              실제 고객사 운영 화면은 전용 보안 링크로만 접속할 수 있습니다. 기존 링크가
              열리지 않는 경우 관리자에게 새 링크를 요청해 주세요.
            </p>
          )}
        </div>

        <div className="mt-6 grid gap-3">
          <Link
            href="/"
            className="flex min-h-12 items-center justify-center rounded-xl border border-slate-700 text-sm font-bold text-slate-200 hover:bg-slate-800"
          >
            랜딩홈으로 이동
          </Link>
          <Link
            href="/partner-demo"
            className="flex min-h-12 items-center justify-center rounded-xl bg-blue-600 text-sm font-black text-white hover:bg-blue-500"
          >
            Partner Demo 보기
          </Link>
        </div>

        <p className="mt-6 text-center text-xs leading-relaxed text-slate-500">
          운영 화면 접속 링크가 필요한 경우 고객사 관리자에게 문의해 주세요.
        </p>
      </section>
    </main>
  );
}
