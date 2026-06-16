import Link from "next/link";

type Props = {
  tbmFormUrl?: string | null;
  voiceDraftHref?: string | null;
  compact?: boolean;
  className?: string;
};

export default function TbmFormAction({
  tbmFormUrl,
  voiceDraftHref,
  compact = false,
  className = "",
}: Props) {
  return (
    <div className={`w-full max-w-full rounded-xl border border-blue-700/60 bg-blue-950/30 px-3 py-2 sm:px-4 ${className}`}>
      <div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-col gap-0.5 md:flex-row md:items-center md:gap-3">
            <p className="whitespace-nowrap text-sm font-black text-white sm:text-base">
              TBM
            </p>
            {!compact && (
              <p className="truncate text-xs font-medium text-blue-100 sm:text-sm">
                모바일 폼 작성 후 세메앱에서 작성 내역과 증빙·조치상태를 확인합니다.
              </p>
            )}
          </div>
        </div>

        <div className="grid w-full min-w-0 shrink-0 grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
          {voiceDraftHref ? (
            <Link
              href={voiceDraftHref}
              className="inline-flex h-9 min-w-0 items-center justify-center rounded-lg border border-cyan-400 bg-cyan-500 px-2 text-center text-[11px] font-black text-slate-950 shadow-sm hover:bg-cyan-400 sm:min-w-[150px] sm:px-4 sm:text-sm"
            >
              🎙️ 말로 TBM 작성
            </Link>
          ) : null}

          {tbmFormUrl ? (
            <a
              href={tbmFormUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 min-w-0 items-center justify-center rounded-lg bg-blue-600 px-2 text-center text-[11px] font-black text-white shadow-sm hover:bg-blue-500 sm:min-w-[150px] sm:px-4 sm:text-sm"
            >
              오늘 TBM 작성하기
            </a>
          ) : (
            <span className="col-span-2 inline-flex h-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-3 text-[11px] font-bold text-slate-400 sm:col-span-1 sm:h-9 sm:px-4 sm:text-sm">
              TBM 작성 링크 준비 중
            </span>
          )}

          <Link
            href="/tbm"
            className="col-span-2 inline-flex h-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-950 px-3 text-[11px] font-bold text-slate-300 hover:bg-slate-900 sm:col-span-1 sm:h-9 sm:px-4 sm:text-sm"
          >
            작성 내역 확인
          </Link>
        </div>
      </div>
    </div>
  );
}
