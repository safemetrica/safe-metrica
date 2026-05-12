import Link from "next/link";
import { redirect } from "next/navigation";
import { getCompanyConfig } from "@/lib/company";

const menus = [
  {
    href: "/tbm",
    icon: "📋",
    label: "TBM 현황",
    sub: "툴박스미팅 실시간",
  },
  {
    href: "/ebm",
    icon: "📚",
    label: "Evidence Book",
    sub: "증빙 현황 조회",
  },
  {
    href: "/ptw",
    icon: "🧾",
    label: "고위험작업허가서",
    sub: "PTW 승인 현황",
  },
  {
    href: "/dashboard",
    icon: "📊",
    label: "대표 대시보드",
    sub: "통계 & 리스크 요약",
  },
  {
    href: "/field",
    icon: "👷",
    label: "현장 비서",
    sub: "관리감독자 전용",
  },
  {
    href: "/kosha",
    icon: "🏅",
    label: "KOSHA 인정심사",
    sub: "11개 Gate 이행률",
  },
];

type AccidentType =
  | "떨어짐"
  | "끼임"
  | "부딪힘"
  | "맞음"
  | "깔림"
  | "넘어짐"
  | "화재폭발"
  | "질식중독"
  | "기타";

type IndustryTag = "공통" | "폐기물" | "건설" | "제조" | "물류";

type SafetyCaseCard = {
  id: string;
  title: string;
  date: string;
  location: string;
  accidentType: AccidentType;
  industryTag: IndustryTag;
  summary: string;
  action: string;
  source: "KOSHA" | "SAMPLE";
  relevanceScore: number;
  isSimilarIndustry: boolean;
};

type SafetyNewsResponse = {
  ok: boolean;
  title: string;
  subtitle: string;
  source: "KOSHA" | "SAMPLE";
  cards: SafetyCaseCard[];
};

type WeatherDecision = "STOP" | "LIMIT" | "NORMAL";

type WeatherData = {
  tmp: number | null;
  feelsLike: number | null;
  observedAt: string | null;
  wsd: number | null;
  pty: string | null;
  pop: number;
  alerts: string[];
  icon: string;
  decision: WeatherDecision | null;
};

type WeatherItem = {
  category?: string;
  obsrValue?: string;
  fcstValue?: string;
};

type WeatherApiResponse = {
  response?: {
    body?: {
      items?: {
        item?: WeatherItem[] | WeatherItem;
      };
    };
  };
};

function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

function normalizeWeatherItems(items: WeatherItem[] | WeatherItem | undefined) {
  if (!items) return [];
  return Array.isArray(items) ? items : [items];
}

async function getSafetyCases() {
  try {
    const res = await fetch(`${getBaseUrl()}/api/safety-news`, {
      cache: "no-store",
    });

    if (!res.ok) return [];

    const data = (await res.json()) as SafetyNewsResponse;
    return data.cards ?? [];
  } catch {
    return [];
  }
}

