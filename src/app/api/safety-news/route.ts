import { NextRequest, NextResponse } from "next/server";
import { getCompanyConfig } from "@/lib/company";
import { getKstDateKey, pickDailyItem } from "@/lib/dailySafetyCase";
import {
  normalizeIndustryTag,
  scoreIndustrySimilarity,
} from "@/lib/safetyIndustry";

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
  relevanceScore: number;
  isSimilarIndustry: boolean;
};

type KoshaItem = {
  business?: string;
  contents?: string;
  keyword?: string;
  boardno?: string;
};

type KoshaPayload = {
  body?: {
    items?: {
      item?: KoshaItem[] | KoshaItem;
    };
  };
};

const KOSHA_API_BASE_URL =
  process.env.KOSHA_API_BASE_URL ||
  "https://apis.data.go.kr/B552468/disaster_api02/getdisaster_api02";

const KOSHA_SERVICE_KEY = process.env.KOSHA_SERVICE_KEY || "";
const KOSHA_CALL_API_ID = process.env.KOSHA_CALL_API_ID || "1060";

function classifyAccidentType(text: string): AccidentType {
  const value = text.replace(/\s/g, "");

  if (/추락|떨어짐|사다리|개구부|지붕|단부|고소|발판/.test(value)) {
    return "떨어짐";
  }

  if (/끼임|협착|말림|롤러|컨베이어|벨트|압축기|프레스|투입구|운반구|승강로/.test(value)) {
    return "끼임";
  }

  if (/충돌|부딪힘|후진|지게차|차량|장비|CCTV|주차/.test(value)) {
    return "부딪힘";
  }

  if (/낙하|비래|맞음|인양물|떨어진물체/.test(value)) {
    return "맞음";
  }

  if (/깔림|전도|전복|붕괴|무너짐|뒤집힘/.test(value)) {
    return "깔림";
  }

  if (/넘어짐|미끄러짐|통로|바닥/.test(value)) {
    return "넘어짐";
  }

  if (/화재|폭발|파열|인화|용접|분진/.test(value)) {
    return "화재폭발";
  }

  if (/질식|중독|산소결핍|밀폐공간|가스/.test(value)) {
    return "질식중독";
  }

  return "기타";
}

function classifyIndustry(text: string): IndustryTag {
  const value = text.replace(/\s/g, "");

  if (/폐기물|생활폐기물|환경미화|수거차|청소차|압축기|투입구/.test(value)) {
    return "폐기물";
  }

  if (/건설|비계|개구부|철거|해체|굴착|크레인|공사|현장/.test(value)) {
    return "건설";
  }

  if (/제조|공장|프레스|컨베이어|롤러|설비|기계|사다리/.test(value)) {
    return "제조";
  }

  if (/물류|창고|상하차|지게차|팔레트|적재|화물/.test(value)) {
    return "물류";
  }

  return "공통";
}

