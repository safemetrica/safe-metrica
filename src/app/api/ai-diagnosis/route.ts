import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getCompanyConfig } from "@/lib/company";

export const dynamic = "force-dynamic";

type NotionHeaders = {
  Authorization: string;
  "Notion-Version": string;
  "Content-Type": string;
};

type RiskItem = {
  title: string;
  no: string;
  processName: string;
  hazard: string;
  riskLevel: string;
  improvementPlan: string;
  status: string;
  budgetRequired: boolean;
  reassessmentDate: string;
};

type RiskSummary = {
  hasDb: boolean;
  total: number;
  highRiskCount: number;
  actionNeededCount: number;
  budgetNeededCount: number;
  reassessmentDueCount: number;
  highRiskItems: RiskItem[];
};

function getTextPropPlainText(prop: any): string {
  return prop?.rich_text?.[0]?.plain_text?.trim() ?? "";
}

function getTitlePropPlainText(prop: any): string {
  return prop?.title?.[0]?.plain_text?.trim() ?? "";
}

function getSelectPropName(prop: any): string {
  return prop?.select?.name?.trim() ?? "";
}

function getCheckboxPropValue(prop: any): boolean {
  return prop?.checkbox ?? false;
}

function getDatePropStart(prop: any): string {
  return prop?.date?.start ?? "";
}

