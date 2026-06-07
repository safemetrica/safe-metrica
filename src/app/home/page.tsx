import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCompanyConfig } from "@/lib/company";
import TbmFormAction from "@/components/TbmFormAction";
import HomeSafetyNewsSection, { HomeSafetyNewsFallback } from "./HomeSafetyNewsSection";

import { getTbmFormUrl } from "@/lib/tenantLinks";
const menus = [
  { href: "/tbm", icon: "📋", label: "TBM 현황", sub: "툴박스미팅 실시간", color: "from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600", border: "border-blue-500" },
  { href: "/field/voice", icon: "🗣️", label: "현장참여 접수함", sub: "위험제보·아차사고 검토", color: "from-lime-600 to-emerald-700 hover:from-lime-500 hover:to-emerald-600", border: "border-lime-500" },
  { href: "/ebm", icon: "📚", label: "Evidence Book", sub: "증빙 현황 조회", color: "from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600", border: "border-emerald-500" },
  { href: "/field", icon: "👷", label: "현장 비서", sub: "관리감독자 전용", color: "from-teal-600 to-teal-700 hover:from-teal-500 hover:to-teal-600", border: "border-teal-500" },
  { href: "/monthly-report", icon: "📑", label: "월간보고서", sub: "월별 안전운영 요약", color: "from-sky-600 to-blue-700 hover:from-sky-500 hover:to-blue-600", border: "border-sky-500" },
  { href: "/dashboard", icon: "📊", label: "대표 대시보드", sub: "통계 & 리스크 요약", color: "from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600", border: "border-purple-500" },
  { href: "/risk", icon: "⚠️", label: "위험성평가표", sub: "상시 위험요인·개선대책", color: "from-red-600 to-red-700 hover:from-red-500 hover:to-red-600", border: "border-red-500" },
  { href: "/ptw", icon: "🧾", label: "고위험작업허가서", sub: "PTW 승인 현황", color: "from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600", border: "border-orange-500" },
  { href: "/inspection-education", icon: "✅", label: "점검·교육", sub: "순회·차량·교육기록", color: "from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600", border: "border-cyan-500" },
  { href: "/kosha", icon: "🏅", label: "KOSHA 인정심사", sub: "11개 Gate 이행률", color: "from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600", border: "border-amber-500" },
];

type HomeRole = "worker" | "manager" | "ceo";

type WorkerParticipationIntent = "risk" | "share" | "report";

type RoleTask = {
  href?: string;
  participationIntent?: WorkerParticipationIntent;
  requiresCompanyCode?: boolean;
  disabled?: boolean;
  icon: string;
  title: string;
  description: string;
  status: string;
  badge?: string;
  accent: string;
  iconBg: string;
};

const menuStatus: Record<string, string> = {
  "/field": "베타",
  "/monthly-report": "베타",
  "/risk": "제한 운영",
  "/ptw": "제한 운영",
  "/ebm": "제한 운영",
  "/inspection-education": "준비 중",
  "/kosha": "준비 중",
};

const roleOptions: Array<{ value: HomeRole; label: string; shortLabel: string }> = [
  { value: "worker", label: "근로자", shortLabel: "근로자" },
  { value: "manager", label: "현장관리자", shortLabel: "관리자" },
  { value: "ceo", label: "대표", shortLabel: "대표" },
];

