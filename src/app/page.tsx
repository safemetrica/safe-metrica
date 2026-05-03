import Link from "next/link";
import { SafeNav } from "@/components/SafeLayout";

const menus = [
  { href: "/tbm",       icon: "📋", label: "TBM 현황",       sub: "툴박스미팅 실시간" },
  { href: "/ebm",       icon: "📚", label: "Evidence Book",  sub: "증빙 현황 조회" },
  { href: "/ptw",       icon: "🧾", label: "고위험작업허가서",  sub: "PTW 승인 현황" },
  { href: "/dashboard", icon: "📊", label: "대표 대시보드",    sub: "통계 & 리스크 요약" },
  { href: "/field",     icon: "👷", label: "현장 비서",        sub: "관리감독자 전용" },
  { href: "/kosha",     icon: "🏅", label: "KOSHA 인정심사",  sub: "11개 Gate 이행률 산출" },
];
async function getWeather() {
  try {
    const now = new Date();
    const kst = new Date(now.getTime() + 9 * 3600000);
    const date = kst.toISOString().slice(0, 10).replace(/-/g, "");
    const hour = kst.getHours();
    const time = String(hour).padStart(2, "0") + "00";
    const key = process.env.WEATHER_API_KEY;
    const nx = process.env.WEATHER_NX ?? "55";
    const ny = process.env.WEATHER_NY ?? "124";
    if (!key) return { tmp: null, wsd: null, pty: "0", pop: 0, alerts: [], icon: "⛅", decision: null, stopRequired: false };

    const ncstUrl = `https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst?serviceKey=${key}&pageNo=1&numOfRows=20&dataType=JSON&base_date=${date}&base_time=${time}&nx=${nx}&ny=${ny}`;
    const fcstTimes = [2,5,8,11,14,17,20,23];
    const baseH = fcstTimes.filter(t => t <= hour).pop() ?? 23;
    const fcstTime = String(baseH).padStart(2,"0") + "00";
    const fcstUrl = `https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst?serviceKey=${key}&pageNo=1&numOfRows=100&dataType=JSON&base_date=${date}&base_time=${fcstTime}&nx=${nx}&ny=${ny}`;

    const [ncstRes, fcstRes] = await Promise.all([
      fetch(ncstUrl, { cache: "no-store" }),
      fetch(fcstUrl, { next: { revalidate: 3600 } }),
    ]);
    const [ncstData, fcstData] = await Promise.all([ncstRes.json(), fcstRes.json()]);

    const ncstItems = ncstData?.response?.body?.items?.item ?? [];
    const fcstItems = fcstData?.response?.body?.items?.item ?? [];

    const getNcst = (cat: string) => ncstItems.find((i: any) => i.category === cat)?.obsrValue;
    const getFcst = (cat: string) => fcstItems.find((i: any) => i.category === cat)?.fcstValue;

    const tmp = parseFloat(getNcst("T1H") ?? "20");
    const wsd = parseFloat(getNcst("WSD") ?? "0");
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

    return { tmp, wsd, pty, pop, alerts, icon, decision, stopRequired };
  } catch {
    return { tmp: null, wsd: null, pty: null, pop: 0, alerts: [], icon: "⛅", decision: null, stopRequired: false };
  }
}

export const dynamic = "force-dynamic";

