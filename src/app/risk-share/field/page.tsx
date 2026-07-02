import Link from "next/link";
import { getTenantRegistryConfigByCode } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  searchParams?: Promise<{
    company?: string;
  }>;
};

function normalizeCompanyCode(value?: string | null) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 64);
}

function buildHref(path: string, companyCode: string) {
  return `${path}?company=${encodeURIComponent(companyCode)}`;
}

function FieldQrShell({
  children,
  description,
}: {
  children: React.ReactNode;
  description: string;
}) {
  return (
    <main className="min-h-screen bg-[#EEF4F8] px-4 py-5 text-slate-950">
      <section className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-md flex-col justify-center">
        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl">
          <div className="bg-gradient-to-br from-[#083A6B] via-[#0B5EA8] to-[#19B7A4] p-6 text-white">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[0.68rem] font-black tracking-tight text-white/90">
              SafeMetrica 위공팩 현장 QR
            </div>
            <h1 className="mt-5 text-3xl font-black leading-tight tracking-tight">
              위험성평가
              <br />
              공유확인 운영팩
            </h1>
            <p className="mt-4 text-sm font-semibold leading-7 text-white/85">
              {description}
            </p>
          </div>

          {children}
        </div>

        <p className="mt-4 rounded-3xl border border-slate-200 bg-white px-5 py-4 text-xs font-bold leading-6 text-slate-500 shadow-sm">
          근로자와 외부인은 로그인 없이 QR로 참여합니다. 기록은 관리자 검토와 사업주 확인을 돕기 위한 안전운영 자료로 남습니다.
        </p>
      </section>
    </main>
  );
}

function InvalidQrNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-4">
      <div className="rounded-3xl border border-amber-100 bg-amber-50 px-5 py-5 text-sm font-bold leading-7 text-amber-950">
        {children}
      </div>
    </div>
  );
}

export default async function RiskSharePublicFieldEntryPage({
  searchParams,
}: PageProps) {
  const params = (await searchParams) ?? {};
  const companyCode = normalizeCompanyCode(params.company);
  const tenant = companyCode
    ? await getTenantRegistryConfigByCode(companyCode).catch(() => null)
    : null;
  const companyLabel = tenant?.name || companyCode || "현장";
  const isRiskShareCustomer =
    tenant?.serviceMode === "risk_share_pack" ||
    tenant?.serviceMode === "full_safemetrica";

  if (!companyCode) {
    return (
      <FieldQrShell description="전달받은 현장 QR 링크로 접속해 주세요.">
        <InvalidQrNotice>
          회사코드가 포함된 QR 링크가 필요합니다. 현장 담당자에게 새 QR 링크를 요청해 주세요.
        </InvalidQrNotice>
      </FieldQrShell>
    );
  }

  if (!isRiskShareCustomer) {
    return (
      <FieldQrShell description="전달받은 QR 링크를 확인할 수 없습니다. 현장 담당자에게 최신 QR 링크를 요청해 주세요.">
        <InvalidQrNotice>
          이 QR 링크는 아직 사용할 수 없습니다. 현장 담당자에게 최신 QR 링크를 요청해 주세요.
        </InvalidQrNotice>
      </FieldQrShell>
    );
  }

  const cards = [
    {
      title: "이번 달 위험성평가 공유확인",
      description:
        "공유된 위험요인과 안전조치를 확인하고 근로자 확인 기록을 남깁니다.",
      href: buildHref("/field/participation", companyCode),
      badge: "공유확인",
      accent: "bg-blue-600",
      surface: "border-blue-100 bg-blue-50/80",
      text: "text-blue-950",
      cta: "공유확인 시작",
    },
    {
      title: "작업 전 안전확인",
      description:
        "작업 전 보호구, 동선, 적재·하역, 설비 주변 주의사항을 짧게 확인합니다.",
      href: buildHref("/field/participation", companyCode),
      badge: "작업 전 확인",
      accent: "bg-emerald-600",
      surface: "border-emerald-100 bg-emerald-50/80",
      text: "text-emerald-950",
      cta: "작업 전 확인 시작",
    },
    {
      title: "익명 의견·아차사고·개선제안",
      description:
        "이름과 확인서명 없이 현장 불편, 아차사고, 개선제안을 남깁니다.",
      href: buildHref("/field/anonymous-feedback", companyCode),
      badge: "익명 제출",
      accent: "bg-amber-500",
      surface: "border-amber-100 bg-amber-50/90",
      text: "text-amber-950",
      cta: "익명 의견 제출",
    },
  ];

  return (
    <FieldQrShell description={`${companyLabel} 구성원이 공유확인, 작업 전 확인, 익명 의견 제출을 진행합니다.`}>
      <div className="space-y-3 p-4">
        {cards.map((card) => {
          const className = `block rounded-3xl border p-4 shadow-sm ${card.surface} transition hover:-translate-y-0.5 hover:shadow-md`;

          return (
            <Link key={card.title} href={card.href} className={className}>
              <div className="flex items-start gap-4">
                <span className={`mt-1 h-10 w-1.5 rounded-full ${card.accent}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className={`text-lg font-black leading-6 ${card.text}`}>
                      {card.title}
                    </h2>
                    <span className="shrink-0 rounded-full bg-white/80 px-2.5 py-1 text-[0.68rem] font-black text-slate-600">
                      {card.badge}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                    {card.description}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <span className="inline-flex min-h-10 items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-black text-white">
                  {card.cta}
                </span>
              </div>
            </Link>
          );
        })}

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-start gap-4">
            <span className="mt-1 h-10 w-1.5 rounded-full bg-slate-400" />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-black leading-6 text-slate-800">
                  외부인 출입 안전확인
                </h2>
                <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[0.68rem] font-black text-slate-500">
                  준비 중
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                방문자·납품·협력업체 확인은 고객사 운영 방식에 맞춰 별도 QR로 분리해 운영합니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </FieldQrShell>
  );
}