function getKstDateKey(date = new Date()): string {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

async function queryNotionDatabase(
  databaseId: string,
  headers: NotionHeaders,
  body: Record<string, unknown>,
) {
  const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Notion database query failed: ${response.status} ${text}`);
  }

  return response.json();
}

async function getRiskSummary(
  riskAssessmentDbId: string | undefined,
  headers: NotionHeaders,
): Promise<RiskSummary> {
  if (!riskAssessmentDbId) {
    return {
      hasDb: false,
      total: 0,
      highRiskCount: 0,
      actionNeededCount: 0,
      budgetNeededCount: 0,
      reassessmentDueCount: 0,
      highRiskItems: [],
    };
  }

  const riskData = await queryNotionDatabase(riskAssessmentDbId, headers, {
    page_size: 100,
  });

  const items: RiskItem[] = (riskData.results ?? []).map((page: any) => {
    const props = page.properties;

    return {
      title: getTitlePropPlainText(props["Risk Item"]),
      no: getTextPropPlainText(props["No"]),
      processName: getTextPropPlainText(props["processName"]),
      hazard: getTextPropPlainText(props["hazard"]),
      riskLevel: getSelectPropName(props["riskLevel"]),
      improvementPlan: getTextPropPlainText(props["improvementPlan"]),
      status: getSelectPropName(props["status"]),
      budgetRequired: getCheckboxPropValue(props["budgetRequired"]),
      reassessmentDate: getDatePropStart(props["reassessmentDate"]),
    };
  });

  const todayPlus30 = getKstDateKey(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  );

  const highRiskItems = items.filter(
    (item) => item.riskLevel === "상" && item.status !== "완료",
  );

  const actionNeededItems = items.filter(
    (item) => item.improvementPlan.trim().length > 0 && item.status !== "완료",
  );

  const budgetNeededItems = items.filter(
    (item) => item.budgetRequired && item.status !== "완료",
  );

  const reassessmentDueItems = items.filter(
    (item) =>
      item.reassessmentDate &&
      item.reassessmentDate <= todayPlus30 &&
      item.status !== "완료",
  );

  return {
    hasDb: true,
    total: items.length,
    highRiskCount: highRiskItems.length,
    actionNeededCount: actionNeededItems.length,
    budgetNeededCount: budgetNeededItems.length,
    reassessmentDueCount: reassessmentDueItems.length,
    highRiskItems: highRiskItems.slice(0, 3),
  };
}

function createRiskSummaryForPrompt(risk: RiskSummary): string {
  if (!risk.hasDb) {
    return "위험성평가 Risk Items DB가 아직 연결되지 않았습니다.";
  }

  const highRiskText =
    risk.highRiskItems.length > 0
      ? risk.highRiskItems
          .map((item, index) => {
            const name = item.title || item.processName || item.hazard || "위험성평가 항목";
            const hazard = item.hazard ? ` / 위험요인: ${item.hazard}` : "";
            return `${index + 1}. ${item.no ? `${item.no} ` : ""}${name}${hazard}`;
          })
          .join("\n")
      : "상위 고위험 항목 없음";

  return `Risk Intelligence:
- 전체 Risk Item: ${risk.total}건
- 고위험 관리 항목: ${risk.highRiskCount}건
- 개선대책 관리 필요: ${risk.actionNeededCount}건
- 예산 검토 필요: ${risk.budgetNeededCount}건
- 재평가 예정: ${risk.reassessmentDueCount}건
- 고위험 예시:
${highRiskText}`;
}

export async function GET() {
  try {
    const company = await getCompanyConfig();

    const headers: NotionHeaders = {
      Authorization: `Bearer ${company.notionApiKey}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    };

    const [tbmData, ptwData, risk] = await Promise.all([
      queryNotionDatabase(company.tbmDbId, headers, {
        page_size: 5,
        sorts: [{ property: "날짜", direction: "descending" }],
      }),
      queryNotionDatabase(company.ptwDbId, headers, {
        page_size: 10,
      }),
      getRiskSummary(company.riskAssessmentDbId, headers),
    ]);

    const tbmRows = (tbmData.results ?? []).map((page: any) => ({
      작업명: page.properties["작업명"]?.title?.[0]?.plain_text ?? "",
      날짜: page.properties["날짜"]?.date?.start ?? "",
      특이사항: page.properties["특이사항"]?.checkbox ?? false,
      조치상태: page.properties["조치 상태"]?.select?.name ?? "",
      연결EB: page.properties["연결 EB"]?.relation?.length ?? 0,
      작업태그:
        page.properties["작업 태그"]?.multi_select?.map((tag: any) => tag.name) ?? [],
    }));

    const ptwRows = (ptwData.results ?? []).map((page: any) => ({
      제목:
        page.properties["허가서 제목/번호 (예W-대도-20260324-고소-001)"]?.title?.[0]
          ?.plain_text ?? "",
      작업유형: page.properties["작업유형"]?.select?.name ?? "",
      승인상태: page.properties["승인상태"]?.select?.name ?? "",
      허용여부: page.properties["작업 허용 여부"]?.select?.name ?? "",
    }));

    // =========================
    // PTW 룰 엔진 - GPT 판정 금지
    // =========================
    const PTW_TRIGGER_TAGS = new Set([
      "고소작업",
      "밀폐공간",
      "용접/용단",
      "전기",
      "양중/중량물",
    ]);

    const ptwCandidateTbms = tbmRows.filter((row: any) =>
      (row.작업태그 ?? []).some((tag: string) => PTW_TRIGGER_TAGS.has(tag)),
    );

    const ptwRequired = ptwCandidateTbms.length > 0;

    const ptwApproved = ptwRows.some((row: any) =>
      ["승인", "완료"].includes(row.승인상태),
    );

    const ptwMissingOrNotApproved = ptwRequired && (!ptwRows.length || !ptwApproved);

    const ptwCandidateTags = Array.from(
      new Set(
        ptwCandidateTbms.flatMap((row: any) =>
          (row.작업태그 ?? []).filter((tag: string) => PTW_TRIGGER_TAGS.has(tag)),
        ),
      ),
    );

    // =========================
    // EB 룰 엔진 - GPT 판정 금지
    // EB 누락 = (특이사항 OR 조치 필요) AND (연결 EB 비어있음)
    // =========================
    const ebCandidateTbms = tbmRows.filter((row: any) => {
      const hasException = !!row.특이사항 || row.조치상태 === "조치 필요";
      const ebEmpty = (row.연결EB ?? 0) === 0;
      return hasException && ebEmpty;
    });

    const ebMissing = ebCandidateTbms.length > 0;

    const ebMissingTargets = ebCandidateTbms.slice(0, 2).map((row: any) => ({
      날짜: row.날짜,
      작업명: row.작업명,
      조치상태: row.조치상태 || "",
    }));

    const tbmSummary = tbmRows
      .map(
        (row: any, index: number) =>
          `[TBM${index + 1}] ${row.날짜} / ${row.작업명} / 태그: ${
            row.작업태그.join(", ") || "없음"
          } / 특이사항: ${row.특이사항 ? "있음" : "없음"} / EB연결: ${
            row.연결EB
          }건 / 조치상태: ${row.조치상태 || "없음"}`,
      )
      .join("\n");

    const riskPromptSummary = createRiskSummaryForPrompt(risk);

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const chat = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `당신은 생활폐기물·환경미화 현장의 산업안전 운영 브리핑 보조 AI입니다.

중요 원칙:
- 법령 위반, 처벌 가능성, 대표자 책임을 판단하거나 예측하지 마세요.
- PTW 필요/미제출/미승인 여부는 시스템 룰 엔진 값만 사용하세요.
- EB 누락 여부도 시스템 룰 엔진 값만 사용하세요.
- PTW/EB 확인 필요 문구는 시스템 prefix에서 이미 안내됩니다. 본문에서는 같은 내용을 반복하지 말고, 필요한 경우 "오늘 조치와 증빙 상태를 함께 확인하세요" 정도로만 짧게 언급하세요.
- 위험성평가 수치는 반드시 "고위험 관리 항목", "개선대책 관리 필요", "예산 검토 필요", "재평가 예정"이라는 항목명으로 구분해 설명하세요.
- "개선대책 관리 필요"와 "예산 검토 필요"를 "고위험 항목"이라고 합쳐 말하지 마세요.
- 숫자는 다음 형식처럼 분리해 표현하세요: "고위험 관리 항목 7건, 개선대책 관리 필요 15건, 예산 검토 필요 14건".
- 위험성평가는 단기 조치, 중기 담당자·기한 관리, 장기 예산·교육·설비개선, TBM 근로자 공유 관점으로 설명하세요.
- 위험성평가 항목은 법적 판단이 아니라 연간 개선계획, 예산, 교육, TBM 공유가 필요한 관리 신호로 설명하세요.
- "자동판정", "위반", "처벌", "확정" 같은 표현을 사용하지 마세요.
- "관리 필요", "확인 필요", "보완 권장", "TBM 공유 권장" 중심으로 말하세요.

브리핑 관점:
1. 단기: 오늘 조치·증빙·승인 확인
2. 중기: 개선대책 담당자·기한 관리
3. 장기: 예산·교육·설비투자 반영
4. 현장 참여: TBM에서 근로자에게 반복 공유

출력 규칙:
- 한국어
- 4줄 이내
- 불릿 없이 자연스러운 문장
- 이모지는 최대 2개
- 대표가 바로 이해할 수 있게 짧고 실행 중심으로 작성`,
        },
        {
          role: "user",
          content: `최근 TBM:
${tbmSummary}

룰 판정:
- ptwMissingOrNotApproved: ${ptwMissingOrNotApproved}
- ptwCandidateTags: ${ptwCandidateTags.join(", ") || "없음"}
- ebMissing: ${ebMissing}
- ebMissingTargets: ${JSON.stringify(ebMissingTargets)}

${riskPromptSummary}

위 정보를 바탕으로 대표용 AI 운영 브리핑을 작성해줘.
PTW/EB 확인 필요 문구는 시스템 prefix에서 이미 안내되므로 본문에서 반복하지 마세요. 본문은 위험성평가 관리신호를 중심으로 단기 조치, 중기 담당자·기한 관리, 장기 예산·교육·설비개선, TBM 근로자 공유 관점으로 안내해줘.`,
        },
      ],
      max_tokens: 360,
      temperature: 0.35,
    });

    const aiText =
      chat.choices[0]?.message?.content ?? "AI 운영 브리핑 결과를 가져올 수 없습니다.";

    const ptwPrefix = ptwMissingOrNotApproved
      ? `🚨 [확인 필요] PTW 대상 작업이 감지되었습니다(${ptwCandidateTags.join(
          ", ",
        )}). 작업 전 허가 상태를 확인하세요.\n`
      : "";

    const ebPrefix = ebMissing
      ? `🟥 [확인 필요] EB 증빙 연결이 필요한 TBM이 있습니다. 관리자 화면에서 해당 TBM의 증빙 연결 상태를 확인하세요.\n`
      : "";

    const diagnosis = ptwPrefix + ebPrefix + aiText;

    return NextResponse.json({
      diagnosis,

      ptwRequired,
      ptwApproved,
      ptwMissingOrNotApproved,
      ptwCandidateTags,

      ebMissing,
      ebMissingTargets,

      risk,

      updatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        diagnosis: "AI 운영 브리핑 오류: " + error.message,
        updatedAt: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}