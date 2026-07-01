import { requireTenantManagerAccessForCurrentSession } from "@/lib/tenant-auth/tenantAccessServerGuards";
import type { TenantAccessDeniedReason } from "@/lib/tenant-auth/tenantAuthTypes";

type TenantManagerPlaceholderPageProps = {
  params: Promise<{
    tenantCode?: string;
  }>;
};

function createTenantManagerGuardMessage(reason: TenantAccessDeniedReason) {
  switch (reason) {
    case "unauthenticated":
      return "로그인 확인 전에는 접근할 수 없습니다.";
    case "tenant_not_found":
      return "요청한 운영공간을 확인할 수 없습니다.";
    case "membership_required":
      return "이 운영공간에 연결된 사용자 확인이 필요합니다.";
    case "forbidden":
      return "이 운영공간 화면에 접근할 권한이 없습니다.";
  }
}

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

export default async function TenantManagerPlaceholderPage({
  params,
}: TenantManagerPlaceholderPageProps) {
  const { tenantCode } = await params;
  const accessResult = await requireTenantManagerAccessForCurrentSession({
    tenantCode,
  });
  const guardMessage = accessResult.ok
    ? "운영공간 접근 확인이 완료되었습니다."
    : createTenantManagerGuardMessage(accessResult.reason);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <p className="text-sm font-black text-cyan-700">운영공간 접근 안내</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
          고객사 운영공간 준비 화면
        </h2>
        <p className="mt-3 text-base font-semibold leading-7 text-slate-700">
          접근 권한이 확인되면 이곳에서 오늘 확인 항목, 현장 QR, 접수함, 월간 운영기록을 순차적으로 사용할 수 있습니다.
        </p>
      </section>

      <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm font-bold leading-6 text-rose-900">
        {guardMessage} 아직 운영자료는 표시하지 않습니다.
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
