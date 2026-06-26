import { requireTenantAccessPlaceholder } from "@/lib/tenant-auth/tenantAuthGuards";

const PLACEHOLDER_SECTIONS = [
  {
    title: "오늘 확인할 항목",
    description: "운영공간별 작업 현황과 확인 필요 항목을 표시할 예정입니다.",
  },
  {
    title: "현장 QR",
    description: "현장 참여와 QR 기반 안내를 해당 회사 범위 안에서 준비합니다.",
  },
  {
    title: "접수함",
    description: "운영 관리자가 확인할 접수 항목 영역입니다.",
  },
  {
    title: "월간 운영기록",
    description: "월간 운영 흐름을 운영공간 단위 화면으로 정리할 예정입니다.",
  },
];

export default async function TenantManagerPlaceholderPage() {
  const accessResult = await requireTenantAccessPlaceholder();
  const guardMessage = accessResult.ok
    ? "운영공간 접근 확인이 완료되었습니다."
    : "로그인 확인 전에는 접근할 수 없습니다.";

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <p className="text-sm font-black text-cyan-700">관리자 준비 화면</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
          신규 고객 로그인 구조 준비 화면
        </h2>
        <p className="mt-3 text-base font-semibold leading-7 text-slate-700">
          이 화면은 신규 고객 로그인 구조 준비용 화면이며 실제 고객 데이터는 연결하지 않았습니다.
        </p>
      </section>

      <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm font-bold leading-6 text-rose-900">
        {guardMessage} 현재 화면은 실제 고객 데이터와 연결하지 않은 준비 화면입니다.
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {PLACEHOLDER_SECTIONS.map((section) => (
          <article
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            key={section.title}
          >
            <h3 className="text-xl font-black text-slate-950">{section.title}</h3>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
              {section.description}
            </p>
          </article>
        ))}
      </section>
    </div>
  );
}
