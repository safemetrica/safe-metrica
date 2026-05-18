import Link from "next/link";

type Props = {
  tbmFormUrl?: string | null;
  compact?: boolean;
  className?: string;
};

export default function TbmFormAction({ tbmFormUrl, compact = false, className = "" }: Props) {
  return (
    <div className={`rounded-xl border border-blue-700/60 bg-blue-950/30 px-4 py-2 ${className}`}>
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-col gap-0.5 md:flex-row md:items-center md:gap-3">
            <p className="whitespace-nowrap text-sm font-black text-white sm:text-base">
              오늘 TBM 작성
            </p>
            {!compact && (
              <p className="truncate text-xs font-medium text-blue-100 sm:text-sm">
                모바일 폼 작성 후 세메앱에서 작성 내역과 증빙·조치상태를 확인합니다.
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          {tbmFormUrl ? (
            <a
              href={tbmFormUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center justify-center rounded-lg bg-blue-600 px-3 text-xs font-black text-white shadow-sm hover:bg-blue-500 sm:px-4 sm:text-sm"
            >
              오늘 TBM 작성하기
            </a>
          ) : (
            <span className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-3 text-xs font-bold text-slate-400 sm:px-4 sm:text-sm">
              TBM 작성 링크 준비 중
            </span>
          )}

          <Link
            href="/tbm"
            className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs font-bold text-slate-200 hover:bg-slate-900 sm:px-4 sm:text-sm"
          >
            작성 내역 확인
          </Link>
        </div>
      </div>
    </div>
  );
}
