type FieldReferenceWeatherCardProps = {
  status: "live" | "fallback";
  headline: string | null;
  tags: string[];
};

export default function FieldReferenceWeatherCard({ status, headline, tags }: FieldReferenceWeatherCardProps) {
  const alertTag = tags.find((tag) => tag.includes("주의"));

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-black text-slate-900">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-xs font-black"
            aria-hidden="true"
          >
            ☀︎
          </span>
          작업 전 기상 확인
        </p>
        {alertTag ? (
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-600">
            {alertTag}
          </span>
        ) : null}
      </div>

      <p className="mt-3 text-sm font-bold leading-6 text-slate-700">
        {status === "live" && headline ? headline : "기상 정보를 불러오지 못했습니다. 작업 전 현장에서 직접 확인하세요."}
      </p>

      {tags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-500"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      <p className="mt-3 text-[11px] font-semibold leading-5 text-slate-400">관리자 확인 후 반영해 주세요.</p>
    </article>
  );
}
