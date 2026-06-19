const primaryFlows = [
  {
    step: "01",
    title: "근로자 전자확인",
    desc: "QR로 접속해 작업 전 위생·안전 확인, 의견 제출, 사진 첨부, 모바일 자필 확인서명을 체험합니다.",
    href: "/field/participation?company=richi",
    tone: "bg-blue-700 text-white border-blue-700",
    label: "바로 체험",
  },
  {
    step: "02",
    title: "관리자 확인 화면",
    desc: "전자확인 기록, 의견·불편사항, 관리자 검토 후보가 어떻게 구분되는지 확인합니다.",
    href: "/trial/richi/manager",
    tone: "bg-white text-slate-950 border-slate-200",
    label: "샘플 보기",
  },
  {
    step: "03",
    title: "주간 요약 후보",
    desc: "체험 기간 동안 남긴 확인 기록과 의견을 주간 요약 후보 형태로 확인합니다.",
    href: "/trial/richi/summary",
    tone: "bg-white text-slate-950 border-slate-200",
    label: "샘플 보기",
  },
];

const commonModules = [
  {
    title: "말로 TBM 체험",
    desc: "현장관리자가 말로 작업내용을 남기고 TBM 초안으로 정리되는 공통 기능 샘플입니다.",
    status: "샘플 모드",
    href: "/partner-demo/tbm",
  },
  {
    title: "사진증빙 체험",
    desc: "작업 전·후 사진과 조치사진을 운영기록 후보로 남기는 공통 기능 샘플입니다.",
    status: "샘플 모드",
    href: "/partner-demo/manager",
  },
  {
    title: "PTW 샘플 체험",
    desc: "고위험 작업 전 확인 흐름을 보여주는 샘플 항목입니다. 리치 체험판에서는 원장 저장 없이 안내만 제공합니다.",
    status: "준비 중",
    href: "",
  },
  {
    title: "대표·관리자 확인 흐름",
    desc: "현장 입력이 관리자 확인과 대표 요약으로 이어지는 SafeMetrica 공통 운영 흐름입니다.",
    status: "샘플 모드",
    href: "/partner-demo/ceo",
  },
];

function ToneBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
      {children}
    </span>
  );
}

export default function RichiTrialHubPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950">
      <section className="mx-auto max-w-[760px]">
        <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-black text-blue-700">SafeMetrica Trial</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">
            ㈜리치코리아 현장 전자확인·피드백
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            식품공장 현장에서 작업 전 위생·안전 확인, 의견 접수, 관리자 검토, 주간 요약 후보까지 이어지는 체험 흐름입니다.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <ToneBadge>Food Factory Pack</ToneBadge>
            <ToneBadge>QR 전자확인</ToneBadge>
            <ToneBadge>관리자 검토</ToneBadge>
            <ToneBadge>주간 요약 후보</ToneBadge>
          </div>
        </div>

        <div className="mt-5 rounded-[28px] border border-blue-100 bg-blue-50 p-5">
          <p className="text-sm font-black text-blue-800">1층 · 식품공장 전자확인·피드백</p>
          <h2 className="mt-2 text-2xl font-black text-blue-950">리치코리아 체험 핵심 흐름</h2>
          <p className="mt-3 text-sm leading-6 text-blue-900">
            근로자 입력에서 관리자 확인, 주간 요약 후보까지 이어지는 업종팩 기본 흐름입니다.
          </p>
        </div>

        <div className="mt-4 grid gap-4">
          {primaryFlows.map((flow) => (
            <a
              key={flow.title}
              href={flow.href}
              className={["block rounded-[24px] border p-5 shadow-sm", flow.tone].join(" ")}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className={flow.step === "01" ? "text-sm font-black text-blue-100" : "text-sm font-black text-blue-700"}>
                    STEP {flow.step}
                  </p>
                  <h2 className="mt-1 text-xl font-black">{flow.title}</h2>
                  <p className={flow.step === "01" ? "mt-2 text-sm leading-6 text-blue-50" : "mt-2 text-sm leading-6 text-slate-600"}>
                    {flow.desc}
                  </p>
                </div>
                <span className={flow.step === "01" ? "shrink-0 rounded-full bg-white/15 px-3 py-1 text-xs font-black text-white" : "shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600"}>
                  {flow.label}
                </span>
              </div>
            </a>
          ))}
        </div>

        <div className="mt-6 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-black text-slate-500">2층 · SafeMetrica 공통 기능 체험</p>
          <h2 className="mt-2 text-2xl font-black">정식 운영 시 확장 가능한 기능</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            아래 기능은 리치 전자확인 체험판의 원장 저장 흐름과 분리된 샘플 모드입니다. 정식 운영 시 업종팩과 현장 상황에 맞춰 단계적으로 연결합니다.
          </p>

          <div className="mt-4 grid gap-3">
            {commonModules.map((module) => {
              const card = (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black text-emerald-700">{module.status}</p>
                      <h3 className="mt-1 text-base font-black text-slate-950">{module.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{module.desc}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500">
                      {module.href ? "보기" : "대기"}
                    </span>
                  </div>
                </div>
              );

              return module.href ? (
                <a key={module.title} href={module.href} className="block">
                  {card}
                </a>
              ) : (
                <div key={module.title}>{card}</div>
              );
            })}
          </div>
        </div>

        <div className="mt-5 rounded-[24px] border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-sm font-black text-emerald-800">업종팩 운영 기준</p>
          <p className="mt-2 text-sm leading-6 text-emerald-950">
            리치코리아 체험판은 식품공장 전자확인 업종팩의 시작 기준입니다. 회사별 코드 커스터마이징이 아니라 확인 템플릿, 문구, 테마, 보고서 후보를 조합해 확장합니다.
          </p>
        </div>

        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-900">
          이 체험판은 운영 흐름 확인용입니다. 법적 효력 보장, 인증 보장, 종이서명 완전 대체를 의미하지 않습니다.
        </div>
      </section>
    </main>
  );
}
