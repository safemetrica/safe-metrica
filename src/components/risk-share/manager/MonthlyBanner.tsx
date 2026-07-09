import { SAMPLE_MONTHLY_REVIEW_PROGRESS_PERCENT } from "./managerSampleData";

type MonthlyBannerProps = {
  monthLabel: string;
  totalSubmissionCount: number;
  monthlyHref: string;
};

export default function MonthlyBanner({ monthLabel, totalSubmissionCount, monthlyHref }: MonthlyBannerProps) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 p-5 text-white shadow-[0_8px_24px_rgba(18,59,143,0.18)] sm:flex-row sm:items-center">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 text-lg" aria-hidden="true">
        📅
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-black">{monthLabel} 안전운영 요약</h3>
        <p className="mt-0.5 text-xs font-semibold text-white/80">
          이번 달 기록이 월간 운영기록으로 정리되고 있습니다.
        </p>
      </div>
      <div className="w-full sm:w-56">
        <div className="flex items-center justify-between text-[11px] font-bold text-white/80">
          <span>접수 {totalSubmissionCount}건 · 월간 기록 준비</span>
          <b className="text-white">{SAMPLE_MONTHLY_REVIEW_PROGRESS_PERCENT}%</b>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/20">
          <span
            className="block h-full rounded-full bg-white"
            style={{ width: `${SAMPLE_MONTHLY_REVIEW_PROGRESS_PERCENT}%` }}
          />
        </div>
      </div>
      <a
        href={monthlyHref}
        className="flex shrink-0 items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-blue-700 transition hover:bg-blue-50"
      >
        월간 요약 보기 <span aria-hidden="true">→</span>
      </a>
    </section>
  );
}
