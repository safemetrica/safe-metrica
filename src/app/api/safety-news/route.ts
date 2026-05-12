import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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
  sourceUrl?: string;
  relevanceScore: number;
  isSimilarIndustry: boolean;
};

const KOSHA_API_BASE_URL =
  process.env.KOSHA_API_BASE_URL ||
  "http://apis.data.go.kr/B552468/disaster_api01";

const KOSHA_SERVICE_KEY = process.env.KOSHA_SERVICE_KEY;
const KOSHA_CALL_API_ID =
  process.env.KOSHA_CALL_API_ID || "국내재해사례 게시판 조회";

const WASTE_KEYWORDS = [
  "폐기물",
  "생활폐기물",
  "환경미화",
  "수거차",
  "청소차",
  "압축기",
  "후진",
  "투입구",
  "끼임",
  "부딪힘",
  "깔림",
];

function pickText(item: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}

function classifyAccidentType(text: string): AccidentType {
  const value = text.replace(/\s/g, "");

  if (/추락|떨어짐|사다리|개구부|지붕|단부|고소/.test(value)) return "떨어짐";
  if (/끼임|협착|말림|롤러|컨베이어|벨트|압축기|프레스|투입구/.test(value))
    return "끼임";
  if (/충돌|부딪힘|후진|지게차|차량|장비/.test(value)) return "부딪힘";
  if (/낙하|비래|맞음|인양물|떨어진물체/.test(value)) return "맞음";
  if (/깔림|전도|전복|붕괴|무너짐/.test(value)) return "깔림";
  if (/넘어짐|미끄러짐|전도|통로|바닥/.test(value)) return "넘어짐";
  if (/화재|폭발|파열|인화|용접|분진/.test(value)) return "화재폭발";
  if (/질식|중독|산소결핍|밀폐공간|가스/.test(value)) return "질식중독";

  return "기타";
}

function classifyIndustry(text: string): IndustryTag {
  const value = text.replace(/\s/g, "");

  if (/폐기물|생활폐기물|환경미화|수거차|청소차|압축기/.test(value)) {
    return "폐기물";
  }

  if (/건설|비계|개구부|철거|해체|굴착|크레인/.test(value)) {
    return "건설";
  }

  if (/제조|공장|프레스|컨베이어|롤러|설비|기계/.test(value)) {
    return "제조";
  }

  if (/물류|창고|상하차|지게차|팔레트|적재/.test(value)) {
    return "물류";
  }

  return "공통";
}

function getActionByAccidentType(type: AccidentType) {
  switch (type) {
    case "끼임":
      return "설비 정지 · 방호덮개 · LOTO 확인";
    case "떨어짐":
      return "작업발판 · 안전난간 · 안전대 체결 확인";
    case "부딪힘":
      return "후진경보 · 유도자 · 보행동선 분리 확인";
    case "맞음":
      return "상부작업 통제 · 적재상태 · 안전모 확인";
    case "깔림":
      return "적재높이 · 받침상태 · 장비 정지선 확인";
    case "넘어짐":
      return "바닥 정리 · 물기 제거 · 통로 확보 확인";
    case "화재폭발":
      return "화기작업 허가 · 소화기 · 가연물 제거 확인";
    case "질식중독":
      return "환기 · 산소농도 측정 · 감시인 배치 확인";
    default:
      return "작업 전 위험요인 · 보호구 · 작업동선 확인";
  }
}

function scoreRelevance(text: string, industryTag: IndustryTag) {
  let score = 0;

  for (const keyword of WASTE_KEYWORDS) {
    if (text.includes(keyword)) score += 2;
  }

  if (industryTag === "폐기물") score += 10;
  if (industryTag === "공통") score += 1;

  return score;
}

function normalizeKoshas(items: Record<string, unknown>[]): SafetyCaseCard[] {
  return items.map((item, index) => {
    const title =
      pickText(item, [
        "title",
        "ttl",
        "subject",
        "sj",
        "boardTitle",
        "bbsTitle",
        "dataTitle",
      ]) || "KOSHA 안전사례";

    const summary =
      pickText(item, [
        "summary",
        "content",
        "cn",
        "contents",
        "accidentCn",
        "caseCn",
        "dataContent",
      ]) || title;

    const date =
      pickText(item, [
        "date",
        "regDate",
        "writngDe",
        "writeDate",
        "createdAt",
        "dataRegDt",
      ]) || "";

    const location =
      pickText(item, ["location", "area", "place", "region", "addr"]) || "";

    const boardNo =
      pickText(item, ["boardno", "boardNo", "bbsNo", "id", "seq"]) ||
      `kosha-${index}`;

    const combined = `${title} ${summary} ${location}`;
    const accidentType = classifyAccidentType(combined);
    const industryTag = classifyIndustry(combined);
    const relevanceScore = scoreRelevance(combined, industryTag);

    return {
      id: String(boardNo),
      title,
      date,
      location,
      accidentType,
      industryTag,
      summary,
      action: getActionByAccidentType(accidentType),
      source: "KOSHA",
      relevanceScore,
      isSimilarIndustry: industryTag === "폐기물",
    };
  });
}

