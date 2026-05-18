import Link from "next/link";
import { redirect } from "next/navigation";
import { getCompanyConfig } from "@/lib/company";
import TbmFormAction from "@/components/TbmFormAction";

import { getTbmFormUrl } from "@/lib/tenantLinks";
const menus = [
  { href: "/monthly-report", icon: "📑", label: "월간보고서", sub: "월별 안전운영 요약", color: "from-sky-600 to-blue-700 hover:from-sky-500 hover:to-blue-600", border: "border-sky-500" },
  { href: "/tbm", icon: "📋", label: "TBM 현황", sub: "툴박스미팅 실시간", color: "from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600", border: "border-blue-500" },
  { href: "/ebm", icon: "📚", label: "Evidence Book", sub: "증빙 현황 조회", color: "from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600", border: "border-emerald-500" },
  { href: "/ptw", icon: "🧾", label: "고위험작업허가서", sub: "PTW 승인 현황", color: "from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600", border: "border-orange-500" },
  { href: "/dashboard", icon: "📊", label: "대표 대시보드", sub: "통계 & 리스크 요약", color: "from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600", border: "border-purple-500" },
  { href: "/field", icon: "👷", label: "현장 비서", sub: "관리감독자 전용", color: "from-teal-600 to-teal-700 hover:from-teal-500 hover:to-teal-600", border: "border-teal-500" },
  { href: "/kosha", icon: "🏅", label: "KOSHA 인정심사", sub: "11개 Gate 이행률 자동 산출", color: "from-yellow-700 to-yellow-800 hover:from-yellow-600 hover:to-yellow-700" },
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
    if (wsd >= 10) alerts.push(`🚨 강풍 ${wsd}m/s — 고소작업 중단 의무`);
    if (tmp >= 33) alerts.push(`☀️ 폭염 ${tmp}°C — 온열질환 주의`);
    if (tmp <= -10) alerts.push(`🥶 한파 ${tmp}°C — 저체온증 위험`);
    if (pty !== "0") alerts.push(`🌧️ 현재 강수 감지 — 야외작업 주의`);
    else if (pop >= 40) alerts.push(`🌦️ 강수확률 ${pop}% — 야외작업 시 우비 준비`);
    else if (pop >= 20) alerts.push(`☁️ 강수확률 ${pop}% — 날씨 변화 주의`);

    // 의사결정 티켓 판정
    const stopRequired = wsd >= 10; // 법적 작업중지 의무 (산안법 기준)
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

  const tbmFormUrl = getTbmFormUrl(company);

  const weather = await getWeather();
  const today = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" });

  const decisionConfig = {
    STOP: {
      bg: "bg-red-950 border-red-700",
      badge: "bg-red-700 text-white",
      label: "🚨 작업중지 필요",
      desc: "풍속 10m/s 이상 — 고소작업 법적 중단 의무 (산안법)",
      action: "현장 책임자 확인 후 중단 조치 → 대표 사후 보고 필수",
    },
    LIMIT: {
      bg: "bg-yellow-950 border-yellow-700",
      badge: "bg-yellow-600 text-white",
      label: "🟡 제한 운영",
      desc: "기상 임계값 도달 — 작업 범위 축소 권고",
      action: "현장 책임자 판단 → 계속/제한 선택 시 대표 사후 보고",
    },
    NORMAL: {
      bg: "bg-gray-900 border-gray-700",
      badge: "bg-green-700 text-white",
      label: "🟢 정상 작업",
      desc: "기상 이상 없음",
      action: "정상 운영 가능",
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
    <main className="min-h-screen bg-gray-950">
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🛡️</span>
          <div>
            <h1 className="text-white font-bold text-xl leading-tight">SafeMetrica™</h1>
            <p className="text-gray-400 text-xs">산업안전 통합 관리 플랫폼</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-gray-400 text-xs">{today}</div>
          <div className="text-emerald-400 text-xs font-medium mt-0.5">● 시스템 정상</div>
        </div>
      </div>

      <div className="px-4 py-3 bg-blue-950 border-b border-blue-900">
        <p className="text-blue-300 text-xs text-center">
  {company.name} · 오늘도 안전한 하루 되세요 👷
</p>
              <TbmFormAction tbmFormUrl={tbmFormUrl} className="mt-4" />

      </div>

      {weather.tmp !== null && weather.decision && (() => {
        const cfg = decisionConfig[weather.decision as keyof typeof decisionConfig];
        return (
          <div className={`px-4 py-4 border-b ${cfg.bg}`}>
            <div className="max-w-2xl mx-auto">
              {/* 날씨 수치 */}
              <div className="flex items-center justify-between mb-3">
                <span className="whitespace-nowrap text-base font-black text-white sm:text-sm">{weather.icon} 현재 날씨</span>
                <span className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-gray-300 sm:text-xs">
                  <span className="whitespace-nowrap">기온 {weather.tmp}°C</span>
                  <span className="whitespace-nowrap">체감 {weather.feelsLike}°C</span>
                  <span className="whitespace-nowrap">풍속 {weather.wsd}m/s</span>
                  <span className="whitespace-nowrap">강수확률 {weather.pop}%</span>
                </span>
              </div><p className="text-blue-200 text-xs mt-1">기상청 초단기실황 기준 {weather.observedAt}</p>

              {/* 의사결정 티켓 */}
              <div className={`rounded-xl border p-3 ${cfg.bg}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${cfg.badge}`}>{cfg.label}</span>
                  <span className="text-xs text-gray-400">현장 책임자 1명 확인 필수</span>
                </div>
                <p className="text-white text-xs font-medium mb-1">{cfg.desc}</p>
                <p className="text-gray-400 text-xs">{cfg.action}</p>
              </div>

              {/* 경보 목록 */}
              {weather.alerts.length > 0 && (
                <div className="mt-2 space-y-1">
                  {weather.alerts.map((a, i) => (
                    <p key={i} className="text-red-300 text-xs font-medium">{a}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      <div className="p-4 max-w-5xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
          {menus.map((m) => (
            <Link key={m.href} href={m.href}
              className={`bg-gradient-to-br ${m.color} border ${m.border} border-opacity-40 rounded-2xl p-5 transition-all duration-200 active:scale-95 shadow-lg`}>
              <div className="text-4xl mb-3">{m.icon}</div>
              <div className="text-white font-bold text-sm leading-tight">{m.label}</div>
              <div className="text-white text-xs mt-1 opacity-75">{m.sub}</div>
            </Link>
          ))}
        </div>
        <div className="mt-4 bg-gray-900 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-yellow-400">⚠️</span>
            <span className="text-white text-sm font-semibold">안전 수칙</span>
          </div>
          <p className="text-gray-400 text-xs leading-relaxed">특이사항 발생 시 반드시 Evidence Book 등록 · 고위험작업은 PTW 제출 후 시작 · 중대재해 발생 즉시 119 신고</p>
        </div>

                {/* KOSHA TBM 체크포인트 + 산업안전 동향 */}
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="rounded-xl bg-gray-900 border border-gray-800 p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 text-sm">●</span>
                  <span className="text-white text-sm font-semibold">
                    오늘 TBM 체크포인트
                  </span>
                </div>
                <p className="text-gray-500 text-xs mt-1">
                  최근 안전사고 사례를 참고해 오늘 확인할 항목입니다.
                </p>
              </div>
              <span className="text-yellow-400 text-xs shrink-0">KOSHA</span>
            </div>

            {safetyCases.length === 0 ? (
              <p className="text-gray-600 text-xs">
                안전사고 사례를 불러오는 중입니다.
              </p>
            ) : (
              <div className="space-y-2">
                {safetyCases.slice(0, 2).map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg bg-gray-950 border border-gray-800 px-3 py-2"
                  >
                    <div className="flex items-start gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-red-950 text-red-300 text-[11px] font-bold shrink-0">
                        {item.accidentType}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-white text-xs font-semibold truncate">
                          {item.title}
                        </p>
                        <p className="text-emerald-300 text-xs mt-1 truncate">
                          {item.action}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <span className="text-gray-600 text-[11px]">
                        출처: {item.source === "KOSHA" ? "KOSHA 안전사례" : "예시 사례"}
                      </span>
                      <Link
                        href={`/tbm?safetyCase=${encodeURIComponent(
                          item.id
                        )}&check=${encodeURIComponent(item.action)}`}
                        className="rounded-full bg-blue-600 hover:bg-blue-500 px-3 py-1 text-[11px] font-semibold text-white transition"
                      >
                        TBM 체크
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl bg-gray-900 border border-gray-800 p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-blue-400 text-sm">●</span>
                  <span className="text-white text-sm font-semibold">
                    산업안전 동향
                  </span>
                </div>
                <p className="text-gray-500 text-xs mt-1">
                  현장 안전관리자가 참고할 최신 안전 이슈입니다.
                </p>
              </div>
              <span className="text-gray-600 text-xs shrink-0">뉴스</span>
            </div>

            {safetyNews.length === 0 ? (
              <p className="text-gray-600 text-xs">
                산업안전 동향을 불러오는 중입니다.
              </p>
            ) : (
              <div className="space-y-2">
                {safetyNews.slice(0, 3).map((news, i) => (
                  <a
                    key={`${news.link}-${i}`}
                    href={news.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg bg-gray-950 border border-gray-800 px-3 py-2 group"
                  >
                    <span className={`px-1.5 py-0.5 rounded text-[11px] font-bold shrink-0 ${
                      news.color === "red"
                        ? "bg-red-950 text-red-400"
                        : news.color === "orange"
                        ? "bg-orange-950 text-orange-400"
                        : "bg-blue-950 text-blue-400"
                    }`}>
                      안전 이슈
                    </span>
                    <span className="text-gray-400 text-xs group-hover:text-white transition truncate">
                      {news.title}
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}