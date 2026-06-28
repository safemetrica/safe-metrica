import Link from "next/link";

export const dynamic = "force-dynamic";

const entryCards = [
  {
    title: "관리자 · 대표 로그인",
    description: "초대받은 운영관리자, 현장관리자, 대표 계정은 고객사 전용 링크로 접속합니다.",
    badge: "로그인 필요",
    tone: "border-blue-200 bg-blue-50 text-blue-950",
  },
  {
    title: "현장 QR 확인",
    description: "근로자와 외부인은 로그인하지 않고 현장 QR을 통해 확인·의견 제출을 진행합니다.",
    badge: "QR 무로그인",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-950",
  },
  {
    title: "도입 문의 · 가입 신청",
    description: "신규업체 사용은 기본정보 확인 후 Owner 승인 방식으로 순차 개설합니다.",
    badge: "Owner 승인",
    tone: "border-amber-200 bg-amber-50 text-amber-950",
  },
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const error = (await searchParams)?.error;
  const isTenantRequired = error === "tenant_required";
  const hasOtherError = Boolean(error && !isTenantRequired);

  return (
    <main className="min-h-screen bg-[#F3F7FA] text-slate-950">
      <section className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-8 px-5 py-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[2rem] bg-gradient-to-br from-[#083A6B] via-[#0B5EA8] to-[#19B7A4] p-7 text-white shadow-2xl sm:p-10">
          <div className="inline-flex rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-black tracking-tight text-white/90">
            SafeMetrica 산업안전플랫폼
          </div>

          <h1 className="mt-8 text-4xl font-black leading-tight tracking-tight sm:text-5xl">
            현장 확인부터
            <br />
            대표 보고까지
            <br />
            하나의 운영기록으로.
          </h1>

          <p className="mt-6 max-w-xl text-base leading-8 text-white/85">
            SafeMetrica는 근로자 확인, 현장관리자 조치, 대표 확인을 연결해
            산업안전 운영기록을 남기는 플랫폼입니다.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {["현장 확인", "관리자 조치", "월간 보고"].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/15 bg-white/10 p-4 text-sm font-black text-white shadow-sm"
              >
                {item}
              </div>
            ))}
          </div>

          <p className="mt-8 text-xs leading-6 text-white/65">
            관리자와 대표는 초대받은 계정 또는 고객사 전용 링크로 이용합니다.
            근로자와 외부인은 현장 QR을 통해 별도 로그인 없이 참여합니다.
          </p>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0B5EA8] text-2xl text-white">
              🛡️
            </div>
            <h2 className="mt-5 text-3xl font-black tracking-tight">
              SafeMetrica 로그인
            </h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              산업안전 운영기록 SaaS
            </p>
          </div>

          {isTenantRequired ? (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-950">
              고객사 정보가 포함된 전용 링크가 필요합니다. 기존 링크가 열리지 않으면
              운영관리자에게 새 링크를 요청해 주세요.
            </div>
          ) : null}

          {hasOtherError ? (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-7 text-red-950">
              접근 권한을 확인할 수 없습니다. 고객사 전용 보안 링크로 다시 접속해 주세요.
            </div>
          ) : null}

          <div className="mt-7 space-y-3">
            {entryCards.map((card) => (
              <div key={card.title} className={`rounded-2xl border p-4 ${card.tone}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-base font-black">{card.title}</h3>
                    <p className="mt-2 text-sm leading-6 opacity-80">{card.description}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-white/70 px-3 py-1 text-[0.68rem] font-black">
                    {card.badge}
                  </span>
                </div>
              </div>
            ))}
          </div>

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

          <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-xs leading-6 text-slate-500">
            신규업체 사용은 가입 신청 후 Owner 승인으로 개설합니다. 현장 QR은 고객사별로
            발급되며, 실제 고객자료와 운영기록은 고객사 범위 안에서 관리됩니다.
          </div>
        </div>
      </section>
    </main>
  );
}