async function getWeather(): Promise<WeatherData> {
  try {
    const now = new Date();
    const kst = new Date(now.getTime() + 9 * 3600000);

    const ncstBase = new Date(kst.getTime() - 60 * 60 * 1000);
    const ncstDate = ncstBase.toISOString().slice(0, 10).replace(/-/g, "");
    const ncstTime = String(ncstBase.getHours()).padStart(2, "0") + "00";

    const fcstDate = kst.toISOString().slice(0, 10).replace(/-/g, "");
    const hour = kst.getHours();

    const key = process.env.WEATHER_API_KEY;
    const nx = process.env.WEATHER_NX ?? "55";
    const ny = process.env.WEATHER_NY ?? "124";

    if (!key) {
      return {
        tmp: null,
        feelsLike: null,
        observedAt: null,
        wsd: null,
        pty: null,
        pop: 0,
        alerts: [],
        icon: "⛅",
        decision: null,
      };
    }

    const ncstUrl = `https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst?serviceKey=${key}&pageNo=1&numOfRows=20&dataType=JSON&base_date=${ncstDate}&base_time=${ncstTime}&nx=${nx}&ny=${ny}`;

    const fcstTimes = [2, 5, 8, 11, 14, 17, 20, 23];
    const baseH = fcstTimes.filter((t) => t <= hour).pop() ?? 23;
    const fcstTime = String(baseH).padStart(2, "0") + "00";

    const fcstUrl = `https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst?serviceKey=${key}&pageNo=1&numOfRows=100&dataType=JSON&base_date=${fcstDate}&base_time=${fcstTime}&nx=${nx}&ny=${ny}`;

    const [ncstRes, fcstRes] = await Promise.all([
      fetch(ncstUrl, { cache: "no-store" }),
      fetch(fcstUrl, { next: { revalidate: 3600 } }),
    ]);

    const [ncstData, fcstData] = (await Promise.all([
      ncstRes.json(),
      fcstRes.json(),
    ])) as [WeatherApiResponse, WeatherApiResponse];

    const ncstItems = normalizeWeatherItems(
      ncstData.response?.body?.items?.item
    );
    const fcstItems = normalizeWeatherItems(
      fcstData.response?.body?.items?.item
    );

    const getNcst = (cat: string) =>
      ncstItems.find((i) => i.category === cat)?.obsrValue;

    const getFcst = (cat: string) =>
      fcstItems.find((i) => i.category === cat)?.fcstValue;

    const tmp = Number.parseFloat(getNcst("T1H") ?? "20");
    const wsd = Number.parseFloat(getNcst("WSD") ?? "0");
    const pty = getNcst("PTY") ?? "0";
    const pop = Number.parseInt(getFcst("POP") ?? "0", 10);
    const sky = getFcst("SKY") ?? "1";

    const safeTmp = Number.isFinite(tmp) ? tmp : null;
    const safeWsd = Number.isFinite(wsd) ? wsd : null;
    const safePop = Number.isFinite(pop) ? pop : 0;

    const alerts: string[] = [];
    if (safeWsd !== null && safeWsd >= 10) {
      alerts.push(`강풍 ${safeWsd}m/s — 고소작업 제한 검토`);
    }
    if (safeTmp !== null && safeTmp >= 33) {
      alerts.push(`폭염 ${safeTmp}°C — 온열질환 예방조치 확인`);
    }
    if (safeTmp !== null && safeTmp <= -10) {
      alerts.push(`한파 ${safeTmp}°C — 저체온증 예방조치 확인`);
    }
    if (pty !== "0") {
      alerts.push("현재 강수 감지 — 야외작업 전 상태 확인");
    } else if (safePop >= 40) {
      alerts.push(`강수확률 ${safePop}% — 야외작업 대비`);
    }

    const decision: WeatherDecision =
      safeWsd !== null && safeWsd >= 10
        ? "STOP"
        : (safeTmp !== null && (safeTmp >= 33 || safeTmp <= -10)) || pty !== "0"
        ? "LIMIT"
        : "NORMAL";

    const icon =
      pty !== "0"
        ? "🌧️"
        : safePop >= 40
        ? "🌦️"
        : sky === "4"
        ? "☁️"
        : sky === "3"
        ? "⛅"
        : safeTmp !== null && safeTmp <= 0
        ? "🌨️"
        : "☀️";

    return {
      tmp: safeTmp,
      feelsLike: safeTmp !== null ? Math.round(safeTmp) : null,
      observedAt: `${ncstTime.slice(0, 2)}:00`,
      wsd: safeWsd,
      pty,
      pop: safePop,
      alerts,
      icon,
      decision,
    };
  } catch {
    return {
      tmp: null,
      feelsLike: null,
      observedAt: null,
      wsd: null,
      pty: null,
      pop: 0,
      alerts: [],
      icon: "⛅",
      decision: null,
    };
  }
}

export const dynamic = "force-dynamic";

