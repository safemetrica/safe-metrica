import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getCompanyConfig } from "@/lib/company";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const company = await getCompanyConfig();

    const headers = {
      Authorization: `Bearer ${company.notionApiKey}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    };

    const [tbmRes, ptwRes] = await Promise.all([
      fetch(`https://api.notion.com/v1/databases/${company.tbmDbId}/query`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          page_size: 5,
          sorts: [{ property: "날짜", direction: "descending" }],
        }),
        cache: "no-store",
      }),
      fetch(`https://api.notion.com/v1/databases/${company.ptwDbId}/query`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          page_size: 10,
          sorts: [{ property: "작업일", direction: "descending" }],
        }),
        cache: "no-store",
      }),
    ]);

    const [tbmData, ptwData] = await Promise.all([tbmRes.json(), ptwRes.json()]);

    const tbmRows = (tbmData.results ?? []).map((p: any) => ({
      작업명: p.properties["작업명"]?.title?.[0]?.plain_text ?? "",
      날짜: p.properties["날짜"]?.date?.start ?? "",
      특이사항: p.properties["특이사항"]?.checkbox ?? false,
      조치상태: p.properties["조치 상태"]?.select?.name ?? "",
      연결EB: p.properties["연결 EB"]?.relation?.length ?? 0,
      작업태그: p.properties["작업 태그"]?.multi_select?.map((t: any) => t.name) ?? [],
    }));

    const ptwRows = (ptwData.results ?? []).map((p: any) => ({
      제목:
        p.properties["허가서 제목/번호 (예W-대도-20260324-고소-001)"]?.title?.[0]
          ?.plain_text ?? "",
      작업유형: p.properties["작업유형"]?.select?.name ?? "",
      승인상태: p.properties["승인상태"]?.select?.name ?? "",
      허용여부: p.properties["작업 허용 여부"]?.select?.name ?? "",
    }));

    // =========================
    // PTW 룰 엔진(코드 판정)
    // =========================
    const PTW_TRIGGER_TAGS = new Set([
      "고소작업",
      "밀폐공간",
      "용접/용단",
      "전기",
      "양중/중량물",
    ]);

    const ptwCandidateTbms = tbmRows.filter((r: any) =>
      (r.작업태그 ?? []).some((t: string) => PTW_TRIGGER_TAGS.has(t))
    );

    const ptwRequired = ptwCandidateTbms.length > 0;

    // PTW DB 승인상태 옵션: 요청/승인/반려/완료
    const ptwApproved = ptwRows.some((p: any) => ["승인", "완료"].includes(p.승인상태));

    const ptwMissingOrNotApproved = ptwRequired && (!ptwRows.length || !ptwApproved);

    // =========================
    // 요약 문자열
    // =========================
    const tbmSummary = tbmRows
      .map(
        (r: any, i: number) =>
          `[TBM${i + 1}] ${r.날짜} / ${r.작업명} / 태그: ${r.작업태그.join(", ") || "없음"} / 특이사항: ${
            r.특이사항 ? "있음" : "없음"
          } / EB연결: ${r.연결EB}건 / 조치상태: ${r.조치상태 || "없음"}`
      )
      .join("\n");

    const ptwSummary =
      ptwRows.length > 0
        ? ptwRows
            .map((r: any) => `[PTW] ${r.제목} / ${r.작업유형} / 승인: ${r.승인상태} / 허용: ${r.허용여부}`)
            .join("\n")
        : "[PTW] 없음";

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const chat = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `당신은 생활폐기물·환경미화 현장의 산업안전 전문 AI입니다. TBM·PTW 데이터를 분석해 대표에게 오늘의 핵심 안전 진단을 제공합니다.
분석 우선순위:
1. 🚨 중대재해 위험: 밀폐공간/고소/화기 태그 + PTW 미제출 → 즉시 경고
2. 🔴 PTW 필요 여부: 고소·밀폐·화기·전기 태그 있는데 PTW 없거나 미승인 → 법적 의무 경고
3. 🟡 EB 누락: 특이사항 있음 + EB 미연결 → 등록 촉구
4. 🟢 정상: 문제 없으면 간단히 칭찬 + 주의사항 1개
출력 규칙: 3줄 이내, 자연스러운 문장, 불릿 없이, 이모지 1~2개 사용`,
        },
        {
          role: "user",
          content: `최근 TBM:\n${tbmSummary}\n\nPTW 현황:\n${ptwSummary}\n\n오늘 현장 안전 진단 부탁합니다.`,
        },
      ],
      max_tokens: 250,
      temperature: 0.4,
    });

    const aiText = chat.choices[0]?.message?.content ?? "진단 결과를 가져올 수 없습니다.";

    // GPT와 무관하게 “PTW 먼저” 경고를 고정으로 붙임
    const ptwPrefix = ptwMissingOrNotApproved
      ? "🚨 PTW(작업허가) 대상 작업이 있습니다. 작업 시작 전 PTW 작성/승인부터 진행하세요.\n"
      : "";

    const diagnosis = ptwPrefix + aiText;

    return NextResponse.json({ diagnosis, updatedAt: new Date().toISOString() });
  } catch (e: any) {
    return NextResponse.json({ diagnosis: "AI 진단 오류: " + e.message }, { status: 500 });
  }
}