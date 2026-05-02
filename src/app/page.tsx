import Link from "next/link";

const menus = [
  { href: "/tbm", icon: "📋", label: "TBM 현황", sub: "툴박스미팅 실시간", color: "from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600", border: "border-blue-500" },
  { href: "/ebm", icon: "📚", label: "Evidence Book", sub: "증빙 현황 조회", color: "from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600", border: "border-emerald-500" },
  { href: "/ptw", icon: "🧾", label: "고위험작업허가서", sub: "PTW 승인 현황", color: "from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600", border: "border-orange-500" },
  { href: "/dashboard", icon: "📊", label: "대표 대시보드", sub: "통계 & 리스크 요약", color: "from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600", border: "border-purple-500" },
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
    if (!key) return { tmp: null, wsd: null, pty: "0", pop: 0, alerts: [], icon: "⛅" };

    // 1) 초단기실황 (현재 기온·풍속·강수형태)
    const ncstUrl = `https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst?serviceKey=${key}&pageNo=1&numOfRows=20&dataType=JSON&base_date=${date}&base_time=${time}&nx=${nx}&ny=${ny}`;
    // 2) 단기예보 (강수확률 POP)
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
    const pop = parseInt(getFcst("POP") ?? "0");  // 강수확률 %
    const sky = getFcst("SKY") ?? "1"; // 1=맑음 3=구름많음 4=흐림

    const alerts: string[] = [];
    if (wsd >= 10) alerts.push(`🚨 강풍 ${wsd}m/s — 고소작업 중단 의무`);
    if (tmp >= 33) alerts.push(`☀️ 폭염 ${tmp}°C — 온열질환 주의`);
    if (tmp <= -10) alerts.push(`🥶 한파 ${tmp}°C — 저체온증 위험`);
    if (pty !== "0") alerts.push(`🌧️ 현재 강수 감지 — 야외작업 주의`);
    else if (pop >= 40) alerts.push(`🌦️ 강수확률 ${pop}% — 야외작업 시 우비 준비`);
    else if (pop >= 20) alerts.push(`☁️ 강수확률 ${pop}% — 날씨 변화 주의`);

    const icon = pty !== "0" ? "🌧️" : pop >= 40 ? "🌦️" : sky === "4" ? "☁️" : sky === "3" ? "⛅" : tmp >= 33 ? "☀️" : tmp <= 0 ? "🌨️" : "☀️";

    return { tmp, wsd, pty, pop, alerts, icon };
  } catch {
    return { tmp: null, wsd: null, pty: null, pop: 0, alerts: [], icon: "⛅" };
  }
}

export const dynamic = "force-dynamic";

export default async function Home() {
  const weather = await getWeather();
  const today = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" });
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
        <p className="text-blue-300 text-xs text-center">㈜대도환경 · 오늘도 안전한 하루 되세요 👷</p>
      </div>
      {weather.tmp !== null && (
        <div className={`px-4 py-3 border-b ${weather.alerts.length > 0 ? "bg-red-950 border-red-900" : "bg-gray-900 border-gray-800"}`}>
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-1">
              <span className="text-white text-sm font-medium">{weather.icon} 현재 날씨 (실황+예보)</span>
              <span className="text-gray-400 text-xs">{weather.tmp}°C · 풍속 {weather.wsd}m/s · 강수확률 {weather.pop}%</span>
            </div>
            {weather.alerts.length > 0
              ? weather.alerts.map((a, i) => <p key={i} className="text-red-300 text-xs font-medium">{a}</p>)
              : <p className="text-gray-400 text-xs">날씨 이상 없음 — 정상 작업 가능</p>}
          </div>
        </div>
      )}
      <div className="p-4 max-w-2xl mx-auto">
        <div className="grid grid-cols-2 gap-3 mt-2">
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
      </div>
    </main>
  );
}
