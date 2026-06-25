const navItems = [
  { href: "#core", label: "Core 운영형" },
  { href: "#light", label: "납품형 Light" },
  { href: "#mobile", label: "근로자 모바일" },
  { href: "#site", label: "현장관리자" },
  { href: "#executive", label: "대표·운영관리자" },
  { href: "#monthly", label: "월간 운영기록" },
];

const coreCards = [
  "대표 운영 확인",
  "오늘 운영 브리핑",
  "Risk 보기",
  "조치 흐름 보기",
  "월간보고서",
  "TBM",
  "현장비서",
  "안전사고 사례 참고자료",
  "월간 안전운영 보고서",
];

const lightItems = ["관리자 홈", "검토 대기 항목", "작업 전 확인기록", "의견 접수", "근로자대표 확인"];
const quickActions = ["현장 QR 공유", "TBM 작성", "이번 달 운영기록", "접수함 확인"];
const monthlyStats = [
  { label: "TBM 기록", value: "24건", tone: "teal" },
  { label: "증빙 기록", value: "68건", tone: "cyan" },
  { label: "검토 대기", value: "11건", tone: "blue" },
  { label: "근로자 참여", value: "143명", tone: "mint" },
];

function SectionTitle({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="mb-8">
      <p className="text-sm font-semibold uppercase tracking-[0.28em] text-teal-600">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">{title}</h2>
      <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">{description}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

export default function UiuxReviewPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="rounded-full bg-slate-100 px-4 py-2 text-center text-sm font-medium text-slate-700">
            UI/UX 검수용 샘플 화면입니다. 실제 고객 데이터와 연결되어 있지 않습니다.
          </div>
          <nav className="flex gap-2 overflow-x-auto pb-1 text-sm font-semibold text-slate-600" aria-label="샘플 화면 이동">
            {navItems.map((item) => (
              <a key={item.href} href={item.href} className="whitespace-nowrap rounded-full border border-slate-200 bg-white px-4 py-2 transition hover:border-teal-300 hover:text-teal-700">
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </div>

      <section id="core" className="bg-[#07111f] px-4 py-14 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.32em] text-cyan-300">SafeMetrica™ Core</p>
              <h1 className="mt-4 text-4xl font-black tracking-tight md:text-6xl">위험성평가 이후, 현장 기록을 운영 흐름으로 연결합니다.</h1>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">근로자는 QR로 확인하고, 관리자는 검토하며, 대표는 월간 운영기록으로 확인합니다.</p>
              <p className="mt-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4 text-sm leading-6 text-cyan-50">이 화면은 운영 확인을 돕는 샘플이며, 법적 판단이나 조치 판단을 대신하지 않습니다.</p>
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-cyan-950/50">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-xs text-slate-400">운영 사업장</p>
                  <p className="text-xl font-bold">(주)샘플환경</p>
                </div>
                <span className="rounded-full bg-teal-400/15 px-3 py-1 text-xs font-bold text-teal-200">운영 흐름 정상</span>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3">
                <MiniMetric label="오늘 확인" value="36" />
                <MiniMetric label="검토 대기" value="7" />
                <MiniMetric label="월간 기록" value="128" />
              </div>
              <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4">
                <p className="text-sm font-bold text-amber-100">주의 필요</p>
                <p className="mt-1 text-sm text-amber-50/80">옥외 작업 휴식 안내가 필요한 시간대입니다.</p>
              </div>
            </div>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {coreCards.map((card, index) => (
              <article key={card} className="rounded-3xl border border-white/10 bg-slate-800/80 p-5 shadow-xl shadow-black/10">
                <div className="mb-5 flex items-center justify-between">
                  <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-200">0{index + 1}</span>
                  <span className="h-2 w-2 rounded-full bg-teal-300" />
                </div>
                <h3 className="text-lg font-bold text-white">{card}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-400">운영자가 흐름을 빠르게 확인하도록 구성한 샘플 카드입니다.</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="light" className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionTitle eyebrow="delivery light" title="납품형 Light" description="흰색, 민트, 틸 색상을 중심으로 납품 고객이 부담 없이 확인할 수 있는 가벼운 운영 화면입니다." />
          <div className="rounded-[2rem] border border-teal-100 bg-gradient-to-br from-white to-teal-50 p-5 shadow-xl shadow-teal-900/5">
            <div className="flex flex-col justify-between gap-4 border-b border-teal-100 pb-5 md:flex-row md:items-center">
              <div><p className="text-sm font-semibold text-teal-700">관리자 홈</p><h3 className="text-2xl font-black text-slate-900">(주)샘플제조 운영 패널</h3></div>
              <button className="rounded-full bg-teal-600 px-5 py-3 text-sm font-bold text-white">오늘 확인 시작</button>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-5">{lightItems.map((item) => <div key={item} className="rounded-2xl border border-teal-100 bg-white p-4 text-sm font-bold text-slate-800">{item}</div>)}</div>
            <div className="mt-6 grid gap-3 md:grid-cols-4">{quickActions.map((action) => <button key={action} className="rounded-2xl bg-teal-600 px-4 py-4 text-sm font-bold text-white shadow-lg shadow-teal-600/15">{action}</button>)}</div>
            <div className="mt-6 grid gap-4 md:grid-cols-[1fr_0.8fr]">
              <div className="rounded-3xl bg-white p-5"><h4 className="font-black">이번 달 운영 현황</h4><div className="mt-4 grid gap-3 sm:grid-cols-2">{monthlyStats.map((stat) => <div key={stat.label} className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-500">{stat.label}</p><p className="mt-2 text-2xl font-black text-teal-700">{stat.value}</p></div>)}</div></div>
              <details className="rounded-3xl border border-slate-200 bg-slate-50 p-5"><summary className="cursor-pointer font-black text-slate-800">상세 운영관리</summary><p className="mt-4 text-sm leading-6 text-slate-500">검토 이력, 참여 추이, 보완 필요 항목을 낮은 강조도로 정리하는 샘플 영역입니다.</p></details>
            </div>
            <p className="mt-5 rounded-2xl bg-slate-100 p-4 text-sm leading-6 text-slate-500">샘플 데이터만 표시하며 실제 운영 기록과 연결되어 있지 않습니다.</p>
          </div>
        </div>
      </section>

      <section id="mobile" className="bg-slate-100 px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><SectionTitle eyebrow="worker mobile" title="근로자 모바일" description="현장에서 QR로 진입한 근로자가 큰 버튼으로 빠르게 확인, 서명, 의견 제출을 완료하는 흐름입니다." /><div className="mx-auto max-w-sm rounded-[2.5rem] border-8 border-slate-900 bg-white p-5 shadow-2xl"><div className="mx-auto mb-5 h-1.5 w-20 rounded-full bg-slate-300" />{["현장 기록 선택", "작업 전 확인·서명", "익명 의견", "제출 완료"].map((item) => <button key={item} className="mb-3 w-full rounded-2xl bg-teal-600 px-5 py-5 text-left text-lg font-black text-white">{item}</button>)}<p className="mt-4 rounded-2xl bg-slate-100 p-4 text-sm text-slate-600">모바일 우선 화면으로 손가락 터치 영역을 크게 구성합니다.</p></div></div></section>

      <section id="site" className="px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><SectionTitle eyebrow="site manager" title="현장관리자" description="현장관리자가 당일 운영과 근로자 의견, 참고자료를 한 화면에서 확인하는 샘플입니다." /><div className="grid gap-4 md:grid-cols-3">{["오늘 TBM 작성", "현장 의견 접수함", "검토 대기 항목", "현장비서", "안전사고 사례 참고자료"].map((item) => <article key={item} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h3 className="text-lg font-black">{item}</h3><p className="mt-3 text-sm leading-6 text-slate-600">관리자가 빠르게 검토하도록 만든 샘플 카드입니다.</p></article>)}<article className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm"><h3 className="text-lg font-black text-amber-950">날씨·폭염 주의</h3><p className="mt-3 font-bold text-amber-900">기온 30.1℃ — 수분섭취·휴식 안내 필요</p><p className="mt-2 text-sm leading-6 text-amber-800">기온 30.1℃ 수준입니다. 장시간 야외작업 시 수분섭취와 휴식 안내가 필요합니다.</p></article></div></div></section>

      <section id="executive" className="bg-slate-950 px-4 py-16 text-white sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><p className="text-sm font-semibold uppercase tracking-[0.28em] text-teal-300">executive dashboard</p><h2 className="mt-3 text-3xl font-black md:text-4xl">대표·운영관리자</h2><div className="mt-8 grid gap-4 md:grid-cols-5">{["대표 운영 확인", "미조치 신호", "월간보고서", "Risk 관리 현황", "월간 운영 브리핑"].map((item) => <article key={item} className="rounded-3xl border border-white/10 bg-white/[0.06] p-5"><h3 className="font-black">{item}</h3><p className="mt-3 text-sm leading-6 text-slate-400">PC 대시보드 중심의 운영 확인 샘플입니다.</p></article>)}</div></div></section>

      <section id="monthly" className="px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><SectionTitle eyebrow="monthly record" title="월간 운영기록" description="월간 운영기록을 요약하고, 운영기록 기반 브리핑 후보를 검토하는 샘플입니다." /><div className="grid gap-4 md:grid-cols-4">{monthlyStats.map((stat) => <article key={stat.label} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-sm text-slate-500">{stat.label}</p><p className="mt-3 text-3xl font-black text-slate-950">{stat.value}</p></article>)}</div><div className="mt-6 rounded-3xl border border-teal-100 bg-teal-50 p-6"><h3 className="text-xl font-black text-slate-950">운영기록 기반 브리핑 후보</h3><p className="mt-3 text-slate-700">최종 검토와 조치 판단은 관리자와 사업주가 수행합니다.</p><button className="mt-5 rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white">PDF 저장 / 인쇄</button></div></div></section>
    </main>
  );
}
