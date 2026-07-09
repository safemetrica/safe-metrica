type NewsItem = {
  title: string;
  link: string;
};

type SafetyResourceBoardProps = {
  koshaTags: string[];
  koshaLink: string;
  newsItems: NewsItem[];
  newsMoreLink: string;
};

export default function SafetyResourceBoard({ koshaTags, koshaLink, newsItems, newsMoreLink }: SafetyResourceBoardProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-base font-black text-slate-950">안전보건 자료 · 뉴스</h2>
          <p className="text-xs font-semibold text-slate-400">안전보건공단 참고자료와 안전보건 뉴스</p>
        </div>
        <a
          href={newsMoreLink}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-bold text-slate-400 transition hover:text-slate-700"
        >
          전체 보기 →
        </a>
      </div>

      <div className="mt-4 grid gap-2.5 md:grid-cols-2">
        <a
          href={koshaLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 transition hover:border-emerald-200"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-xs font-black text-emerald-600">
            공단
          </span>
          <div className="min-w-0">
            <p className="text-xs font-black text-slate-900">안전보건공단 자료실</p>
            <p className="mt-1 text-[11px] font-semibold leading-4 text-slate-400">
              {koshaTags.join(" · ")} 등 공식 자료를 TBM·작업 전 안내에 참고하세요.
            </p>
          </div>
        </a>

        {newsItems.length > 0 ? (
          newsItems.map((item) => (
            <a
              key={item.link}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 transition hover:border-blue-200"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-xs font-black text-blue-600">
                뉴스
              </span>
              <div className="min-w-0">
                <p className="line-clamp-2 text-xs font-black leading-4 text-slate-900">{item.title}</p>
                <p className="mt-1 text-[11px] font-semibold text-slate-400">안전보건 뉴스</p>
              </div>
            </a>
          ))
        ) : (
          <p className="col-span-full rounded-xl border border-dashed border-slate-200 p-3 text-[11px] font-semibold text-slate-400">
            최신 뉴스를 불러오지 못했습니다. 후속 확인이 필요합니다.
          </p>
        )}
      </div>

      <p className="mt-4 border-t border-slate-100 pt-3 text-xs font-semibold leading-5 text-slate-400">
        이 자료는 운영 참고자료이며, 작업중지 여부나 법적 판단을 대신하지 않습니다.
      </p>
    </section>
  );
}