const roleContent: Record<HomeRole, {
  eyebrow: string;
  title: string;
  description: string;
  badge: string;
  accent: string;
  tasks: RoleTask[];
}> = {
  worker: {
    eyebrow: "근로자 오늘 확인",
    title: "오늘 작업 전 안전 확인",
    description: "오늘 위험요인과 TBM을 확인하고 현장 의견을 남겨 주세요.",
    badge: "확인 기록 중심",
    accent: "from-emerald-950/90 via-slate-900 to-slate-950 border-emerald-500/30",
    tasks: [
      { requiresCompanyCode: true, participationIntent: "risk", icon: "⚠️", title: "오늘 위험요인 확인", description: "작업 전 현장의 위험요인과 안전조치를 확인합니다.", status: "확인 필요", accent: "border-amber-500/40 bg-amber-950/25", iconBg: "bg-amber-500/15" },
      { requiresCompanyCode: true, participationIntent: "share", icon: "✅", title: "위험성평가 공유확인", description: "공유된 위험요인과 안전조치 확인 기록을 남깁니다.", status: "메뉴에서 확인", accent: "border-emerald-500/40 bg-emerald-950/25", iconBg: "bg-emerald-500/15" },
      { href: "/tbm", icon: "📋", title: "TBM 확인", description: "오늘 작업 전 전달된 TBM 내용을 확인합니다.", status: "확인 필요", accent: "border-blue-500/40 bg-blue-950/35", iconBg: "bg-blue-500/15" },
      { requiresCompanyCode: true, participationIntent: "report", icon: "🗣️", title: "위험제보 · 아차사고 · 개선제안", description: "현장에서 발견한 내용과 개선 의견을 접수합니다.", status: "필요 시 접수", accent: "border-cyan-500/40 bg-cyan-950/25", iconBg: "bg-cyan-500/15" },
    ],
  },
  manager: {
    eyebrow: "현장관리자 1차 확인",
    title: "오늘 안전운영",
    description: "작업 전 확인부터 접수 검토와 후속 조치까지 순서대로 살펴보세요.",
    badge: "운영기록 확인 필요",
    accent: "from-blue-950/90 via-slate-900 to-slate-950 border-blue-500/30",
    tasks: [
      { href: "/tbm", icon: "📋", title: "오늘 TBM 작성", description: "오늘 작업 전 TBM을 작성하거나 확인합니다.", status: "확인 필요", accent: "border-blue-500/50 bg-blue-950/40", iconBg: "bg-blue-500/15" },
      { href: "/field/voice", icon: "🗣️", title: "현장참여 접수함", description: "근로자 제보와 현장 의견을 확인합니다.", status: "메뉴에서 확인", accent: "border-emerald-500/40 bg-emerald-950/30", iconBg: "bg-emerald-500/15" },
      { href: "/field/voice", icon: "🔎", title: "조치 필요 항목", description: "조치필요·검토중 항목을 확인합니다.", status: "확인 필요", accent: "border-amber-500/40 bg-amber-950/25", iconBg: "bg-amber-500/15" },
      { href: "/field", icon: "👷", title: "현장비서", description: "누락 가능성과 운영 신호를 참고하고 직접 검토합니다.", status: "관리자 검토 필요", badge: "베타", accent: "border-cyan-500/40 bg-cyan-950/25", iconBg: "bg-cyan-500/15" },
    ],
  },
  ceo: {
    eyebrow: "대표 오늘 확인",
    title: "오늘 주요 안전운영 신호",
    description: "미조치와 현장 접수 현황을 먼저 확인하고 보고 자료로 이동하세요.",
    badge: "입력된 운영기록 기준",
    accent: "from-violet-950/90 via-slate-900 to-slate-950 border-violet-500/30",
    tasks: [
      { href: "/dashboard", icon: "🔎", title: "오늘 미조치 확인", description: "주요 리스크와 후속 확인이 필요한 운영 신호를 살펴봅니다.", status: "확인 필요", accent: "border-amber-500/40 bg-amber-950/25", iconBg: "bg-amber-500/15" },
      { href: "/field/voice", icon: "🗣️", title: "위험제보 접수 현황", description: "현장에서 접수된 제보와 검토 상태를 확인합니다.", status: "메뉴에서 확인", accent: "border-emerald-500/40 bg-emerald-950/25", iconBg: "bg-emerald-500/15" },
      { href: "/monthly-report", icon: "📑", title: "월간보고서", description: "입력된 운영기록을 월별 요약으로 확인합니다.", status: "데이터 연결 전", badge: "베타", accent: "border-blue-500/40 bg-blue-950/35", iconBg: "bg-blue-500/15" },
      { href: "/risk/report", icon: "🖨️", title: "위험성평가표 출력지원", description: "위험요인과 개선대책을 출력 형식으로 정리해 검토합니다.", status: "메뉴에서 확인", badge: "제한 운영", accent: "border-violet-500/40 bg-violet-950/25", iconBg: "bg-violet-500/15" },
    ],
  },
};
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
      fetch(ncstUrl, { next: { revalidate: 7200 } }),
      fetch(fcstUrl, { next: { revalidate: 7200 } }),
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
    if (wsd >= 10) alerts.push(`🚨 강풍 ${wsd}m/s — 고소·양중·외부작업 제한 검토`);
    if (tmp >= 35) alerts.push(`🔥 폭염위험 ${tmp}°C — 물·그늘·휴식·작업시간 조정 필요`);
    else if (tmp >= 33) alerts.push(`☀️ 폭염 ${tmp}°C — 온열질환 예방조치 확인`);
    else if (tmp >= 30) alerts.push(`🌡️ 더위주의 ${tmp}°C — 수분섭취·휴식 안내 필요`);
    if (tmp <= -10) alerts.push(`🥶 한파 ${tmp}°C — 저체온증 위험`);
    if (pty !== "0") alerts.push(`🌧️ 현재 강수 감지 — 야외작업 주의`);
    else if (pop >= 40) alerts.push(`🌦️ 강수확률 ${pop}% — 야외작업 시 우비 준비`);
    else if (pop >= 20) alerts.push(`☁️ 강수확률 ${pop}% — 날씨 변화 주의`);

    // 의사결정 티켓 판정
    const stopRequired = wsd >= 10;
    const limitRequired = tmp >= 33 || tmp <= -10 || pty !== "0";
    const decision = stopRequired ? "STOP" : limitRequired ? "LIMIT" : "NORMAL";

    const icon = pty !== "0" ? "🌧️" : pop >= 40 ? "🌦️" : sky === "4" ? "☁️" : sky === "3" ? "⛅" : tmp >= 33 ? "☀️" : tmp <= 0 ? "🌨️" : "☀️";

    return { tmp, feelsLike, observedAt, wsd, pty, pop, alerts, icon, decision, stopRequired };
  } catch {
    return { tmp: null, feelsLike: null, observedAt: null, wsd: null, pty: null, pop: 0, alerts: [], icon: "⛅", decision: null, stopRequired: false };
  }
}


