import Link from "next/link";

type Props = {
  tbmFormUrl?: string | null;
  compact?: boolean;
  className?: string;
};

export default function TbmFormAction({ tbmFormUrl, compact = false, className = "" }: Props) {
  return (
    <div
      className={`rounded-2xl border border-blue-700/60 bg-blue-950/30 p-4 ${className}`}
    >
      <div className="mb-3">
        <p className="text-base font-black text-white sm:text-lg">오늘 TBM 작성</p>
        {!compact && (
          <p className="mt-1 text-sm leading-relaxed text-blue-100">
            현장 TBM은 모바일 폼에서 작성하고, 작성 후 세메앱에서 증빙·조치상태를 확인합니다.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        {tbmFormUrl ? (
          <a
            href={tbmFormUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white shadow-sm hover:bg-blue-500"
          >
            오늘 TBM 작성하기
          </a>
        ) : (
          <span className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-bold text-slate-400">
            TBM 작성 링크 준비 중
          </span>
        )}

        <Link
          href="/tbm"
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-900"
        >
          작성 내역 확인
        </Link>
      </div>
    </div>
  );
}
