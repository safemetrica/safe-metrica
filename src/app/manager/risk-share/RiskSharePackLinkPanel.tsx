import Link from "next/link";

export default function RiskSharePackLinkPanel({
  companyName,
  companyCode,
  isRichiFullOperation = false,
}: {
  companyName: string;
  companyCode: string;
  isRichiFullOperation?: boolean;
}) {
  const encodedCompanyCode = encodeURIComponent(companyCode);

  const linkCards = isRichiFullOperation
    ? [
        {
          title: "근로자 현장 확인·의견",
          description:
            "근로자가 작업 전 위생·안전 확인, 의견 없음 제출, 불편사항, 개선의견을 입력하는 현장 진입 화면입니다.",
          href: "/field/participation?company=richi",
          cta: "현장참여 화면 열기",
        },
        {
          title: "TBM 운영기록",
          description:
            "작업 전 TBM 기록을 작성하고 최근 운영기록을 확인하는 화면입니다.",
          href: "/tbm?company=richi",
          cta: "TBM 화면 열기",
        },
        {
          title: "근로자대표 참여확인",
          description:
            "근로자대표 확인 링크 생성, 제출 현황, 폐기·만료 상태를 관리하는 화면입니다.",
          href: "/manager/representative-confirmations?company=richi",
          cta: "대표확인 링크 관리",
        },
        {
          title: "월간 운영기록",
          description:
            "현장 확인·의견, 근로자대표 참여확인 중심의 월간 운영기록입니다.",
          href: "/monthly-report/risk-share?company=richi",
          cta: "월간 운영기록 보기",
        },
      ]
    : [
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
    <section
      className={
        isRichiFullOperation
          ? "rounded-3xl border border-[#D6EDE6] bg-white p-5 shadow-sm"
          : "rounded-3xl border border-sky-500/25 bg-slate-900/85 p-5 shadow-xl shadow-slate-950/30"
      }
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p
            className={
              isRichiFullOperation
                ? "text-sm font-bold text-teal-700"
                : "text-sm font-bold text-sky-300"
            }
          >
            링크 / QR 운영
          </p>
          <h2
            className={
              isRichiFullOperation
                ? "mt-1 text-xl font-black text-[#102033]"
                : "mt-1 text-xl font-black text-white"
            }
          >
            {isRichiFullOperation
              ? "SafeMetrica 현장 운영 링크"
              : "Risk Share Pack 현장 진입 링크"}
          </h2>
          <p
            className={
              isRichiFullOperation
                ? "mt-2 max-w-3xl text-sm leading-6 text-slate-600"
                : "mt-2 max-w-3xl text-sm leading-6 text-slate-300"
            }
          >
            {isRichiFullOperation
              ? `${companyName} 기준으로 근로자 현장 확인·의견, 근로자대표 참여확인, 월간 운영기록 진입 흐름을 관리합니다.`
              : `${companyName} 기준으로 근로자 공유확인, 현장 의견, 근로자대표 참여확인, 월간요약 진입 흐름을 관리합니다.`}
          </p>
        </div>

        <span
          className={
            isRichiFullOperation
              ? "w-fit rounded-full border border-teal-100 bg-teal-50 px-4 py-2 text-xs font-black text-teal-700"
              : "w-fit rounded-full border border-slate-700 bg-slate-950/70 px-4 py-2 text-xs font-black text-slate-300"
          }
        >
          {isRichiFullOperation
            ? "리치코리아 운영 링크"
            : `현재 업체 코드: ${companyCode}`}
        </span>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        {linkCards.map((card) => (
          <article
            key={card.title}
            className={
              isRichiFullOperation
                ? "flex flex-col justify-between rounded-2xl border border-[#D6EDE6] bg-white p-4"
                : "flex flex-col justify-between rounded-2xl border border-slate-700 bg-slate-950/60 p-4"
            }
          >
            <div>
              <h3
                className={
                  isRichiFullOperation
                    ? "text-base font-black text-[#102033]"
                    : "text-base font-black text-white"
                }
              >
                {card.title}
              </h3>
              <p
                className={
                  isRichiFullOperation
                    ? "mt-2 text-sm leading-6 text-slate-600"
                    : "mt-2 text-sm leading-6 text-slate-400"
                }
              >
                {card.description}
              </p>
            </div>

            <Link
              href={card.href}
              className={
                isRichiFullOperation
                  ? "mt-4 inline-flex items-center justify-center rounded-2xl bg-[#16A085] px-4 py-3 text-sm font-black text-white hover:bg-[#12806A]"
                  : "mt-4 inline-flex items-center justify-center rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-black text-slate-950 hover:bg-cyan-300"
              }
            >
              {card.cta}
            </Link>
          </article>
        ))}
      </div>

      <div
        className={
          isRichiFullOperation
            ? "mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800"
            : "mt-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100"
        }
      >
        {isRichiFullOperation
          ? "고객 전달자료에는 고객 확인 전 항목, 내부 운영 메모, 보안 민감정보를 포함하지 않습니다."
          : "QR 포스터는 고객별 현장 배포 전 내부 운영자가 링크 범위와 안내 문구를 확인한 뒤 생성하는 구조로 운영합니다. 실제 고객 데이터, 내부 인증정보, 내부 원장 주소는 QR 안내문에 노출하지 않습니다."}
      </div>
    </section>
  );
}
