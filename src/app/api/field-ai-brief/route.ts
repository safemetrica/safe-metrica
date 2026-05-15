import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getCompanyConfig } from "@/lib/company";
import { getRiskIntelligenceData } from "@/lib/risk";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const company = await getCompanyConfig();

    const headers = {
      Authorization: `Bearer ${company.notionApiKey}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    };

    const [tbmRes, ebRes, ptwRes] = await Promise.all([
      fetch(`https://api.notion.com/v1/databases/${company.tbmDbId}/query`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          page_size: 10,
          sorts: [{ property: "날짜", direction: "descending" }],
        }),
        cache: "no-store",
      }),
      fetch(`https://api.notion.com/v1/databases/${company.ebmDbId}/query`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          page_size: 10,
          sorts: [{ property: "업로드 날짜", direction: "descending" }],
        }),
        cache: "no-store",
      }),
      fetch(`https://api.notion.com/v1/databases/${company.ptwDbId}/query`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          page_size: 5,
          sorts: [{ property: "작업일", direction: "descending" }],
        }),
        cache: "no-store",
      }),
    ]);

    const [tbmData, ebData, ptwData] = await Promise.all([
      tbmRes.json(),
      ebRes.json(),
      ptwRes.json(),
    ]);

    const risk = await getRiskIntelligenceData(company.riskAssessmentDbId, company.notionApiKey);
    const tbmShareNames = risk.tbmShareNeededItems
      .map((item) => item.title || item.taskName || item.processName)
      .filter(Boolean)
      .join(", ");

    const today = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);

    const tbmRows = (tbmData.results ?? []).map((p: any) => ({
      작업명: p.properties["작업명"]?.title?.[0]?.plain_text ?? "",
      날짜: p.properties["날짜"]?.date?.start ?? "",
      특이사항: p.properties["특이사항"]?.checkbox ?? false,
      조치상태: p.properties["조치 상태"]?.select?.name ?? "",
      연결EB: p.properties["연결 EB"]?.relation?.length ?? 0,
      작업태그: p.properties["작업 태그"]?.multi_select?.map((t: any) => t.name) ?? [],
    }));

    const ebRows = (ebData.results ?? []).map((p: any) => ({
      제목: p.properties["증빙 제목"]?.title?.[0]?.plain_text ?? "",
      날짜: p.properties["업로드 날짜"]?.date?.start ?? "",
      관련TBM: p.properties["관련 TBM"]?.relation?.length ?? 0,
    }));

    const ptwRows = (ptwData.results ?? []).map((p: any) => ({
      작업유형: p.properties["작업유형"]?.select?.name ?? "",
      승인상태: p.properties["승인상태"]?.select?.name ?? "",
      허용여부: p.properties["작업 허용 여부"]?.select?.name ?? "",
    }));

    const 오늘TBM = tbmRows.filter((r: any) => r.날짜 === today);
    const EB누락 = tbmRows.filter((r: any) => r.특이사항 && r.연결EB === 0);
    const 조치필요 = tbmRows.filter((r: any) => r.조치상태 === "조치 필요");
    const PTW위험 = ptwRows.filter((r: any) => r.허용여부 === "금지" || r.승인상태 === "반려");

    const context = `오늘 날짜: ${today}
오늘 TBM 제출: ${오늘TBM.length}건 (${오늘TBM.map((r: any) => r.작업명).join(", ") || "없음"})
EB 누락(특이사항 있으나 미등록): ${EB누락.length}건 (${EB누락.map((r: any) => r.작업명).join(", ") || "없음"})
조치 미완료: ${조치필요.length}건
PTW 금지/반려: ${PTW위험.length}건
TBM 공유 필요 위험요인: ${risk.tbmShareNeededCount}건 (${tbmShareNames || "없음"})
최근 EB 등록: ${ebRows.length}건`;

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const chat = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "당신은 생활폐기물·환경미화 현장의 안전 AI 비서입니다. 현장관리감독자와 안전담당자에게 오늘 현장 상황을 브리핑하고 즉시 해야 할 일을 안내합니다. 출력 규칙: 3줄 이내, 자연스러운 한국어, 현장 담당자가 바로 행동할 수 있는 구체적 지시, 이모지 1~2개 사용. TBM 공유 필요 위험요인이 있으면 작업 전 근로자에게 반복 공유하라고 안내하세요.",
        },
        {
          role: "user",
          content: `현장 현황:\n${context}\n\n현장관리자에게 오늘 안전 브리핑을 해주세요.`,
        },
      ],
      max_tokens: 200,
      temperature: 0.4,
    });

    const brief = chat.choices[0]?.message?.content ?? "브리핑을 가져올 수 없습니다.";
    return NextResponse.json({ brief, updatedAt: new Date().toISOString() });
  } catch (e: any) {
    return NextResponse.json({ brief: "AI 브리핑 오류: " + e.message }, { status: 500 });
  }
}