export default async function Home() {
  const company = await getCompanyConfig().catch(() => null);

  if (!company) {
    redirect("/login?error=tenant_required");
  }

  const weather = await getWeather();
  const safetyCases = await getSafetyCases();

  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  const decisionConfig = {
    STOP: {
      badge: "bg-red-500/15 text-red-300 border-red-500/30",
      label: "주의 확인",
      desc: "기상 조건을 확인하고 작업 범위를 조정하세요.",
    },
    LIMIT: {
      badge: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
      label: "제한 검토",
      desc: "작업 전 현장 상태와 보호조치를 확인하세요.",
    },
    NORMAL: {
      badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
      label: "정상 작업",
      desc: "기상 이상 없음. 기본 안전수칙을 유지하세요.",
    },
  } satisfies Record<
    WeatherDecision,
    { badge: string; label: string; desc: string }
  >;

  const weatherDecision = weather.decision ?? "NORMAL";
  const weatherCfg = decisionConfig[weatherDecision];

  return (
    <main className="min-h-screen bg-[#070B14] text-white">
      {/* Top Bar */}
      <header className="border-b border-white/10 bg-[#0B1220]/95">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-500/30 bg-blue-500/10 text-2xl">
              🛡️
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight">
                SafeMetrica™
              </h1>
              <p className="text-xs text-slate-400">
                산업안전 통합 운영 플랫폼
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-xs text-slate-400">{today}</p>
            <p className="mt-1 text-xs font-semibold text-emerald-300">
              ● 시스템 정상
            </p>
          </div>
        </div>
      </header>

      {/* Tenant Message */}
      <section className="border-b border-blue-900/40 bg-blue-950/35">
        <div className="mx-auto max-w-6xl px-5 py-3 text-center">
          <p className="text-xs font-medium text-blue-200">
            {company.name} · 오늘의 안전 실행과 증빙 흐름을 확인하세요.
          </p>
        </div>
      </section>

      {/* Hero / Weather */}
      <section className="border-b border-white/10 bg-gradient-to-b from-[#0B1220] to-[#070B14]">
        <div className="mx-auto max-w-6xl px-5 py-6">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-300">
                Action → Evidence → 대표보고
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white md:text-4xl">
                오늘의 안전 운영 홈
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
                현장의 특이사항은 조치로, 조치는 증빙으로, 증빙은 대표 보고로
                연결됩니다.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold">
                  {weather.icon} 현재 날씨
                </span>
                <span
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${weatherCfg.badge}`}
                >
                  {weatherCfg.label}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-black/25 p-3">
                  <p className="text-[10px] text-slate-500">기온</p>
                  <p className="mt-1 text-sm font-bold">
                    {weather.tmp ?? "-"}°C
                  </p>
                </div>
                <div className="rounded-xl bg-black/25 p-3">
                  <p className="text-[10px] text-slate-500">풍속</p>
                  <p className="mt-1 text-sm font-bold">
                    {weather.wsd ?? "-"}m/s
                  </p>
                </div>
                <div className="rounded-xl bg-black/25 p-3">
                  <p className="text-[10px] text-slate-500">강수</p>
                  <p className="mt-1 text-sm font-bold">{weather.pop}%</p>
                </div>
              </div>

              <p className="mt-3 text-xs leading-relaxed text-slate-400">
                {weatherCfg.desc}
              </p>
              {weather.observedAt && (
                <p className="mt-2 text-[11px] text-slate-600">
                  기상청 초단기실황 기준 {weather.observedAt}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Layout */}
      <div className="mx-auto max-w-6xl px-5 py-6">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_380px]">
          {/* Left: App Menu */}
          <section>
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-300">
                  Today Command
                </p>
                <h3 className="mt-2 text-2xl font-black">주요 실행 메뉴</h3>
              </div>
              <p className="hidden text-xs text-slate-500 md:block">
                현장 실행 → 증빙 → 보고
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {menus.map((m) => (
                <Link
                  key={m.href}
                  href={m.href}
                  className="group rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 to-[#0B1220] p-5 shadow-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-500/50 hover:shadow-blue-950/30 active:scale-95"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="mb-4 text-4xl">{m.icon}</div>
                      <div className="text-sm font-black leading-tight">
                        {m.label}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {m.sub}
                      </div>
                    </div>
                    <span className="text-slate-700 transition group-hover:text-blue-300">
                      →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Right: Today Panel */}
          <aside className="space-y-3">
            <section className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-slate-900 to-blue-950/40 p-4 shadow-2xl">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">
                    Today Check
                  </p>
                  <h3 className="mt-1 text-lg font-black">오늘 확인 패널</h3>
                </div>
                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-300">
                  운영중
                </span>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-500">기상 판단</span>
                  <span className="text-xs font-bold text-white">
                    {weatherCfg.label}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  기온 {weather.tmp ?? "-"}°C · 풍속 {weather.wsd ?? "-"}m/s ·
                  강수확률 {weather.pop}%
                </p>
              </div>

              {weather.alerts.length > 0 && (
                <div className="mt-2 space-y-1">
                  {weather.alerts.slice(0, 2).map((alert) => (
                    <p
                      key={alert}
                      className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-3 py-2 text-[11px] font-medium text-yellow-200"
                    >
                      {alert}
                    </p>
                  ))}
                </div>
              )}

              <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-black">최근 안전사고 사례</h4>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      오늘 TBM에 반영할 체크포인트
                    </p>
                  </div>
                  <span className="text-[11px] text-slate-600">KOSHA</span>
                </div>

                {safetyCases.length === 0 ? (
                  <p className="py-3 text-xs text-slate-600">
                    안전사고 사례를 불러오는 중입니다.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {safetyCases.slice(0, 2).map((item) => (
                      <div
                        key={item.id}
                        className="rounded-xl border border-white/10 bg-slate-950/80 p-3"
                      >
                        <div className="flex items-start gap-2">
                          <span className="shrink-0 rounded-md border border-red-500/20 bg-red-500/10 px-1.5 py-0.5 text-[10px] font-bold text-red-300">
                            {item.accidentType}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-bold text-white">
                              {item.title}
                            </p>
                            <p className="mt-1 truncate text-[11px] font-semibold text-emerald-300">
                              {item.action}
                            </p>
                          </div>
                        </div>

                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className="text-[10px] text-slate-600">
                            출처:{" "}
                            {item.source === "KOSHA"
                              ? "KOSHA 안전사례"
                              : "예시 사례"}
                          </span>
                          <Link
                            href={`/tbm?safetyCase=${encodeURIComponent(
                              item.id
                            )}&check=${encodeURIComponent(item.action)}`}
                            className="shrink-0 rounded-full bg-blue-600 px-2.5 py-1 text-[10px] font-bold text-white transition hover:bg-blue-500"
                          >
                            TBM 반영
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-slate-900 p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-yellow-400">⚠️</span>
                <span className="text-sm font-bold">안전 수칙</span>
              </div>
              <p className="text-xs leading-relaxed text-slate-400">
                특이사항 발생 시 Evidence Book 등록 · 고위험작업은 PTW 제출 후
                시작 · 긴급상황은 즉시 신고
              </p>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}