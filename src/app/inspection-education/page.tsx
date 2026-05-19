import Link from "next/link";

const modules = [
  {
    title: "순회점검",
    desc: "관리감독자 순회점검, 동행자, 지적사항, 개선 예정일을 관리합니다.",
    status: "준비 중",
  },
  {
    title: "차량점검",
    desc: "운행 전 차량 안전점검, 타이어·등화·적재함·후방 확인 기록을 관리합니다.",
    status: "준비 중",
  },
  {
    title: "법정교육",
    desc: "정기교육, 신규채용자 교육, 특별교육, 관리감독자 교육 이수현황을 관리합니다.",
    status: "준비 중",
  },
];

export default function InspectionEducationPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-5 py-6 text-white">
      <div className="mx-auto max-w-5xl">
        <Link href="/home" className="text-sm font-semibold text-cyan-300 hover:text-cyan-200">
          ← 홈으로
        </Link>

        <section className="mt-6 rounded-3xl border border-cyan-500/30 bg-slate-900/80 p-6 shadow-2xl">
          <p className="text-sm font-bold text-cyan-300">Inspection · Education</p>
          <h1 className="mt-2 text-3xl font-black">점검·교육</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            순회점검, 차량점검, 법정교육 기록을 SafeMetrica 운영 데이터와 연결하기 위한 기본 화면입니다.
            향후 Notion DB 연동 후 월간보고서와 대표 대시보드에 이행현황을 반영합니다.
          </p>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          {modules.map((item) => (
            <article key={item.title} className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold">{item.title}</h2>
                <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-200">
                  {item.status}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-400">{item.desc}</p>
            </article>
          ))}
        </section>

        <section className="mt-6 rounded-2xl border border-slate-700 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">운영 기준</h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
            <li>• 교육·주의사항은 Evidence Book 필수 항목이 아니라 TBM 공유·교육 기록으로 관리합니다.</li>
            <li>• 점검 기록은 담당자, 점검일, 지적사항, 개선 예정일, 완료 증빙을 기준으로 관리합니다.</li>
            <li>• 법정교육은 교육기관을 대체하지 않고, 이수현황과 증빙 누락을 줄이는 운영 데이터로 관리합니다.</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