export default async function Home() {
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

  return (
    <>
    <SafeNav />
    <div className="min-h-screen bg-[#F6F8FB]">

      {/* 상단 KPI 바 */}
      <div className="bg-[#0F2D5E] px-5 py-3">
        <div className="max-w-3xl mx-auto grid grid-cols-5 gap-2">
          <div className="flex flex-col items-center bg-white/10 rounded-xl px-2 py-2">
            <span className="text-[10px] text-blue-200 font-medium">TBM</span>
            <span className="text-white font-bold text-sm mt-0.5">오늘 진행중</span>
            <span className="w-2 h-2 rounded-full bg-green-400 mt-1"></span>
          </div>
          <div className="flex flex-col items-center bg-white/10 rounded-xl px-2 py-2">
            <span className="text-[10px] text-blue-200 font-medium">EB 미증빙</span>
            {weather ? (
              <span className="text-red-300 font-bold text-sm mt-0.5">확인필요</span>
            ) : (
              <span className="text-white font-bold text-sm mt-0.5">조회중</span>
            )}
            <span className="w-2 h-2 rounded-full bg-yellow-400 mt-1"></span>
          </div>
          <div className="flex flex-col items-center bg-white/10 rounded-xl px-2 py-2">
            <span className="text-[10px] text-blue-200 font-medium">PTW</span>
            <span className="text-white font-bold text-sm mt-0.5">승인대기</span>
            <span className="w-2 h-2 rounded-full bg-gray-400 mt-1"></span>
          </div>
          <div className="flex flex-col items-center bg-white/10 rounded-xl px-2 py-2">
            <span className="text-[10px] text-blue-200 font-medium">날씨</span>
            <span className="text-white font-bold text-sm mt-0.5">{weather ? `${weather.tmp}°C` : "--"}</span>
            <span className={`w-2 h-2 rounded-full mt-1 ${weather?.stopRequired ? "bg-red-400" : "bg-green-400"}`}></span>
          </div>
          <div className="flex flex-col items-center bg-white/10 rounded-xl px-2 py-2">
            <span className="text-[10px] text-blue-200 font-medium">시스템</span>
            <span className="text-white font-bold text-sm mt-0.5">정상</span>
            <span className="w-2 h-2 rounded-full bg-green-400 mt-1"></span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-5 space-y-5">

        {/* 날씨 카드 */}
        {weather && (
          <div className={`rounded-2xl p-4 border-l-4 ${weather.stopRequired ? "bg-red-50 border-red-500" : "bg-white border-green-500"} shadow-sm`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{weather.icon}</span>
                <div>
                  <p className={`font-bold text-sm ${weather.stopRequired ? "text-red-700" : "text-slate-700"}`}>
                    {weather.decision === "STOP" ? "🚨 작업 중단 기상" : weather.decision === "LIMIT" ? "⚠️ 제한 운영" : "✅ 정상 작업 가능"}
                  </p>
                  <p className="text-slate-500 text-xs mt-0.5">{weather.tmp}°C · 풍속 {weather.wsd}m/s · 강수확률 {weather.pty}%</p>
                </div>
              </div>
              <span className="text-xs text-slate-400">{weather.decision === "STOP" ? "현장 책임자 확인 필수" : "현장 책임자 1명 확인"}</span>
            </div>
          </div>
        )}

        {/* 모듈 카드 그리드 */}
        <div>
          <h2 className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-3">주요 메뉴</h2>
          <div className="grid grid-cols-2 gap-3">
            {menus.map((m) => (
              <Link key={m.href} href={m.href}
                className="group bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md hover:border-[#1D6FEB] transition-all duration-200 cursor-pointer">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-2xl">{m.icon}</div>
                  <span className="text-slate-300 group-hover:text-[#1D6FEB] transition-colors text-sm">→</span>
                </div>
                <p className="text-slate-800 font-bold text-[15px]">{m.label}</p>
                <p className="text-slate-400 text-xs mt-1">{m.sub}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* 지금 해야 할 일 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <h2 className="text-slate-700 font-bold text-sm mb-3">⚡ 지금 해야 할 일</h2>
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-2 rounded-xl bg-red-50">
              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
              <p className="text-red-700 text-xs font-medium">특이사항 발생 시 반드시 Evidence Book 등록</p>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-yellow-50">
              <span className="w-2 h-2 rounded-full bg-yellow-500 shrink-0"></span>
              <p className="text-yellow-700 text-xs font-medium">고위험작업은 PTW 제출 후 시작</p>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50">
              <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0"></span>
              <p className="text-slate-600 text-xs font-medium">중대재해 발생 즉시 119 신고</p>
            </div>
          </div>
        </div>

        {/* 산재사고 뉴스 */}
        {(async () => {
          return null;
        })()}
      </div>

      {/* 뉴스 ticker */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0F2D5E] border-t border-blue-900 px-4 py-2 z-40">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <span className="text-[10px] text-blue-300 font-bold shrink-0 bg-blue-800 px-2 py-0.5 rounded">산재뉴스</span>
          <div className="overflow-hidden flex-1">
            <p className="text-blue-100 text-xs whitespace-nowrap animate-marquee">실시간 산업안전 뉴스를 불러오는 중...</p>
          </div>
        </div>
      </div>

    </div>
    </>
  );
}
