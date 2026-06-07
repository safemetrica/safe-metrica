import Link from "next/link";
import type { CompanyConfig } from "@/lib/company";

type NewsItem = {
  title: string;
  link: string;
  tag: string;
  color: string;
};

type SafetyCaseCard = {
  id: string;
  title: string;
  accidentType: string;
  action: string;
  source: "KOSHA" | "SAMPLE";
};

type HomeSafetyNewsSectionProps = {
  company: Pick<CompanyConfig, "code" | "name" | "industryTag">;
};

const NEWS_SOURCES = [
  {
    url: "https://news.google.com/rss/search?q=산업재해+사고&hl=ko&gl=KR&ceid=KR:ko",
    tag: "사고",
    color: "red",
  },
  {
    url: "https://news.google.com/rss/search?q=안전사고+현장&hl=ko&gl=KR&ceid=KR:ko",
    tag: "안전",
    color: "blue",
  },
  {
    url: "https://news.google.com/rss/search?q=중대재해&hl=ko&gl=KR&ceid=KR:ko",
    tag: "중대",
    color: "orange",
  },
];

async function getSafetyNews(): Promise<NewsItem[]> {
  const results = await Promise.allSettled(
    NEWS_SOURCES.map(async (source) => {
      const response = await fetch(source.url);
      const xml = await response.text();
      const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];

      return items
        .slice(0, 4)
        .map((item) => {
          const title =
            item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ??
            item.match(/<title>(.*?)<\/title>/)?.[1] ??
            "";
          const link = item.match(/<link>(.*?)<\/link>/)?.[1] ?? "#";

          return {
            title: title.replace(/&amp;/g, "&").trim(),
            link: link.trim(),
            tag: source.tag,
            color: source.color,
          };
        })
        .filter((item) => item.title);
    }),
  );

  return results
    .filter(
      (result): result is PromiseFulfilledResult<NewsItem[]> =>
        result.status === "fulfilled",
    )
    .flatMap((result) => result.value);
}

async function getSafetyCases(
  company: HomeSafetyNewsSectionProps["company"],
): Promise<SafetyCaseCard[]> {
  const baseUrl =
    process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : "https://safe-metrica.vercel.app";
  const params = new URLSearchParams({
    companySeed: company.code ?? "",
    companyName: company.name ?? "",
    industryTag: company.industryTag ?? "",
  });
  const response = await fetch(
    `${baseUrl}/api/safety-news?${params.toString()}`,
    {
      cache: "no-store",
    },
  );

  if (!response.ok) return [];

  const data = (await response.json()) as { cards?: SafetyCaseCard[] };
  return data.cards ?? [];
}

export function HomeSafetyNewsFallback() {
  return (
    <div className="mt-4 grid gap-3 xl:grid-cols-2">
      <SafetyCasesCard safetyCases={[]} />
      <SafetyNewsCard safetyNews={[]} />
    </div>
  );
}

export default async function HomeSafetyNewsSection({
  company,
}: HomeSafetyNewsSectionProps) {
  const [safetyNews, safetyCases] = await Promise.all([
    getSafetyNews().catch(() => []),
    getSafetyCases(company).catch(() => []),
  ]);

  return (
    <div className="mt-4 grid gap-3 xl:grid-cols-2">
      <SafetyCasesCard safetyCases={safetyCases} />
      <SafetyNewsCard safetyNews={safetyNews} />
    </div>
  );
}

function SafetyCasesCard({ safetyCases }: { safetyCases: SafetyCaseCard[] }) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">오늘 TBM 체크포인트</h2>
          <p className="mt-1 text-xs text-slate-500">
            최근 안전사고 사례를 참고해 오늘 확인할 항목입니다.
          </p>
        </div>
        <span className="text-xs text-yellow-400">KOSHA</span>
      </div>
      {safetyCases.length === 0 ? (
        <p className="text-xs text-slate-600">
          안전사고 사례를 불러오는 중입니다.
        </p>
      ) : (
        <div className="space-y-2">
          {safetyCases.slice(0, 2).map((item) => (
            <div
              key={item.id}
              className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2"
            >
              <div className="flex items-start gap-2">
                <span className="shrink-0 rounded bg-red-950 px-1.5 py-0.5 text-[11px] font-bold text-red-300">
                  {item.accidentType}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">{item.title}</p>
                  <p className="mt-1 truncate text-xs text-emerald-300">
                    {item.action}
                  </p>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-600">
                  출처:{" "}
                  {item.source === "KOSHA" ? "KOSHA 안전사례" : "예시 사례"}
                </span>
                <Link
                  href={`/tbm?safetyCase=${encodeURIComponent(item.id)}&check=${encodeURIComponent(item.action)}`}
                  className="shrink-0 rounded-full bg-blue-600 px-3 py-1 text-[11px] font-semibold transition hover:bg-blue-500"
                >
                  TBM 체크
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function SafetyNewsCard({ safetyNews }: { safetyNews: NewsItem[] }) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">산업안전 동향</h2>
          <p className="mt-1 text-xs text-slate-500">
            현장 안전관리자가 참고할 최신 안전 이슈입니다.
          </p>
        </div>
        <span className="text-xs text-slate-600">뉴스</span>
      </div>
      {safetyNews.length === 0 ? (
        <p className="text-xs text-slate-600">
          산업안전 동향을 불러오는 중입니다.
        </p>
      ) : (
        <div className="space-y-2">
          {safetyNews.slice(0, 3).map((news, index) => (
            <a
              key={`${news.link}-${index}`}
              href={news.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2"
            >
              <span
                className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-bold ${news.color === "red" ? "bg-red-950 text-red-400" : news.color === "orange" ? "bg-orange-950 text-orange-400" : "bg-blue-950 text-blue-400"}`}
              >
                안전 이슈
              </span>
              <span className="truncate text-xs text-slate-400 transition group-hover:text-white">
                {news.title}
              </span>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
