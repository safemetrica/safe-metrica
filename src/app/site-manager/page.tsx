import Link from "next/link";

export const dynamic = "force-dynamic";

const mainCards = [
  {
    href: "/tbm",
    icon: "📋",
    title: "오늘 TBM",
    desc: "안전회의 전 교육·위험요인 공유·사진/서명 기록",
  },
  {
    href: "/ptw",
    icon: "🧾",
    title: "PTW 고위험작업허가",
    desc: "고소·화기·밀폐·전기 등 고위험작업 확인",
  },
  {
    href: "/field",
    icon: "👷",
    title: "현장비서 브리핑",
    desc: "오늘 미조치·특이사항·현장의견·증빙누락 확인",
  },
  {
    href: "/risk",
    icon: "⚠️",
    title: "위험성평가 현황",
    desc: "TBM과 연결할 위험요인·개선대책·공유확인",
  },
  {
    href: "/monthly-report",
    icon: "📑",
    title: "월간보고서",
    desc: "월간 운영 결과·미조치·누락·개선현황 확인",
  },
];

export default function SiteManagerHome() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-5 text-white">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-3xl border border-cyan-800 bg-slate-900 p-5 shadow-sm">
          <p className="text-xs font-black text-cyan-300">SafeMetrica 현장관리자</p>
          <h1 className="mt-2 text-2xl font-black">현장관리자 운영 홈</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            TBM 작성, PTW 확인, 현장비서 브리핑, 위험성평가 현황, 월간보고서를 한 화면에서 빠르게 확인합니다.
          </p>
        </section>

        <section className="mt-4 grid gap-3 sm:grid-cols-2">
          {mainCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="rounded-3xl border border-slate-700 bg-slate-900 p-5 shadow-sm transition hover:border-cyan-500 active:scale-[0.99]"
            >
              <div className="text-3xl">{card.icon}</div>
              <h2 className="mt-3 text-lg font-black">{card.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">{card.desc}</p>
            </Link>
          ))}
        </section>

        <section className="mt-4 rounded-3xl border border-amber-700 bg-amber-950/40 p-5">
          <p className="text-xs font-black text-amber-300">오늘 TBM 참고자료</p>
          <h2 className="mt-2 text-xl font-black">안전사고 사례와 안전뉴스를 TBM에 반영하세요</h2>
          <p className="mt-3 text-sm leading-6 text-amber-100">
            KOSHA 사고사례, 최근 안전뉴스, 오늘 작업 위험요인을 확인한 뒤 작업 전 회의와 위험성평가 공유에 반영합니다.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Link href="/kosha" className="rounded-2xl border border-amber-600 bg-slate-950 px-4 py-4 text-sm font-black text-amber-200">
              🏅 KOSHA 인정심사 / 안전사례 보기
            </Link>
            <Link href="/home" className="rounded-2xl border border-amber-600 bg-slate-950 px-4 py-4 text-sm font-black text-amber-200">
              📰 홈에서 안전뉴스 확인
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