function getActionByAccidentType(type: AccidentType): string {
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

function scoreRelevance(
  text: string,
  cardIndustryTag: IndustryTag,
  tenantIndustryTag: IndustryTag
): number {
  const industryScore = scoreIndustrySimilarity(tenantIndustryTag, text);
  const commonScore = scoreIndustrySimilarity("공통", text);

  let score = 0;

  if (cardIndustryTag === tenantIndustryTag) {
    score += 10;
  }

  if (cardIndustryTag === "공통") {
    score += 2;
  }

  score += industryScore * 2;
  score += commonScore;

  return score;
}

function normalizeKoshaItems(items: KoshaItem[]): SafetyCaseCard[] {
  return items.map((item, index) => {
    const title = item.keyword || "KOSHA 안전사례";
    const summary = item.contents || title;
    const combined = `${item.business || ""} ${title} ${summary}`;

    const accidentType = classifyAccidentType(combined);
    const industryTag = classifyIndustry(combined);

    return {
      id: item.boardno || `kosha-${index}`,
      title,
      date: "",
      location: "",
      accidentType,
      industryTag,
      summary,
      action: getActionByAccidentType(accidentType),
      source: "KOSHA",
      relevanceScore: scoreIndustrySimilarity("공통", combined),
      isSimilarIndustry: false,
    };
  });
}

function sampleCases(): SafetyCaseCard[] {
  const today = getKstDateKey();

  return [
    {
      id: "sample-waste-001",
      title: "폐기물 설비 점검 중 끼임 위험 사례",
      date: today,
      location: "",
      accidentType: "끼임",
      industryTag: "폐기물",
      summary:
        "설비 점검 중 정지 확인과 방호조치가 미흡한 상태에서 끼임 위험이 발생할 수 있습니다.",
      action: "설비 정지 · 방호덮개 · LOTO 확인",
      source: "SAMPLE",
      relevanceScore: 20,
      isSimilarIndustry: true,
    },
    {
      id: "sample-waste-002",
      title: "수거차 후진 작업 중 부딪힘 위험 사례",
      date: today,
      location: "",
      accidentType: "부딪힘",
      industryTag: "폐기물",
      summary:
        "후진 차량 주변 보행자 확인과 유도자 배치가 미흡하면 부딪힘 위험이 커질 수 있습니다.",
      action: "후진경보 · 유도자 · 보행동선 분리 확인",
      source: "SAMPLE",
      relevanceScore: 18,
      isSimilarIndustry: true,
    },
    {
      id: "sample-logistics-001",
      title: "지게차와 보행자 동선 중첩으로 부딪힘 위험 사례",
      date: today,
      location: "",
      accidentType: "부딪힘",
      industryTag: "물류",
      summary:
        "창고·상하차 구역에서 지게차 운행 동선과 작업자 보행 동선이 분리되지 않으면 부딪힘 위험이 커질 수 있습니다.",
      action: "지게차 운행구역 · 보행통로 분리 · 유도자 · 후방 확인",
      source: "SAMPLE",
      relevanceScore: 22,
      isSimilarIndustry: true,
    },
    {
      id: "sample-logistics-002",
      title: "상하차 작업 중 화물 낙하·맞음 위험 사례",
      date: today,
      location: "",
      accidentType: "맞음",
      industryTag: "물류",
      summary:
        "상하차 작업 중 적재상태가 불안정하거나 팔레트 결속이 미흡하면 화물 낙하로 맞음 위험이 발생할 수 있습니다.",
      action: "적재상태 · 팔레트 파손 · 결속상태 · 작업반경 통제 확인",
      source: "SAMPLE",
      relevanceScore: 21,
      isSimilarIndustry: true,
    },
    {
      id: "sample-logistics-003",
      title: "도크·출고장 통로 미확보로 넘어짐 위험 사례",
      date: today,
      location: "",
      accidentType: "넘어짐",
      industryTag: "물류",
      summary:
        "출고장과 도크 주변에 박스, 랩, 파렛트 잔재물이 방치되면 작업자 이동 중 넘어짐 위험이 증가합니다.",
      action: "도크 주변 정리 · 통로 확보 · 랩·밴딩끈 제거 · 조도 확인",
      source: "SAMPLE",
      relevanceScore: 20,
      isSimilarIndustry: true,
    },
    {
      id: "sample-common-001",
      title: "작업장 통로 정리 미흡으로 넘어짐 위험 사례",
      date: today,
      location: "",
      accidentType: "넘어짐",
      industryTag: "공통",
      summary:
        "통로 적치물과 바닥 물기로 인해 이동 중 넘어짐 위험이 발생할 수 있습니다.",
      action: "바닥 정리 · 물기 제거 · 통로 확보 확인",
      source: "SAMPLE",
      relevanceScore: 4,
      isSimilarIndustry: false,
    },
    {
      id: "sample-common-002",
      title: "상부 적재물 낙하 위험 사례",
      date: today,
      location: "",
      accidentType: "맞음",
      industryTag: "공통",
      summary:
        "상부 적재 상태가 불안정하면 작업자에게 물체가 떨어질 위험이 있습니다.",
      action: "상부작업 통제 · 적재상태 · 안전모 확인",
      source: "SAMPLE",
      relevanceScore: 3,
      isSimilarIndustry: false,
    },
    {
      id: "sample-common-003",
      title: "화기작업 전 가연물 정리 미흡 사례",
      date: today,
      location: "",
      accidentType: "화재폭발",
      industryTag: "공통",
      summary:
        "용접 등 화기작업 전 주변 가연물 제거와 소화기 준비가 필요합니다.",
      action: "화기작업 허가 · 소화기 · 가연물 제거 확인",
      source: "SAMPLE",
      relevanceScore: 3,
      isSimilarIndustry: false,
    },
  ];
}

function selectCards(
  cards: SafetyCaseCard[],
  tenantIndustryTag: IndustryTag,
  companySeed: string
): SafetyCaseCard[] {
  const dateKey = getKstDateKey();

  const scored = cards.map((card) => {
    const text = `${card.title} ${card.summary} ${card.action}`;
    const industryKeywordScore = scoreIndustrySimilarity(tenantIndustryTag, text);
    const score = scoreRelevance(text, card.industryTag, tenantIndustryTag);

    return {
      ...card,
      relevanceScore: score,
            isSimilarIndustry:
              card.industryTag === tenantIndustryTag ||
              (card.industryTag === "공통" && industryKeywordScore > 0), 
    };
  });

  const industryCandidates = scored
    .filter((card) => card.isSimilarIndustry)
    .sort((a, b) => b.relevanceScore - a.relevanceScore);

  const commonCandidates = scored
    .filter((card) => card.industryTag === "공통" && !card.isSimilarIndustry)
    .sort((a, b) => b.relevanceScore - a.relevanceScore);

  const industryPick =
    pickDailyItem(industryCandidates, [
      companySeed,
      tenantIndustryTag,
      dateKey,
      "industry",
    ]) ?? getIndustryFallbackCard(tenantIndustryTag);

  const commonPick =
    pickDailyItem(commonCandidates, [
      companySeed,
      tenantIndustryTag,
      dateKey,
      "common",
    ]) ??
    scored.find(
      (card) =>
        card.industryTag === "공통" &&
        card.id !== industryPick?.id
    ) ??
    getIndustryFallbackCard("공통");

  const selected = [industryPick, commonPick]
    .filter((card): card is SafetyCaseCard => Boolean(card))
    .filter(
      (card, index, array) =>
        array.findIndex((item) => item.id === card.id) === index
    );

  return selected.slice(0, 2);
}
 
async function fetchKoshaCases(): Promise<SafetyCaseCard[]> {
  if (!KOSHA_SERVICE_KEY) {
    return [];
  }

  const params = new URLSearchParams({
    serviceKey: KOSHA_SERVICE_KEY,
    pageNo: "1",
    numOfRows: "20",
    business: "",
    keyword: "",
    callApiId: KOSHA_CALL_API_ID,
  });

  const response = await fetch(`${KOSHA_API_BASE_URL}?${params.toString()}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`KOSHA API failed: ${response.status}`);
  }

  const payload = (await response.json()) as KoshaPayload;
  const rawItem = payload.body?.items?.item;

  if (!rawItem) {
    return [];
  }

  const items = Array.isArray(rawItem) ? rawItem : [rawItem];

  return normalizeKoshaItems(items);
}

async function getTenantSafetyContext(request?: NextRequest): Promise<{
  industryTag: IndustryTag;
  safetyCaseEnabled: boolean;
  companySeed: string;
}> {
  const queryIndustryTag = request?.nextUrl.searchParams.get("industryTag") ?? "";
  const queryCompanySeed = request?.nextUrl.searchParams.get("companySeed") ?? "";
  const queryCompanyName = request?.nextUrl.searchParams.get("companyName") ?? "";

  const inferIndustryTag = (rawIndustryTag: string, identity: string): IndustryTag => {
    if (/폐기물|waste|환경/i.test(`${rawIndustryTag} ${identity}`)) {
      return "폐기물";
    }

    const normalized = normalizeIndustryTag(rawIndustryTag);

    if (normalized !== "공통") {
      return normalized;
    }

    return /대도환경|동우환경|한국그린환경|daedo|dongwoo|greenkorea/i.test(identity)
      ? "폐기물"
      : "공통";
  };

  // Query context가 있으면 API route 내부 company lookup 실패와 무관하게 우선 적용한다.
  if (queryIndustryTag || queryCompanySeed || queryCompanyName) {
    const identity = `${queryCompanySeed} ${queryCompanyName}`;

    return {
      industryTag: inferIndustryTag(queryIndustryTag, identity),
      safetyCaseEnabled: true,
      companySeed: queryCompanySeed || queryCompanyName || "query-tenant",
    };
  }

  try {
    const company = await getCompanyConfig();
    const identity = `${company.code ?? ""} ${company.name ?? ""}`;

    return {
      industryTag: inferIndustryTag(company.industryTag ?? "", identity),
      safetyCaseEnabled: company.safetyCaseEnabled ?? true,
      companySeed: company.code,
    };
  } catch (error) {
    console.error("[safety-news] tenant context fallback", error);

    return {
      industryTag: "공통",
      safetyCaseEnabled: true,
      companySeed: "anonymous",
    };
  }
}

export async function GET(request: NextRequest) {
  const tenantContext = await getTenantSafetyContext(request);

  if (!tenantContext.safetyCaseEnabled) {
    return NextResponse.json({
      ok: true,
      title: "최근 안전사고 사례",
      subtitle: "유사 사고를 확인하고 오늘 TBM에 반영하세요.",
      source: "KOSHA",
      mode: "disabled",
      dateKey: getKstDateKey(),
      cards: [],
    });
  }

  try {
    const koshaCards = await fetchKoshaCases();

    // KOSHA 결과가 있더라도 업종 유사 사례가 부족할 수 있으므로
    // 기존 tenant-aware 선별 로직은 유지하되, SAMPLE은 보조 후보로만 포함한다.
    const sourceCards =
      koshaCards.length > 0
        ? [...koshaCards, ...sampleCases()]
        : sampleCases();

    const cards = selectCards(
      sourceCards,
      tenantContext.industryTag,
      tenantContext.companySeed
    );

    const responseSource = cards.some((card) => card.source === "KOSHA")
      ? "KOSHA"
      : "SAMPLE";

    return NextResponse.json({
      ok: true,
      title: "최근 안전사고 사례",
      subtitle: "유사 사고를 확인하고 오늘 TBM에 반영하세요.",
      source: responseSource,
      mode: "tenant-aware",
      dateKey: getKstDateKey(),
      industryTag: tenantContext.industryTag,
      cards,
    });
  } catch (error) {
    console.error("[safety-news]", error);

    const cards = selectCards(
      sampleCases(),
      tenantContext.industryTag,
      tenantContext.companySeed
    );

    return NextResponse.json({
      ok: true,
      title: "최근 안전사고 사례",
      subtitle: "유사 사고를 확인하고 오늘 TBM에 반영하세요.",
      source: "SAMPLE",
      mode: "tenant-aware",
      dateKey: getKstDateKey(),
      cards,
      warning: "KOSHA API 호출 실패로 샘플 데이터를 표시합니다.",
    });
  }
}
function getIndustryFallbackCard(
  tenantIndustryTag: IndustryTag
): SafetyCaseCard | null {
  const samples = sampleCases();

  return (
    samples.find((card) => card.industryTag === tenantIndustryTag) ??
    samples.find((card) => card.industryTag === "공통") ??
    null
  );
}