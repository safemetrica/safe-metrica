type RiskSharePackMonthlySummaryProps = {
  periodLabel: string;
  shareConfirmationCount: number;
  workerReportCount: number;
  reviewNeededCount: number;
  representativeConfirmationCount: number;
  objectionCount: number;
  exportReadyStatus: "준비 가능" | "확인 필요";
  hasLoadWarning: boolean;
  isRichiFullOperation?: boolean;
};

export default function RiskSharePackMonthlySummary({
  periodLabel,
  shareConfirmationCount,
  workerReportCount,
  reviewNeededCount,
  representativeConfirmationCount,
  objectionCount,
  exportReadyStatus,
  hasLoadWarning,
  isRichiFullOperation = false,
}: RiskSharePackMonthlySummaryProps) {
  const totalParticipationCount =
    shareConfirmationCount +
    workerReportCount +
    representativeConfirmationCount;

  const summaryItems = [
    {
      label: isRichiFullOperation ? "현장 확인·참여 기록" : "공유·참여 기록",
      value: `${totalParticipationCount}건`,
      description: isRichiFullOperation
        ? "근로자 현장 확인·의견, 근로자대표 참여확인을 합산한 월간 운영기록입니다."
        : "근로자 공유확인, 현장 의견, 근로자대표 참여확인을 합산한 월간 운영기록입니다.",
    },
    {
      label: isRichiFullOperation ? "검토 대기 항목" : "관리자 검토 필요",
      value: `${reviewNeededCount}건`,
      description: isRichiFullOperation
        ? "현장 확인을 제외하고, 검토 또는 보완 확인이 필요한 기록입니다."
        : "공유확인을 제외하고, 검토 또는 보완 확인이 필요한 기록입니다.",
    },
    {
      label: isRichiFullOperation ? "검토 의견" : "보완 의견",
      value: `${objectionCount}건`,
      description:
        "근로자대표 참여확인 중 별도 의견 또는 보완 의견이 포함된 기록입니다.",
    },
    {
      label: isRichiFullOperation ? "이번 달 자료" : "고객 전달자료",
      value: exportReadyStatus,
      description: isRichiFullOperation
        ? "내부 운영자가 확인 후 이번 달 운영기록 또는 전달자료로 정리할 수 있는 상태입니다."
        : "내부 운영자가 확인 후 월간 요약 또는 CSV 전달자료로 정리할 수 있는 상태입니다.",
    },
  ];

  return (
    <section
      className={
        isRichiFullOperation
          ? "rounded-3xl border border-[#D6EDE6] bg-white p-5 shadow-sm"
          : "rounded-3xl border border-indigo-500/25 bg-slate-900/85 p-5 shadow-xl shadow-slate-950/30"
      }
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p
            className={
              isRichiFullOperation
                ? "text-sm font-bold text-teal-700"
                : "text-sm font-bold text-indigo-300"
            }
          >
            {isRichiFullOperation ? "월간 운영기록" : "월간 요약 후보"}
          </p>
          <h2
            className={
              isRichiFullOperation
                ? "mt-1 text-xl font-black text-[#102033]"
                : "mt-1 text-xl font-black text-white"
            }
          >
            {isRichiFullOperation
              ? "이번 달 운영기록"
              : "Risk Share Pack 월간 운영요약"}
          </h2>
          <p
            className={
              isRichiFullOperation
                ? "mt-2 max-w-3xl text-sm leading-6 text-slate-600"
                : "mt-2 max-w-3xl text-sm leading-6 text-slate-300"
            }
          >
            {isRichiFullOperation
              ? `${periodLabel} 기준으로 현장 확인·의견, 근로자대표 참여확인, 관리자 검토 필요 항목을 한눈에 확인합니다.`
              : `${periodLabel} 기준으로 공유확인, 현장 의견, 근로자대표 참여확인, 관리자 검토 필요 항목을 한눈에 확인합니다.`}
          </p>
        </div>

        <span
          className={
            isRichiFullOperation
              ? "w-fit rounded-full border border-teal-100 bg-teal-50 px-4 py-2 text-xs font-black text-teal-700"
              : "w-fit rounded-full border border-slate-700 bg-slate-950/70 px-4 py-2 text-xs font-black text-slate-300"
          }
        >
          내부 운영자 검토 후 고객 전달
        </span>
      </div>

      {hasLoadWarning ? (
        <div
          className={
            isRichiFullOperation
              ? "mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800"
              : "mt-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-100"
          }
        >
          {isRichiFullOperation
            ? "일부 기록 조회가 실패했거나 설정 확인이 필요합니다. 고객 전달 전 접수함과 전달자료 준비 상태를 다시 확인하세요."
            : "일부 원장 조회가 실패했거나 설정 확인이 필요합니다. 고객 전달 전 접수함과 Export를 다시 확인하세요."}
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {summaryItems.map((item) => (
          <article
            key={item.label}
            className={
              isRichiFullOperation
                ? "rounded-2xl border border-[#D6EDE6] bg-white p-4"
                : "rounded-2xl border border-slate-700 bg-slate-950/60 p-4"
            }
          >
            <p
              className={
                isRichiFullOperation
                  ? "text-sm font-bold text-teal-700"
                  : "text-sm font-bold text-slate-400"
              }
            >
              {item.label}
            </p>
            <p
              className={
                isRichiFullOperation
                  ? "mt-2 text-2xl font-black text-[#102033]"
                  : "mt-2 text-2xl font-black text-white"
              }
            >
              {item.value}
            </p>
            <p
              className={
                isRichiFullOperation
                  ? "mt-2 text-sm leading-6 text-slate-600"
                  : "mt-2 text-sm leading-6 text-slate-400"
              }
            >
              {item.description}
            </p>
          </article>
        ))}
      </div>

      <p className="mt-4 text-xs leading-5 text-slate-500">
        월간 요약은 입력된 운영기록을 정리하는 화면입니다. 법적 판단이나 조치
        판단을 대신하지 않습니다.
      </p>
    </section>
  );
}
