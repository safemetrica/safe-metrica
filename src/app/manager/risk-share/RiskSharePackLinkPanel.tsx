import Link from "next/link";

export default function RiskSharePackLinkPanel({
  companyName,
  companyCode,
}: {
  companyName: string;
  companyCode: string;
}) {
  const encodedCompanyCode = encodeURIComponent(companyCode);

  const linkCards = [
    {
      title: "근로자 공유확인·현장 의견",
      description:
        "근로자가 위험성평가 공유확인, 의견 없음 제출, 위험제보, 아차사고, 개선제안을 입력하는 현장 진입 화면입니다.",
      href: `/field/participation?company=${encodedCompanyCode}`,
      cta: "현장참여 화면 열기",
    },
    {
      title: "근로자대표 참여확인",
      description:
        "근로자대표 확인 링크 생성, 제출 현황, 폐기·만료 상태를 관리하는 화면입니다.",
      href: "/manager/representative-confirmations",
      cta: "대표확인 링크 관리",
    },
    {
      title: "공유팩 월간 운영요약",
      description:
        "공유확인, 현장 의견, 근로자대표 참여확인 중심의 공유팩 전용 월간요약입니다.",
      href: "/monthly-report/risk-share",
      cta: "월간요약 보기",
    },
  ];

  return (
    <section className="rounded-3xl border border-sky-500/25 bg-slate-900/85 p-5 shadow-xl shadow-slate-950/30">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-bold text-sky-300">링크 / QR 운영</p>
          <h2 className="mt-1 text-xl font-black text-white">
            Risk Share Pack 현장 진입 링크
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
            {companyName} 기준으로 근로자 공유확인, 현장 의견, 근로자대표 참여확인,
            월간요약 진입 흐름을 관리합니다.
          </p>
        </div>

        <span className="w-fit rounded-full border border-slate-700 bg-slate-950/70 px-4 py-2 text-xs font-black text-slate-300">
          현재 업체 코드: {companyCode}
        </span>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        {linkCards.map((card) => (
          <article
            key={card.title}
            className="flex flex-col justify-between rounded-2xl border border-slate-700 bg-slate-950/60 p-4"
          >
            <div>
              <h3 className="text-base font-black text-white">{card.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                {card.description}
              </p>
            </div>

            <Link
              href={card.href}
              className="mt-4 inline-flex items-center justify-center rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-black text-slate-950 hover:bg-cyan-300"
            >
              {card.cta}
            </Link>
          </article>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
        QR 포스터는 고객별 현장 배포 전 내부 운영자가 링크 범위와 안내 문구를 확인한 뒤
        생성하는 구조로 운영합니다. 실제 고객 데이터, 내부 인증정보, 내부 원장 주소는
        QR 안내문에 노출하지 않습니다.
      </div>
    </section>
  );
}
