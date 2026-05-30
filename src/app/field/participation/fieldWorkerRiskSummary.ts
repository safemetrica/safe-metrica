import "server-only";

import { getCompanyConfigByCode } from "@/lib/company";
import { getRiskIntelligenceData, type RiskItemDetail } from "@/lib/risk";

export type FieldWorkerRiskSummaryItem = {
  id: string;
  title: string;
  taskName: string;
  hazard: string;
  accidentType: string;
  riskLevel: string;
  currentControls: string;
  improvementPlan: string;
};

export type FieldWorkerRiskSummary = {
  hasDb: boolean;
  total: number;
  items: FieldWorkerRiskSummaryItem[];
  memo: string;
};

function normalizeCompanyCode(value?: string | null) {
  const code = (value ?? "").trim().toLowerCase();

  if (
    code === "korea-green" ||
    code === "korea_green" ||
    code === "koreagreen" ||
    code === "greenkorea"
  ) {
    return "hankookgreen";
  }

  return code;
}

function isOperatingRiskSummaryTarget(rawCode?: string | null) {
  const code = normalizeCompanyCode(rawCode);

  // 몬스는 공통 고도화 대상 아님. 절대 위험성평가 요약 표시하지 않음.
  return Boolean(code) && code !== "mons";
}

function isMajorFieldRisk(item: RiskItemDetail) {
  const accidentType = item.accidentType || "";
  const text = `${item.taskName} ${item.hazard} ${item.improvementPlan} ${item.currentControls}`;

  return (
    item.riskLevel === "상" ||
    accidentType.includes("끼임") ||
    accidentType.includes("협착") ||
    accidentType.includes("충돌") ||
    accidentType.includes("부딪힘") ||
    accidentType.includes("추락") ||
    accidentType.includes("낙하") ||
    accidentType.includes("질식") ||
    accidentType.includes("화재") ||
    /후진|차량|지게차|압축|선별|상하차|적재|청소|수거|컨베이어|프레스|LOTO/i.test(text)
  );
}

function toSummaryItem(item: RiskItemDetail): FieldWorkerRiskSummaryItem {
  return {
    id: item.id,
    title: item.title || item.taskName || item.processName || item.hazard || "위험성평가 항목",
    taskName: item.taskName || item.processName || item.title || "-",
    hazard: item.hazard || item.accidentType || "-",
    accidentType: item.accidentType || "-",
    riskLevel: item.riskLevel || "-",
    currentControls: item.currentControls || "-",
    improvementPlan: item.improvementPlan || item.currentControls || "-",
  };
}

function buildSharedRiskMemo(items: FieldWorkerRiskSummaryItem[]) {
  if (items.length === 0) {
    return "";
  }

  const lines = ["[공유된 위험성평가 주요 항목]"];

  items.forEach((item, index) => {
    lines.push(
      `${index + 1}. ${item.taskName} / 위험요인: ${item.hazard} / 개선대책: ${item.improvementPlan}`
    );
  });

  return lines.join("\n").slice(0, 1500);
}

export async function getFieldWorkerRiskSummary(
  rawCompanyCode?: string | null
): Promise<FieldWorkerRiskSummary | null> {
  const companyCode = normalizeCompanyCode(rawCompanyCode);

  if (!isOperatingRiskSummaryTarget(companyCode)) {
    return null;
  }

  try {
    const company = await getCompanyConfigByCode(companyCode);
    const risk = await getRiskIntelligenceData(company.riskAssessmentDbId, company.notionApiKey);

    if (!risk.hasDb) {
      return {
        hasDb: false,
        total: 0,
        items: [],
        memo: "",
      };
    }

    const selected = [
      ...risk.tbmShareNeededItems,
      ...risk.items.filter(isMajorFieldRisk),
      ...risk.items,
    ];

    const seen = new Set<string>();
    const items = selected
      .filter((item) => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      })
      .slice(0, 3)
      .map(toSummaryItem);

    return {
      hasDb: true,
      total: risk.total,
      items,
      memo: buildSharedRiskMemo(items),
    };
  } catch (error) {
    console.error("[field-worker-risk-summary]", error);

    return {
      hasDb: false,
      total: 0,
      items: [],
      memo: "",
    };
  }
}
