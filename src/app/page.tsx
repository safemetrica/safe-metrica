import Link from "next/link";
import { redirect } from "next/navigation";
import { getCompanyConfig } from "@/lib/company";

const menus = [
  {
    href: "/tbm",
    icon: "📋",
    label: "TBM 현황",
    sub: "오늘 안전회의와 작업 전 공유 기록을 확인합니다.",
    tone: "border-blue-200 bg-blue-50 text-blue-700",
    badge: "현장 기록",
  },
  {
    href: "/ebm",
    icon: "📚",
    label: "Evidence Book",
    sub: "사진·서명·조치 증빙을 한곳에서 관리합니다.",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
    badge: "증빙 관리",
  },
  {
    href: "/ptw",
    icon: "🧾",
    label: "고위험작업허가서",
    sub: "PTW 승인 대기와 허가 상태를 확인합니다.",
    tone: "border-orange-200 bg-orange-50 text-orange-700",
    badge: "작업허가",
  },
  {
    href: "/dashboard",
    icon: "📊",
    label: "대표 대시보드",
    sub: "오늘 위험, 조치, 증빙 상태를 요약합니다.",
    tone: "border-indigo-200 bg-indigo-50 text-indigo-700",
    badge: "대표 보고",
  },
  {
    href: "/field",
    icon: "👷",
    label: "현장 비서",
    sub: "관리감독자가 오늘 할 일을 바로 확인합니다.",
    tone: "border-teal-200 bg-teal-50 text-teal-700",
    badge: "현장 실행",
  },
  {
    href: "/kosha",
    icon: "🏅",
    label: "KOSHA 인정심사",
    sub: "인정심사 준비 항목과 이행률을 확인합니다.",
    tone: "border-amber-200 bg-amber-50 text-amber-700",
    badge: "점검 준비",
  },
];
async function getWeather() {
  try {
   const now = new Date();
const kst = new Date(now.getTime() + 9 * 3600000);

// 기상청 초단기실황은 발표 지연을 고려해 60분 전 정각을 기준으로 조회
const ncstBase = new Date(kst.getTime() - 60 * 60 * 1000);
const ncstDate = ncstBase.toISOString().slice(0, 10).replace(/-/g, "");
const ncstTime = String(ncstBase.getHours()).padStart(2, "0") + "00";

const fcstDate = kst.toISOString().slice(0, 10).replace(/-/g, "");
const hour = kst.getHours();
    const key = process.env.WEATHER_API_KEY;
    const nx = process.env.WEATHER_NX ?? "55";
    const ny = process.env.WEATHER_NY ?? "124";
    if (!key) return { tmp: null, wsd: null, pty: "0", pop: 0, alerts: [], icon: "⛅", decision: null, stopRequired: false };

    const ncstUrl = `https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst?serviceKey=${key}&pageNo=1&numOfRows=20&dataType=JSON&base_date=${ncstDate}&base_time=${ncstTime}&nx=${nx}&ny=${ny}`;
    const fcstTimes = [2,5,8,11,14,17,20,23];
    const baseH = fcstTimes.filter(t => t <= hour).pop() ?? 23;
    const fcstTime = String(baseH).padStart(2,"0") + "00";
    const fcstUrl = `https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst?serviceKey=${key}&pageNo=1&numOfRows=100&dataType=JSON&base_date=${fcstDate}&base_time=${fcstTime}&nx=${nx}&ny=${ny}`;

        const [ncstRes, fcstRes] = await Promise.all([
      fetch(ncstUrl, { cache: "no-store" }),
      fetch(fcstUrl, { next: { revalidate: 3600 } }),
    ]);

    const [ncstData, fcstData] = await Promise.all([
      ncstRes.json(),
      fcstRes.json(),
    ]);

    type WeatherItem = {
      category?: string;
      obsrValue?: string;
      fcstValue?: string;
    };

    const ncstItems = (ncstData?.response?.body?.items?.item ??
      []) as WeatherItem[];

    const fcstItems = (fcstData?.response?.body?.items?.item ??
      []) as WeatherItem[];

    const getNcst = (cat: string) =>
      ncstItems.find((i) => i.category === cat)?.obsrValue;

    const getFcst = (cat: string) =>
      fcstItems.find((i) => i.category === cat)?.fcstValue;

    const tmp = parseFloat(getNcst("T1H") ?? "20");
    const wsd = parseFloat(getNcst("WSD") ?? "0");
    const feelsLike = Number.isFinite(tmp) ? Math.round(tmp) : null;
    const observedAt = `${ncstTime.slice(0, 2)}:00`;
    const pty = getNcst("PTY") ?? "0";
    const pop = parseInt(getFcst("POP") ?? "0");
    const sky = getFcst("SKY") ?? "1";

    const alerts: string[] = [];
    if (wsd >= 10) alerts.push(`🚨 강풍 ${wsd}m/s — 고소작업 확인 필요`);
    if (tmp >= 33) alerts.push(`☀️ 폭염 ${tmp}°C — 온열질환 주의`);
    if (tmp <= -10) alerts.push(`🥶 한파 ${tmp}°C — 저체온증 위험`);
    if (pty !== "0") alerts.push(`🌧️ 현재 강수 감지 — 야외작업 주의`);
    else if (pop >= 40) alerts.push(`🌦️ 강수확률 ${pop}% — 야외작업 시 우비 준비`);
    else if (pop >= 20) alerts.push(`☁️ 강수확률 ${pop}% — 날씨 변화 주의`);

    // 의사결정 티켓 판정
    const stopRequired = wsd >= 10; // 기상 위험 확인 기준
    const limitRequired = tmp >= 33 || tmp <= -10 || pty !== "0";
    const decision = stopRequired ? "STOP" : limitRequired ? "LIMIT" : "NORMAL";

    const icon = pty !== "0" ? "🌧️" : pop >= 40 ? "🌦️" : sky === "4" ? "☁️" : sky === "3" ? "⛅" : tmp >= 33 ? "☀️" : tmp <= 0 ? "🌨️" : "☀️";

    return { tmp, feelsLike, observedAt, wsd, pty, pop, alerts, icon, decision, stopRequired };
  } catch {
    return { tmp: null, feelsLike: null, observedAt: null, wsd: null, pty: null, pop: 0, alerts: [], icon: "⛅", decision: null, stopRequired: false };
  }
}

