export default function RichiTrialHubPage() {
  const workerUrl = "/field/participation?company=richi";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950">
      <section className="mx-auto max-w-[720px]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-black text-blue-700">SafeMetrica Trial</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">
            ㈜리치코리아 전자확인 체험판
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            작업 전 위생·안전 확인, 불편사항·개선의견 제출, 관리자 확인, 주간 요약 후보까지
            SafeMetrica의 체험 흐름을 확인하는 공개 안내 화면입니다.
          </p>
        </div>

        <div className="mt-5 grid gap-4">
          <a
            href={workerUrl}
            className="rounded-[24px] border border-blue-200 bg-blue-600 p-5 text-white shadow-sm"
          >
            <p className="text-sm font-black text-blue-100">STEP 1</p>
            <h2 className="mt-1 text-xl font-black">근로자 전자확인</h2>
            <p className="mt-2 text-sm leading-6 text-blue-50">
              QR로 접속해 작업 전 위생·안전 확인과 의견 제출을 체험합니다.
            </p>
          </a>

          <a
            href="/trial/richi/manager"
            className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm font-black text-emerald-700">STEP 2</p>
            <h2 className="mt-1 text-xl font-black">관리자 확인 화면</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              전자확인 기록, 의견·불편사항, 관리자 확인 필요 항목이 어떻게 구분되는지 확인합니다.
            </p>
          </a>

          <a
            href="/trial/richi/summary"
            className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm font-black text-amber-700">STEP 3</p>
            <h2 className="mt-1 text-xl font-black">주간 요약 후보</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              체험 기간 동안 남긴 확인 기록과 의견을 주간 요약 후보 형태로 확인합니다.
            </p>
          </a>
        </div>

        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-900">
          이 체험판은 운영 흐름 확인용입니다. 법적 효력 보장, 인증 보장, 종이서명 완전 대체를 의미하지 않습니다.
        </div>
      </section>
    </main>
  );
}
