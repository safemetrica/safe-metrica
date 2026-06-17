import "server-only";

import { selectSupabaseExportRows } from "@/lib/supabaseServer";

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

type LockedRiskShareItemRow = {
  id?: string;
  task_name?: string | null;
  hazard?: string | null;
  accident_type?: string | null;
  risk_level?: string | null;
  current_controls?: string | null;
  improvement_plan?: string | null;
  worker_share_summary?: string | null;
  share_status?: string | null;
  customer_confirmed?: boolean | null;
  worker_visible?: boolean | null;
  version_lock_id?: string | null;
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

function cleanText(value: unknown, fallback = "-") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toSummaryItem(item: LockedRiskShareItemRow): FieldWorkerRiskSummaryItem {
  const taskName = cleanText(item.task_name, "작업명 확인 필요");
  const hazard = cleanText(item.hazard, "위험요인 확인 필요");
  const improvementPlan = cleanText(
    item.worker_share_summary || item.improvement_plan || item.current_controls,
    "안전조치 확인 필요"
  );

  return {
    id: cleanText(item.id, `${taskName}-${hazard}`),
    title: taskName,
    taskName,
    hazard,
    accidentType: cleanText(item.accident_type, "-"),
    riskLevel: cleanText(item.risk_level, "-"),
    currentControls: cleanText(item.current_controls, "-"),
    improvementPlan,
  };
}

function buildSharedRiskMemo(items: FieldWorkerRiskSummaryItem[]) {
  if (items.length === 0) {
    return "";
  }

  const lines = ["[근로자 공유 위험요인]"];

  items.forEach((item, index) => {
    lines.push(
      `${index + 1}. ${item.taskName} / 위험요인: ${item.hazard} / 확인할 안전조치: ${item.improvementPlan}`
    );
  });

  return lines.join("\n").slice(0, 1500);
}

async function fetchLockedRiskShareItems(companyCode: string) {
  const query = new URLSearchParams({
    select:
      "id,task_name,hazard,accident_type,risk_level,current_controls,improvement_plan,worker_share_summary,share_status,customer_confirmed,worker_visible,version_lock_id",
    company_code: `eq.${companyCode}`,
    share_status: "eq.locked",
    customer_confirmed: "eq.true",
    worker_visible: "eq.true",
    version_lock_id: "not.is.null",
    order: "version_locked_at.desc.nullslast,created_at.desc",
    limit: "100",
  });

  return selectSupabaseExportRows<LockedRiskShareItemRow>("risk_share_items", query);
}

export async function getFieldWorkerRiskSummary(
  rawCompanyCode?: string | null
): Promise<FieldWorkerRiskSummary | null> {
  const companyCode = normalizeCompanyCode(rawCompanyCode);

  if (!isOperatingRiskSummaryTarget(companyCode)) {
    return null;
  }

  try {
    const lockedItems = await fetchLockedRiskShareItems(companyCode);
    const items = lockedItems.slice(0, 3).map(toSummaryItem);

    return {
      hasDb: true,
      total: lockedItems.length,
      items,
      memo: buildSharedRiskMemo(items),
    };
  } catch (error) {
    console.error("[field-worker-risk-summary-locked-items]", error);

    return {
      hasDb: false,
      total: 0,
      items: [],
      memo: "",
    };
  }
}