export const dynamic = "force-dynamic";

export default async function Home() {
  const company = await getCompanyConfig().catch(() => null);

  if (!company) {
    redirect("/login?error=tenant_required");
  }

  const weather = await getWeather();
  const today = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" });

  const decisionConfig = {
    STOP: {
      bg: "bg-red-50 border-red-200",
      badge: "bg-red-100 text-red-700 ring-1 ring-red-200",
      label: "🚨 작업중지 필요",
      desc: "풍속 상승 등 기상 위험 요인을 현장 책임자가 확인해야 합니다.",
      action: "작업 범위와 진행 여부를 확인하고 관리 이력으로 남기세요.",
    },
    LIMIT: {
      bg: "bg-amber-50 border-amber-200",
      badge: "bg-amber-100 text-amber-700 ring-1 ring-amber-200",
      label: "🟡 제한 운영",
      desc: "기상 상황에 따라 작업 범위와 이동 동선을 확인하세요.",
      action: "현장 확인 후 필요한 경우 작업 범위를 조정하세요.",
    },
    NORMAL: {
      bg: "bg-emerald-50 border-emerald-200",
      badge: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200",
      label: "🟢 정상 작업",
      desc: "기상 특이사항은 없습니다.",
      action: "작업 전 TBM에서 날씨와 이동 동선을 함께 확인하세요.",
    },
  };

  // RSS 뉴스
  type NewsItem = {title:string; link:string; tag:string; color:string};
  const NEWS_SRCS = [
    {url:'https://news.google.com/rss/search?q=산업재해+사고&hl=ko&gl=KR&ceid=KR:ko', tag:'사고', color:'red'},
    {url:'https://news.google.com/rss/search?q=안전사고+현장&hl=ko&gl=KR&ceid=KR:ko', tag:'안전', color:'blue'},
    {url:'https://news.google.com/rss/search?q=중대재해&hl=ko&gl=KR&ceid=KR:ko', tag:'중대', color:'orange'},
  ];
  let safetyNews: NewsItem[] = [];
  try {
    const rr = await Promise.allSettled(NEWS_SRCS.map(async (s) => {
      const r = await fetch(s.url);
      const xml = await r.text();
      const ms = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
      return ms.slice(0,4).map(item => {
        const t = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] || item.match(/<title>(.*?)<\/title>/)?.[1] || '';
        const l = item.match(/<link>(.*?)<\/link>/)?.[1] || '#';
        return {title:t.replace(/&amp;/g,'&').trim(), link:l.trim(), tag:s.tag, color:s.color};
      }).filter(x => x.title);
    }));
    safetyNews = rr.filter((r): r is PromiseFulfilledResult<NewsItem[]> => r.status==='fulfilled').flatMap(r=>r.value);
  } catch { safetyNews = []; }
    type SafetyCaseCard = {
    id: string;
    title: string;
    accidentType: string;
    action: string;
    source: "KOSHA" | "SAMPLE";
  };

  let safetyCases: SafetyCaseCard[] = [];

  try {
    const baseUrl =
  process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : "https://safe-metrica.vercel.app";

const safetyNewsParams = new URLSearchParams({
  companySeed: company.code ?? "",
  companyName: company.name ?? "",
  industryTag: company.industryTag ?? "",
});

const res = await fetch(`${baseUrl}/api/safety-news?${safetyNewsParams.toString()}`, {
  cache: "no-store",
});

    if (res.ok) {
      const data = (await res.json()) as { cards?: SafetyCaseCard[] };
      safetyCases = data.cards ?? [];
    }
  } catch {
    safetyCases = [];
  } 
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white/95 px-4 py-4 shadow-sm sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-2xl ring-1 ring-blue-100">
              🛡️
            </div>
            <div>
              <h1 className="text-xl font-black leading-tight text-slate-950">
                SafeMetrica™
              </h1>
              <p className="text-sm font-medium text-slate-500">
                {company.name} · 산업안전 통합 관리 플랫폼
              </p>
            </div>
          </div>

          <div className="hidden text-right sm:block">
            <div className="text-sm font-semibold text-slate-500">{today}</div>
            <div className="mt-1 inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700 ring-1 ring-emerald-100">
              ● 시스템 정상
            </div>
          </div>
        </div>
      </header>

      <section className="border-b border-slate-200 bg-gradient-to-br from-white via-blue-50/70 to-emerald-50/60 px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-5 lg:grid-cols-[1.35fr_0.9fr] lg:items-stretch">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="mb-4 inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-700 ring-1 ring-blue-100">
                오늘의 안전운영
              </div>
              <h2 className="text-2xl font-black leading-tight text-slate-950 sm:text-4xl">
                오늘 확인할 안전관리 항목을
                <br className="hidden sm:block" />
                한눈에 봅니다.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600">
                위험성평가, TBM, 증빙, 작업허가 상태를 한 화면에서 확인하고 관리합니다.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700">TBM</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700">Evidence Book</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700">PTW</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700">Risk Intelligence</span>
              </div>
            </div>

            {weather.tmp !== null && weather.decision && (() => {
              const cfg = decisionConfig[weather.decision as keyof typeof decisionConfig];

              return (
                <div className={`rounded-3xl border p-5 shadow-sm ${cfg.bg}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-slate-800">{weather.icon} 현재 날씨</p>
                      <p className="mt-1 text-sm font-medium text-slate-500">
                        기상청 기준 {weather.observedAt}
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-sm font-black ${cfg.badge}`}>
                      {cfg.label}
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl bg-white/80 p-3 ring-1 ring-slate-200">
                      <p className="text-slate-500">기온</p>
                      <p className="mt-1 text-xl font-black text-slate-950">{weather.tmp}°C</p>
                    </div>
                    <div className="rounded-2xl bg-white/80 p-3 ring-1 ring-slate-200">
                      <p className="text-slate-500">체감</p>
                      <p className="mt-1 text-xl font-black text-slate-950">{weather.feelsLike}°C</p>
                    </div>
                    <div className="rounded-2xl bg-white/80 p-3 ring-1 ring-slate-200">
                      <p className="text-slate-500">풍속</p>
                      <p className="mt-1 text-xl font-black text-slate-950">{weather.wsd}m/s</p>
                    </div>
                    <div className="rounded-2xl bg-white/80 p-3 ring-1 ring-slate-200">
                      <p className="text-slate-500">강수확률</p>
                      <p className="mt-1 text-xl font-black text-slate-950">{weather.pop}%</p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl bg-white/80 p-4 ring-1 ring-slate-200">
                    <p className="text-sm font-black text-slate-800">{cfg.desc}</p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">{cfg.action}</p>
                  </div>

                  {weather.alerts.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {weather.alerts.map((a, i) => (
                        <p key={i} className="text-sm font-bold text-red-600">{a}</p>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </section>

      <section className="px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-slate-950 sm:text-2xl">
                주요 메뉴
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                오늘 확인할 업무로 바로 이동합니다.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {menus.map((m) => (
              <Link
                key={m.href}
                href={m.href}
                className={`group rounded-3xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${m.tone}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-3xl shadow-sm ring-1 ring-slate-200">
                    {m.icon}
                  </div>
                  <span className="rounded-full bg-white/85 px-3 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-200">
                    {m.badge}
                  </span>
                </div>
                <div className="mt-5">
                  <div className="text-xl font-black text-slate-950">
                    {m.label}
                  </div>
                  <p className="mt-2 min-h-[44px] text-sm leading-relaxed text-slate-600">
                    {m.sub}
                  </p>
                </div>
                <div className="mt-4 flex h-11 items-center justify-between rounded-2xl bg-white/85 px-4 text-sm font-black text-slate-700 ring-1 ring-slate-200 group-hover:bg-white">
                  <span>바로가기</span>
                  <span>→</span>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="text-base font-black text-amber-900">안전 수칙</p>
                <p className="mt-1 text-sm leading-relaxed text-amber-800">
                  특이사항 발생 시 Evidence Book에 증빙을 연결하고, 고위험 작업은 PTW 상태를 확인한 뒤 작업을 진행하세요.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <h3 className="text-lg font-black text-slate-950">오늘 예방 체크포인트</h3>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    유사 작업 사례를 참고해 오늘 TBM에서 확인할 항목입니다.
                  </p>
                </div>
                <span className="rounded-full bg-yellow-50 px-3 py-1 text-xs font-black text-yellow-700 ring-1 ring-yellow-200">
                  KOSHA
                </span>
              </div>

              <div className="space-y-3">
                {safetyCases.length > 0 ? (
                  safetyCases.slice(0, 2).map((item) => (
                    <Link
                      key={item.id}
                      href={`/tbm?safetyCase=${encodeURIComponent(item.id)}&check=${encodeURIComponent(item.action)}`}
                      className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-300 hover:bg-blue-50"
                    >
                      <div className="flex items-center gap-2">
                        <span className="shrink-0 whitespace-nowrap rounded-full bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-700 ring-1 ring-amber-100">
                          {item.accidentType}
                        </span>
                        <p className="truncate text-sm font-black text-slate-950">{item.title}</p>
                      </div>
                      <p className="mt-2 text-sm font-bold text-emerald-700">{item.action}</p>
                      <p className="mt-3 text-xs text-slate-400">
                        {item.source === "KOSHA" ? "KOSHA 안전사례" : "참고 사례"}
                      </p>
                    </Link>
                  ))
                ) : (
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm font-medium text-slate-500 ring-1 ring-slate-200">
                    표시할 안전사고 사례가 없습니다.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                    <h3 className="text-lg font-black text-slate-950">안전관리 동향</h3>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    현장 관리자가 참고할 주요 안전관리 소식입니다.
                  </p>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700 ring-1 ring-blue-100">
                  뉴스
                </span>
              </div>

              <div className="space-y-3">
                {safetyNews.length > 0 ? (
                  safetyNews.slice(0, 3).map((news, index) => (
                    <a
                      key={`${news.link}-${index}`}
                      href={news.link}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-300 hover:bg-blue-50"
                    >
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 shrink-0 whitespace-nowrap rounded-full bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700 ring-1 ring-blue-100">
                          안전 이슈
                        </span>
                        <p className="line-clamp-2 text-sm font-bold leading-relaxed text-slate-800">
                          {news.title}
                        </p>
                      </div>
                    </a>
                  ))
                ) : (
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm font-medium text-slate-500 ring-1 ring-slate-200">
                    현재 참고할 최신 안전관리 소식이 없습니다.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