type WeatherActionPlan = {
  title: string;
  summary: string;
  actions: string[];
  tbmSentence: string;
  evidence: string[];
};

function getWeatherActionPlan(weather: {
  tmp: number | null;
  feelsLike?: number | null;
  wsd: number | null;
  pty: string | null;
  pop: number;
}): WeatherActionPlan | null {
  const tmp = Number.isFinite(weather.tmp) ? Number(weather.tmp) : null;
  const feelsLike = Number.isFinite(weather.feelsLike) ? Number(weather.feelsLike) : tmp;
  const wsd = Number.isFinite(weather.wsd) ? Number(weather.wsd) : 0;
  const pop = Number.isFinite(weather.pop) ? Number(weather.pop) : 0;
  const hasRain = weather.pty !== null && weather.pty !== "0";

  if (wsd >= 10) {
    return {
      title: "강풍 작업제한 브리핑",
      summary: `풍속 ${wsd}m/s 기준으로 고소·양중·외부작업 제한 여부를 확인하세요.`,
      actions: [
        "고소·사다리·양중·외부작업 진행 가능 여부를 현장책임자가 확인",
        "적치물·가설물·문짝·천막 등 바람 영향 물건 고정",
        "작업 제한 또는 중단 판단 내용을 TBM에 기록",
      ],
      tbmSentence:
        "오늘은 강풍 영향이 있어 고소·양중·외부작업은 현장책임자 확인 후 진행하고, 바람에 날릴 수 있는 물건은 작업 전 고정합니다.",
      evidence: [
        "작업구역 및 외부 적치물 고정 사진",
        "작업 제한 또는 작업 전 점검 사진",
        "현장책임자 확인 후 TBM 공유 사진",
      ],
    };
  }

  if ((feelsLike ?? 0) >= 35 || (tmp ?? 0) >= 35) {
    return {
      title: "폭염위험 온열질환 예방 브리핑",
      summary: `기온 ${tmp}°C, 체감 ${feelsLike}°C 수준입니다. 물·그늘·휴식·작업시간 조정 확인이 필요합니다.`,
      actions: [
        "작업 전 생수·그늘·휴식 장소 확보",
        "무더운 시간대 장시간 연속작업 제한 검토",
        "어지러움·두통·메스꺼움 등 이상증상 즉시 보고 안내",
        "고령자·신규자·옥외작업자 상태를 관리감독자가 수시 확인",
      ],
      tbmSentence:
        "오늘은 폭염위험이 있어 작업 전 물과 휴식 장소를 확인하고, 어지러움·두통·메스꺼움 등 온열질환 의심 증상이 있으면 즉시 작업을 멈추고 현장관리자에게 보고합니다.",
      evidence: [
        "생수 또는 음료 비치 사진",
        "그늘·휴식 장소 확보 사진",
        "TBM에서 온열질환 예방 안내하는 사진",
        "작업시간 조정 또는 휴식 안내 게시 사진",
      ],
    };
  }

  if ((feelsLike ?? 0) >= 33 || (tmp ?? 0) >= 33) {
    return {
      title: "폭염주의 온열질환 예방 브리핑",
      summary: `기온 ${tmp}°C, 체감 ${feelsLike}°C 수준입니다. 수분섭취와 휴식 안내가 필요합니다.`,
      actions: [
        "작업 전 물 비치와 휴식 장소 확인",
        "근로자에게 수분섭취와 이상증상 보고 기준 공유",
        "옥외작업·상하차·중량물 작업자는 휴식 주기 확인",
      ],
      tbmSentence:
        "오늘은 폭염주의가 있어 작업 전 물과 휴식 장소를 확인하고, 어지러움·두통 등 이상증상이 있으면 즉시 현장관리자에게 보고합니다.",
      evidence: [
        "물 비치 사진",
        "휴식 장소 또는 그늘 사진",
        "TBM 공유 사진",
      ],
    };
  }

  if ((feelsLike ?? 0) >= 30 || (tmp ?? 0) >= 30) {
    return {
      title: "더위주의 현장 브리핑",
      summary: `기온 ${tmp}°C 수준입니다. 장시간 옥외작업 시 수분섭취와 휴식 안내가 필요합니다.`,
      actions: [
        "작업 전 수분섭취 안내",
        "옥외작업자는 휴식 장소 확인",
        "이상증상 발생 시 즉시 보고하도록 TBM에서 공유",
      ],
      tbmSentence:
        "오늘은 더위가 예상되므로 작업 전 수분섭취와 휴식 장소를 확인하고, 몸 상태 이상이 있으면 즉시 공유합니다.",
      evidence: [
        "TBM 공유 사진",
        "물 비치 또는 휴식 장소 사진",
      ],
    };
  }

  if (hasRain || pop >= 40) {
    return {
      title: "우천·미끄럼 주의 브리핑",
      summary: hasRain
        ? "현재 강수가 감지되었습니다. 야외작업과 차량 이동 시 미끄럼·시야저하를 확인하세요."
        : `강수확률 ${pop}%입니다. 야외작업 시 날씨 변화에 대비하세요.`,
      actions: [
        "바닥 물기·침출수·미끄럼 구간 확인",
        "차량·지게차 이동 동선과 보행자 동선 분리",
        "야외작업자는 우비·안전화 상태 확인",
      ],
      tbmSentence:
        "오늘은 우천 또는 미끄럼 위험이 있어 바닥 상태와 이동 동선을 확인하고, 차량·지게차 주변 접근을 주의합니다.",
      evidence: [
        "미끄럼 구간 정리 사진",
        "차량·보행자 동선 확인 사진",
        "우천 대비 보호구 착용 사진",
      ],
    };
  }

  if ((tmp ?? 0) <= -10) {
    return {
      title: "한파 저체온 예방 브리핑",
      summary: `기온 ${tmp}°C 수준입니다. 저체온·동상 예방조치가 필요합니다.`,
      actions: [
        "방한복·장갑·보온장비 착용 확인",
        "장시간 옥외작업 시 휴식과 온열 장소 확인",
        "손발 저림·감각저하 등 이상증상 즉시 보고 안내",
      ],
      tbmSentence:
        "오늘은 한파로 인해 저체온과 동상 위험이 있으므로 방한보호구를 착용하고, 손발 저림 등 이상증상은 즉시 보고합니다.",
      evidence: [
        "방한보호구 착용 사진",
        "휴식 장소 또는 온열 장소 사진",
        "TBM 공유 사진",
      ],
    };
  }

  return null;
}


