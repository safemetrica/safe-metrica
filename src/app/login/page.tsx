import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const error = (await searchParams)?.error;
  const isTenantRequired = error === "tenant_required";
  const hasOtherError = Boolean(error && !isTenantRequired);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F3F7FA] px-5 py-10 text-slate-950">
      <section className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
        <div className="text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center">
            <img
              src="/brand/safemetrica-logo-mark.svg"
              alt="SafeMetrica 로고"
              className="h-20 w-20 drop-shadow-sm"
            />
          </div>
          <h1 className="mt-5 text-3xl font-black tracking-tight">
            SafeMetrica 로그인
          </h1>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            관리자와 대표는 계정 발급 후 운영기록을 확인합니다.
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700">
          <p className="font-black text-slate-900">
            관리자 계정은 도입 확인 후 발급됩니다.
          </p>
          <p className="mt-2">
            도입 고객은 운영 담당자를 통해 계정 안내를 받습니다.
          </p>
          <p className="mt-2">
            근로자와 외부인은 현장 QR로 로그인 없이 참여합니다.
          </p>
        </div>

        {isTenantRequired ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-950">
            고객사 정보가 포함된 주소로 접속해야 하는 화면입니다. 계속 확인되지 않으면
            운영 담당자에게 문의해 주세요.
          </div>
        ) : null}

        {hasOtherError ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-7 text-red-950">
            접근 권한을 확인할 수 없습니다. 로그인 후 접근 권한을 확인합니다. 접근 권한이
            확인되지 않으면 운영 담당자에게 문의해 주세요.
          </div>
        ) : null}

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <Link
            href="/partner-demo"
            className="flex min-h-12 items-center justify-center rounded-2xl bg-[#0B5EA8] px-4 text-sm font-black text-white transition hover:bg-[#084D8D]"
          >
            샘플 체험 보기
          </Link>
          <Link
            href="/"
            className="flex min-h-12 items-center justify-center rounded-2xl border border-slate-200 px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50"
          >
            서비스 소개 보기
          </Link>
        </div>

        <p className="mt-6 text-center text-xs leading-6 text-slate-400">
          실제 고객자료와 운영기록은 고객사 범위 안에서 관리됩니다.
        </p>
      </section>
    </main>
  );
}
