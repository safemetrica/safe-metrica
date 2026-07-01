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

export default async function RiskSharePublicFieldEntryPage({
  searchParams,
}: PageProps) {
  const params = (await searchParams) ?? {};
  const companyCode = normalizeCompanyCode(params.company);
  const tenant = companyCode
    ? await getTenantRegistryConfigByCode(companyCode).catch(() => null)
    : null;
  const companyLabel = tenant?.name || companyCode || "고객사";
  const isRiskShareCustomer =
    tenant?.serviceMode === "risk_share_pack" ||
    tenant?.serviceMode === "full_safemetrica";

  const cards = [
    {
      title: "이번 달 위험성평가 공유확인",
      description:
        "공유된 위험요인과 안전조치를 확인하고 전자확인 기록을 남깁니다.",
      href: buildHref("/field/participation", companyCode),
      badge: "근로자 확인",
      tone: "border-blue-200 bg-blue-50 text-blue-950",
      cta: "공유확인 시작",
      disabled: !companyCode || !isRiskShareCustomer,
    },
    {
      title: "오늘 작업 전 안전확인",
      description:
        "작업 전 보호구, 동선, 적재, 설비 주변 주의사항을 확인합니다.",
      href: buildHref("/field/participation", companyCode),
      badge: "작업 전 확인",
      tone: "border-emerald-200 bg-emerald-50 text-emerald-950",
      cta: "작업 전 확인",
      disabled: !companyCode || !isRiskShareCustomer,
    },
    {
      title: "익명 의견 · 아차사고 · 개선제안",
      description:
        "이름과 서명 없이 불편사항, 아차사고, 개선의견을 제출합니다.",
      href: buildHref("/field/anonymous-feedback", companyCode),
      badge: "무기명 제출",
      tone: "border-amber-200 bg-amber-50 text-amber-950",
      cta: "익명 제출",
      disabled: !companyCode || !isRiskShareCustomer,
    },
    {
      title: "외부인 출입 안전확인",
      description:
        "방문자, 납품, 협력업체 출입 전 안전수칙 확인을 위한 입구입니다.",
      href: buildHref("/risk-share/visitor", companyCode),
      badge: "외부인 QR",
      tone: "border-slate-200 bg-slate-50 text-slate-800",
      cta: "외부인 확인",
      disabled: true,
    },
  ];

  return (
    <main className="min-h-screen bg-[#F3F7FA] px-4 py-6 text-slate-950">
      <section className="mx-auto max-w-2xl">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700">
            SafeMetrica Risk Share Pack
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight">
            위공팩 현장 QR
          </h1>
          <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">
            {companyCode
              ? `${companyLabel} 현장 구성원이 확인·의견 제출을 진행하는 무로그인 QR 입구입니다.`
              : "회사코드가 포함된 QR 링크가 필요합니다."}
          </p>
        </div>

        {!companyCode ? (
          <div className="mt-4 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm font-bold leading-7 text-amber-950">
            QR 링크는 /risk-share/field?company=고객코드 형식으로 발급해야 합니다.
          </div>
        ) : !isRiskShareCustomer ? (
          <div className="mt-4 rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm font-bold leading-7 text-rose-950">
            위공팩 또는 Full SafeMetrica 고객코드로 등록된 경우에만 이 QR 입구를 사용할 수 있습니다.
            Owner가 고객코드와 서비스 모드를 확인해 주세요.
          </div>
        ) : null}

        <div className="mt-4 grid gap-3">
          {cards.map((card) => {
            const className = `block rounded-3xl border p-5 shadow-sm transition ${card.tone} ${
              card.disabled ? "cursor-not-allowed opacity-60" : "hover:-translate-y-0.5 hover:shadow-md"
            }`;

            const content = (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-black">{card.title}</h2>
                    <p className="mt-2 text-sm font-semibold leading-6 opacity-80">
                      {card.description}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-white/75 px-3 py-1 text-xs font-black">
                    {card.badge}
                  </span>
                </div>
                <span className="mt-4 inline-flex rounded-2xl bg-slate-950 px-4 py-2 text-sm font-black text-white">
                  {card.disabled ? "준비 또는 설정 확인 필요" : card.cta}
                </span>
              </>
            );

            return card.disabled ? (
              <div key={card.title} className={className} aria-disabled="true">
                {content}
              </div>
            ) : (
              <Link key={card.title} href={card.href} className={className}>
                {content}
              </Link>
            );
          })}
        </div>

        <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 text-xs font-bold leading-6 text-slate-500">
          근로자와 외부인은 로그인 없이 QR로 참여합니다. 관리자와 대표 화면은 고객사 계정 기반으로 분리합니다.
          이 화면은 위험성평가 작성 대행이나 법적 적합성 보장을 의미하지 않습니다.
        </div>
      </section>
    </main>
  );
}