function getWeatherTestSnapshot(testMode?: string | null) {
  const mode = String(testMode ?? "").trim().toLowerCase();

  if (!mode) return null;

  const base = {
    observedAt: "테스트",
    stopRequired: false,
  };

  if (mode === "heat35" || mode === "heat") {
    return {
      ...base,
      tmp: 35,
      feelsLike: 36,
      wsd: 1.2,
      pty: "0",
      pop: 0,
      icon: "🔥",
      decision: "LIMIT",
      alerts: ["🔥 폭염위험 35°C — 물·그늘·휴식·작업시간 조정 필요"],
    };
  }

  if (mode === "heat33") {
    return {
      ...base,
      tmp: 33,
      feelsLike: 34,
      wsd: 1.2,
      pty: "0",
      pop: 0,
      icon: "☀️",
      decision: "LIMIT",
      alerts: ["☀️ 폭염 33°C — 온열질환 예방조치 확인"],
    };
  }

  if (mode === "rain") {
    return {
      ...base,
      tmp: 24,
      feelsLike: 24,
      wsd: 2.1,
      pty: "1",
      pop: 80,
      icon: "🌧️",
      decision: "LIMIT",
      alerts: ["🌧️ 현재 강수 감지 — 야외작업 주의"],
    };
  }

  if (mode === "wind") {
    return {
      ...base,
      tmp: 22,
      feelsLike: 22,
      wsd: 10,
      pty: "0",
      pop: 0,
      icon: "💨",
      decision: "STOP",
      stopRequired: true,
      alerts: ["🚨 강풍 10m/s — 고소·양중·외부작업 제한 검토"],
    };
  }

  if (mode === "cold") {
    return {
      ...base,
      tmp: -10,
      feelsLike: -12,
      wsd: 2.5,
      pty: "0",
      pop: 0,
      icon: "🥶",
      decision: "LIMIT",
      alerts: ["🥶 한파 -10°C — 저체온증 위험"],
    };
  }

  return null;
}

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<{ role?: string; weatherTest?: string }> | { role?: string; weatherTest?: string };
}) {
  const resolvedSearchParams = await Promise.resolve(searchParams ?? {});
  const requestedRole = resolvedSearchParams.role;
  const activeRole: HomeRole = requestedRole === "worker" || requestedRole === "ceo" || requestedRole === "manager"
    ? requestedRole
    : "manager";
  const weatherTest = resolvedSearchParams.weatherTest;

  const company = await getCompanyConfig().catch(() => null);

  if (!company) {
    redirect("/login?error=tenant_required");
  }

  if (company.code === "mons") {
    redirect("/contractor/mons");
  }

  const getWorkerParticipationHref = (intent?: WorkerParticipationIntent) => {
    if (!company.code || !intent) return null;

    return `/field/participation?company=${encodeURIComponent(company.code)}&intent=${intent}`;
  };
  const activeRoleContent = activeRole === "worker"
    ? {
        ...roleContent.worker,
        tasks: roleContent.worker.tasks.map((task) => {
          if (!task.requiresCompanyCode) return task;

          const participationHref = getWorkerParticipationHref(task.participationIntent);
          return participationHref
            ? { ...task, href: participationHref }
            : { ...task, disabled: true, status: "고객사 코드 확인 필요" };
        }),
      }
    : roleContent[activeRole];
  const tbmFormUrl = getTbmFormUrl(company);

  const actualWeather = await getWeather();
  const weatherTestSnapshot = getWeatherTestSnapshot(weatherTest);
  const weather = weatherTestSnapshot ?? actualWeather;
  const isWeatherTestMode = Boolean(weatherTestSnapshot);
  const weatherActionPlan = getWeatherActionPlan(weather);
  const today = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" });

  const decisionConfig = {
    STOP: {
      bg: "bg-red-950 border-red-700",
      badge: "bg-red-700 text-white",
      label: "🚨 작업중지 필요",
      desc: "강풍 기준 도달 — 고소·양중·외부작업 중단 또는 제한 검토",
      action: "현장 책임자 확인 후 작업 가능 여부를 판단하고 TBM에 기록",
    },
    LIMIT: {
      bg: "bg-yellow-950 border-yellow-700",
      badge: "bg-yellow-600 text-white",
      label: "🟡 제한 운영",
      desc: "기상 위험요인 확인 — 작업범위·휴식·보호구·동선 조정 필요",
      action: "현장 책임자 판단 후 TBM 공유 및 사진 증빙 확보",
    },
    NORMAL: {
      bg: "bg-gray-900 border-gray-700",
      badge: "bg-green-700 text-white",
      label: "🟢 정상 작업",
      desc: "기상 이상 없음",
      action: "정상 운영 가능. 단, 작업 전 TBM에서 날씨 변화 여부를 공유",
    },
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900/95 px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="text-3xl" aria-hidden="true">🛡️</span>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-black sm:text-xl">SafeMetrica™</h1>
              <p className="truncate text-xs text-slate-400">{company.name} · 실제 고객 운영 모드</p>
            </div>
          </div>
          <div className="hidden text-right sm:block">
            <p className="text-xs text-slate-400">{today}</p>
            <p className="mt-0.5 text-xs font-bold text-emerald-400">● 시스템 정상</p>
          </div>
        </div>
      </header>

      <nav className="border-b border-slate-800 bg-slate-950 px-4 py-3" aria-label="홈 역할 보기">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-800 bg-slate-900/70 p-1.5 sm:flex sm:w-fit">
            {roleOptions.map((option) => {
              const isActive = option.value === activeRole;
              return (
                <Link
                  key={option.value}
                  href={`/home?role=${option.value}`}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex min-h-11 items-center justify-center rounded-xl px-3 text-sm font-black transition ${
                    isActive
                      ? "bg-white text-slate-950 shadow-lg"
                      : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <span className="sm:hidden">{option.shortLabel}</span>
                  <span className="hidden sm:inline">{option.label}</span>
                </Link>
              );
            })}
          </div>
          {/* v1 역할 탭은 홈의 우선 업무 보기를 전환하며 실제 사용자 권한 판정을 대체하지 않는다. */}
          <p className="mt-2 text-[11px] leading-5 text-slate-500">
            역할 보기는 홈 구성을 전환합니다. 실제 메뉴 이용 범위는 고객사와 사용자 권한 설정을 따릅니다.
          </p>
        </div>
      </nav>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-5 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-6 lg:py-7">
        <aside className="hidden lg:block" aria-label="전체 기능 보조 내비게이션">
          <div className="sticky top-5 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-xl shadow-black/10">
            <p className="text-xs font-black text-blue-300">2차 메뉴</p>
            <h2 className="mt-1 text-lg font-black">전체 기능</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">기존 조회·기록·보고 메뉴를 모두 이용할 수 있습니다.</p>
            <div className="mt-4 space-y-1.5">
              {menus.map((menu) => (
                <Link
                  key={menu.href}
                  href={menu.href}
                  className="group flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 transition hover:border-slate-700 hover:bg-slate-800"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-lg group-hover:bg-slate-700" aria-hidden="true">{menu.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-bold text-slate-200">{menu.label}</span>
                      {menuStatus[menu.href] ? <span className="shrink-0 rounded-full bg-slate-800 px-1.5 py-0.5 text-[9px] font-black text-slate-400">{menuStatus[menu.href]}</span> : null}
                    </span>
                    <span className="block truncate text-[11px] text-slate-500">{menu.sub}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <section className={`rounded-3xl border bg-gradient-to-br p-5 shadow-2xl shadow-black/20 sm:p-6 ${activeRoleContent.accent}`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-black text-slate-200">
                    {roleOptions.find((option) => option.value === activeRole)?.label}
                  </span>
                  <span className="rounded-full border border-amber-400/25 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-100">
                    {activeRoleContent.badge}
                  </span>
                </div>
                <p className="mt-5 text-xs font-black tracking-wide text-blue-300">{activeRoleContent.eyebrow}</p>
                <h2 className="mt-1 text-2xl font-black sm:text-3xl">{activeRoleContent.title}</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{activeRoleContent.description}</p>
              </div>
              <div className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-4 py-3 sm:text-right">
                <p className="text-xs font-semibold text-slate-500">오늘 기준</p>
                <p className="mt-1 text-sm font-bold text-slate-100">{today}</p>
              </div>
            </div>
          </section>

          <section className="mt-6" aria-labelledby="today-tasks-title">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-black text-blue-300">1차 내비게이션</p>
                <h2 id="today-tasks-title" className="mt-1 text-xl font-black sm:text-2xl">오늘 할 일</h2>
              </div>
              <p className="text-right text-xs leading-5 text-slate-500">실제 현황은 각 메뉴에서 확인</p>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {activeRoleContent.tasks.map((task) => {
                const cardContent = (
                  <>
                    <div className="flex items-start gap-3">
                      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl ${task.iconBg}`} aria-hidden="true">{task.icon}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-black text-white">{task.title}</span>
                          {task.badge ? <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] font-black text-slate-300">{task.badge}</span> : null}
                        </span>
                        <span className="mt-1 block text-sm leading-5 text-slate-300">{task.description}</span>
                      </span>
                    </div>
                    <span className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
                      <span className="text-xs font-bold text-slate-400">{task.status}</span>
                      <span className="text-sm font-black text-white transition group-hover:translate-x-0.5">
                        {task.disabled ? "관리자에게 링크 요청" : "확인하기 →"}
                      </span>
                    </span>
                  </>
                );

                return task.href && !task.disabled ? (
                  <Link key={task.title} href={task.href} className={`group rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:border-white/30 ${task.accent}`}>
                    {cardContent}
                  </Link>
                ) : (
                  <div key={task.title} aria-disabled="true" className={`cursor-not-allowed rounded-2xl border p-4 opacity-70 ${task.accent}`}>
                    {cardContent}
                  </div>
                );
              })}
            </div>
            {activeRole === "manager" ? (
              <TbmFormAction tbmFormUrl={tbmFormUrl} voiceDraftHref="/tbm#tbm-voice-draft" compact className="mt-3" />
            ) : null}
          </section>

          <details className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 lg:hidden">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
              <span>
                <span className="block text-xs font-black text-blue-300">2차 메뉴</span>
                <span className="mt-0.5 block font-black">전체 기능 보기</span>
              </span>
              <span className="rounded-full border border-slate-700 px-3 py-1 text-xs font-bold text-slate-300">열기</span>
            </summary>
            <div className="grid grid-cols-2 gap-2 border-t border-slate-800 p-3">
              {menus.map((menu) => (
                <Link key={menu.href} href={menu.href} className="relative rounded-xl border border-slate-800 bg-slate-950/70 p-3 transition active:scale-[0.98]">
                  {menuStatus[menu.href] ? <span className="absolute right-2 top-2 rounded-full bg-slate-800 px-1.5 py-0.5 text-[9px] font-black text-slate-400">{menuStatus[menu.href]}</span> : null}
                  <span className="text-2xl" aria-hidden="true">{menu.icon}</span>
                  <span className="mt-2 block text-sm font-black">{menu.label}</span>
                  <span className="mt-1 block text-[11px] leading-4 text-slate-500">{menu.sub}</span>
                </Link>
              ))}
            </div>
          </details>

          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3">
            <p className="text-xs leading-5 text-slate-400">
              현재 고객사의 실제 운영 환경입니다. 홈의 상태 문구는 완료 판정이 아니며 실제 기록과 처리 상태는 각 메뉴에서 확인하세요.
            </p>
          </div>

          {weather.tmp !== null && weather.decision && (() => {
            const cfg = decisionConfig[weather.decision as keyof typeof decisionConfig];
            return (
              <section className={`mt-6 rounded-2xl border p-4 ${cfg.bg}`} aria-label="오늘 기상 안전 브리핑">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-black">{weather.icon} 현재 날씨</p>
                    <p className="mt-1 text-xs text-blue-200">
                      {isWeatherTestMode ? "날씨 테스트 모드" : `기상청 초단기실황 기준 ${weather.observedAt}`}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-300">
                    <span>기온 {weather.tmp}°C</span>
                    <span>체감 {weather.feelsLike}°C</span>
                    <span>풍속 {weather.wsd}m/s</span>
                    <span>강수확률 {weather.pop}%</span>
                  </div>
                </div>
                <div className={`mt-3 rounded-xl border p-3 ${cfg.bg}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${cfg.badge}`}>{cfg.label}</span>
                    <span className="text-xs text-slate-400">현장 책임자 확인 필요</span>
                  </div>
                  <p className="mt-2 text-xs font-medium text-white">{cfg.desc}</p>
                  <p className="mt-1 text-xs text-slate-400">{cfg.action}</p>
                </div>
                {weather.alerts.length > 0 ? (
                  <div className="mt-2 space-y-1">
                    {weather.alerts.map((alert) => <p key={alert} className="text-xs font-medium text-red-300">{alert}</p>)}
                  </div>
                ) : null}
                {weatherActionPlan ? (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-xl border border-cyan-500/30 bg-slate-950/60 p-3 sm:col-span-2">
                      <p className="text-xs font-black text-cyan-200">{weatherActionPlan.title}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-200">{weatherActionPlan.summary}</p>
                      <ul className="mt-2 space-y-1">
                        {weatherActionPlan.actions.map((item) => <li key={item} className="text-xs leading-5 text-slate-100">- {item}</li>)}
                      </ul>
                    </div>
                    <div className="rounded-xl border border-blue-500/30 bg-blue-950/40 p-3">
                      <p className="text-xs font-black text-blue-200">오늘 TBM 반영 문장</p>
                      <p className="mt-1 text-xs leading-5 text-blue-50">{weatherActionPlan.tbmSentence}</p>
                    </div>
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3">
                      <p className="text-xs font-black text-emerald-200">사진 기록 권장</p>
                      <ul className="mt-1 space-y-1">
                        {weatherActionPlan.evidence.map((item) => <li key={item} className="text-xs leading-5 text-emerald-50">- {item}</li>)}
                      </ul>
                    </div>
                  </div>
                ) : null}
              </section>
            );
          })()}

          <section className="mt-4 rounded-xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex items-center gap-2">
              <span className="text-yellow-400" aria-hidden="true">⚠️</span>
              <h2 className="text-sm font-semibold">안전 수칙</h2>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">특이사항 발생 시 Evidence Book에 기록하고, 고위험작업은 PTW 확인 후 시작하며, 중대재해 발생 시 즉시 119에 신고하세요.</p>
          </section>

          <Suspense fallback={<HomeSafetyNewsFallback />}>
            <HomeSafetyNewsSection
              company={{
                code: company.code,
                name: company.name,
                industryTag: company.industryTag,
              }}
            />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
