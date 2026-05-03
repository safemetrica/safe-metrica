import { NextResponse } from "next/server";
import OpenAI from "openai";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const notionRes = await fetch(
      `https://api.notion.com/v1/databases/${process.env.NOTION_TBM_DB_ID}/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          page_size: 5,
          sorts: [{ property: "날짜", direction: "descending" }],
        }),
        cache: "no-store",
      }
    );
    const notionData = await notionRes.json();

    const rows = (notionData.results ?? []).map((p: any) => ({
      작업명: p.properties["작업명"]?.title?.[0]?.plain_text ?? "",
      날짜: p.properties["날짜"]?.date?.start ?? "",
      특이사항: p.properties["특이사항"]?.checkbox ?? false,
      조치상태: p.properties["조치 상태"]?.select?.name ?? "",
      연결EB: p.properties["연결 EB"]?.relation?.length ?? 0,
      작업태그: p.properties["작업 태그"]?.multi_select?.map((t: any) => t.name) ?? [],
      오늘주의사항: p.properties["오늘의 주의사항"]?.rich_text?.[0]?.plain_text ?? "",
    }));

    const summary = rows.map((r: any, i: number) =>
      `[${i + 1}] ${r.날짜} / ${r.작업명} / 태그: ${r.작업태그.join(", ") || "없음"} / 특이사항: ${r.특이사항 ? "있음" : "없음"} / EB연결: ${r.연결EB}건 / 조치상태: ${r.조치상태 || "없음"}`
    ).join("\n");

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const chat = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `당신은 산업안전 전문 AI 비서입니다. 생활폐기물 수거·환경미화 현장의 TBM 데이터를 분석하여 현장 대표에게 오늘의 핵심 안전 진단을 3줄 이내로 제공합니다. 
규칙:
- 특이사항 있음 + EB 미등록 → 즉시 경고
- 위험 태그(밀폐공간, 고소작업) → 법적 의무 안내
- 조치 필요 상태 → 조치 촉구
- 문제 없으면 → 간단한 칭찬 + 주의사항 1개
- 말투: 간결·명확 (3줄 이내, 불릿 없이 자연스러운 문장)`
        },
        {
          role: "user",
          content: `최근 TBM 5건:\n${summary}\n\n오늘 현장 안전 진단 부탁합니다.`
        }
      ],
      max_tokens: 200,
      temperature: 0.4,
    });

    const diagnosis = chat.choices[0]?.message?.content ?? "진단 결과를 가져올 수 없습니다.";

    return NextResponse.json({ diagnosis, updatedAt: new Date().toISOString() });
  } catch (e: any) {
    return NextResponse.json({ diagnosis: "AI 진단 오류: " + e.message }, { status: 500 });
  }
}
