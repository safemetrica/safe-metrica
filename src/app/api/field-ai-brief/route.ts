import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getCompanyConfig } from "@/lib/company";
import { getRiskIntelligenceData } from "@/lib/risk";
import { needsTbmEvidenceBook } from "@/lib/tbmStatus";

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
      rawProps: p.properties ?? {},
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
    const EB누락 = tbmRows.filter((r: any) => needsTbmEvidenceBook(r.rawProps ?? {}) && r.연결EB === 0);
    const 조치필요 = tbmRows.filter((r: any) => r.조치상태 === "조치 필요");
    const PTW위험 = ptwRows.filter((r: any) => r.허용여부 === "금지" || r.승인상태 === "반려");

    const context = `오늘 날짜: ${today}
오늘 TBM 제출: ${오늘TBM.length}건 (${오늘TBM.map((r: any) => r.작업명).join(", ") || "없음"})
EB 연결 필요(조치상태 기준 미연결): ${EB누락.length}건 (${EB누락.map((r: any) => r.작업명).join(", ") || "없음"})
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
            [
              "당신은 중소 고위험 사업장의 현장관리감독자를 돕는 SafeMetrica AI 현장비서입니다.",
              "목표는 단순 요약이 아니라, 관리감독자가 오늘 TBM에서 바로 말할 수 있는 짧은 진행 스크립트를 만드는 것입니다.",
              "반드시 아래 구조로 작성하세요.",
              "1줄: 오늘 가장 먼저 확인할 핵심 요약.",
              "2줄: '오늘 TBM에서는 ... 를 공유하세요.' 형식의 실제 발화 문장.",
              "3줄: '사진증빙은 ... 를 남기세요.' 형식의 증빙 안내.",
              "4줄: '우선 조치: ...' 형식의 한 가지 행동.",
              "출력 규칙: 4줄 이내, 자연스러운 한국어, 과도한 공포 표현 금지, 법적 단정 표현 금지.",
              "TBM 공유 필요 위험요인이 있으면 작업 전 근로자에게 반복 공유하도록 안내하세요.",
              "EB 연결 누락이 있으면 사진 또는 파일 증빙 연결을 안내하세요.",
              "PTW 금지/반려가 있으면 작업 전 승인상태 확인을 안내하세요.",
              "위험성평가표의 주요 위험요인은 TBM 공유와 근로자 주지 확인으로 연결해 안내하세요."
            ].join(" "),
        },
        {
          role: "user",
          content: `현장 현황:\n${context}\n\n위 정보를 바탕으로 현장관리자가 오늘 TBM 때 바로 읽을 수 있는 안전 브리핑 스크립트를 작성하세요.`,
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