function extractItems(payload: unknown): Record<string, unknown>[] {
  if (!payload || typeof payload !== "object") return [];

  const data = payload as Record<string, unknown>;

  const candidates = [
    data.items,
    data.item,
    data.data,
    data.list,
    data.result,
    data.response &&
      typeof data.response === "object" &&
      (data.response as Record<string, unknown>).body &&
      typeof (data.response as Record<string, unknown>).body === "object" &&
      ((data.response as Record<string, unknown>).body as Record<string, unknown>)
        .items,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter(
        (x): x is Record<string, unknown> =>
          typeof x === "object" && x !== null
      );
    }

    if (
      candidate &&
      typeof candidate === "object" &&
      Array.isArray((candidate as Record<string, unknown>).item)
    ) {
      return ((candidate as Record<string, unknown>).item as unknown[]).filter(
        (x): x is Record<string, unknown> =>
          typeof x === "object" && x !== null
      );
    }
  }

  return [];
}

function sampleCases(): SafetyCaseCard[] {
  return [
    {
      id: "sample-waste-001",
      title: "폐기물 설비 점검 중 끼임 위험 사례",
      date: new Date().toISOString().slice(0, 10),
      location: "",
      accidentType: "끼임",
      industryTag: "폐기물",
      summary: "설비 점검 중 정지 확인과 방호조치가 미흡한 상태에서 끼임 위험이 발생할 수 있습니다.",
      action: "설비 정지 · 방호덮개 · LOTO 확인",
      source: "SAMPLE",
      relevanceScore: 20,
      isSimilarIndustry: true,
    },
    {
      id: "sample-waste-002",
      title: "수거차 후진 작업 중 부딪힘 위험 사례",
      date: new Date().toISOString().slice(0, 10),
      location: "",
      accidentType: "부딪힘",
      industryTag: "폐기물",
      summary: "후진 차량 주변 보행자 확인과 유도자 배치가 미흡하면 부딪힘 위험이 커질 수 있습니다.",
      action: "후진경보 · 유도자 · 보행동선 분리 확인",
      source: "SAMPLE",
      relevanceScore: 18,
      isSimilarIndustry: true,
    },
    {
      id: "sample-common-001",
      title: "작업장 통로 정리 미흡으로 넘어짐 위험 사례",
      date: new Date().toISOString().slice(0, 10),
      location: "",
      accidentType: "넘어짐",
      industryTag: "공통",
      summary: "통로 적치물과 바닥 물기로 인해 이동 중 넘어짐 위험이 발생할 수 있습니다.",
      action: "바닥 정리 · 물기 제거 · 통로 확보 확인",
      source: "SAMPLE",
      relevanceScore: 4,
      isSimilarIndustry: false,
    },
    {
      id: "sample-common-002",
      title: "상부 적재물 낙하 위험 사례",
      date: new Date().toISOString().slice(0, 10),
      location: "",
      accidentType: "맞음",
      industryTag: "공통",
      summary: "상부 적재 상태가 불안정하면 작업자에게 물체가 떨어질 위험이 있습니다.",
      action: "상부작업 통제 · 적재상태 · 안전모 확인",
      source: "SAMPLE",
      relevanceScore: 3,
      isSimilarIndustry: false,
    },
    {
      id: "sample-common-003",
      title: "화기작업 전 가연물 정리 미흡 사례",
      date: new Date().toISOString().slice(0, 10),
      location: "",
      accidentType: "화재폭발",
      industryTag: "공통",
      summary: "용접 등 화기작업 전 주변 가연물 제거와 소화기 준비가 필요합니다.",
      action: "화기작업 허가 · 소화기 · 가연물 제거 확인",
      source: "SAMPLE",
      relevanceScore: 3,
      isSimilarIndustry: false,
    },
  ];
}

function selectCards(cards: SafetyCaseCard[]) {
  const sorted = [...cards].sort((a, b) => b.relevanceScore - a.relevanceScore);

  const similar = sorted
    .filter((card) => card.isSimilarIndustry)
    .slice(0, 2);

  const common = sorted
    .filter((card) => !similar.some((s) => s.id === card.id))
    .slice(0, 3);

  return [...similar, ...common].slice(0, 5);
}

async function fetchKoshaCases() {
  if (!KOSHA_SERVICE_KEY) {
    return [];
  }

  const params = new URLSearchParams({
    ServiceKey: KOSHA_SERVICE_KEY,
    business: "",
    keyword: "",
    callApiId: KOSHA_CALL_API_ID,
    pageNo: "1",
    numOfRows: "20",
  });

  const url = `${KOSHA_API_BASE_URL}?${params.toString()}`;

  const response = await fetch(url, {
    next: { revalidate: 60 * 60 },
  });

  if (!response.ok) {
    throw new Error(`KOSHA API failed: ${response.status}`);
  }

  const payload = await response.json();
  const items = extractItems(payload);

  return normalizeKoshas(items);
}

export async function GET() {
  try {
    const koshaCards = await fetchKoshaCases();
    const cards = koshaCards.length > 0 ? selectCards(koshaCards) : sampleCases();

    return NextResponse.json({
      ok: true,
      title: "최근 안전사고 사례",
      subtitle: "유사 사고를 확인하고 오늘 TBM에 반영하세요.",
      source: koshaCards.length > 0 ? "KOSHA" : "SAMPLE",
      cards,
    });
  } catch (error) {
    console.error("[safety-news]", error);

    return NextResponse.json({
      ok: true,
      title: "최근 안전사고 사례",
      subtitle: "유사 사고를 확인하고 오늘 TBM에 반영하세요.",
      source: "SAMPLE",
      cards: sampleCases(),
      warning: "KOSHA API 호출 실패로 샘플 데이터를 표시합니다.",
    });
  }
}