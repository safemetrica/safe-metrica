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
        p.properties["허가서 제목/번호 (예W-대도-20260324-고소-001)"]?.title?.[0]?.plain_text ??
        "",
      작업유형: p.properties["작업유형"]?.select?.name ?? "",
      승인상태: p.properties["승인상태"]?.select?.name ?? "",
      허용여부: p.properties["작업 허용 여부"]?.select?.name ?? "",
    }));

    // =========================
    // PTW 룰 엔진(코드 판정) - GPT 개입 금지
    // =========================
    const PTW_TRIGGER_TAGS = new Set(["고소작업", "밀폐공간", "용접/용단", "전기", "양중/중량물"]);

    const ptwCandidateTbms = tbmRows.filter((r: any) =>
      (r.작업태그 ?? []).some((t: string) => PTW_TRIGGER_TAGS.has(t))
    );

    const ptwRequired = ptwCandidateTbms.length > 0;

    // PTW DB 승인상태 옵션: 요청/승인/반려/완료
    const ptwApproved = ptwRows.some((p: any) => ["승인", "완료"].includes(p.승인상태));

    const ptwMissingOrNotApproved = ptwRequired && (!ptwRows.length || !ptwApproved);

    const ptwCandidateTags = Array.from(
      new Set(
        ptwCandidateTbms.flatMap((r: any) =>
          (r.작업태그 ?? []).filter((t: string) => PTW_TRIGGER_TAGS.has(t))
        )
      )
    );

    // =========================
    // EB 룰 엔진(코드 판정) - 통일 v1
    // EB 누락 = (특이사항 OR 조치 필요) AND (연결 EB 비어있음)
    // =========================
    const ebCandidateTbms = tbmRows.filter((r: any) => {
      const hasException = !!r.특이사항 || r.조치상태 === "조치 필요";
      const ebEmpty = (r.연결EB ?? 0) === 0;
      return hasException && ebEmpty;
    });

    const ebMissing = ebCandidateTbms.length > 0;

    const ebMissingTargets = ebCandidateTbms.slice(0, 2).map((r: any) => ({
      날짜: r.날짜,
      작업명: r.작업명,
      조치상태: r.조치상태 || "",
    }));

    // =========================
    // TBM 요약 문자열(GPT 입력)
    // =========================
    const tbmSummary = tbmRows
      .map(
        (r: any, i: number) =>
          `[TBM${i + 1}] ${r.날짜} / ${r.작업명} / 태그: ${
            r.작업태그.join(", ") || "없음"
          } / 특이사항: ${r.특이사항 ? "있음" : "없음"} / EB연결: ${r.연결EB}건 / 조치상태: ${
            r.조치상태 || "없음"
          }`
      )
      .join("\n");

    // =========================
    // GPT: PTW/EB 판정 금지(설명만)
    // =========================
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const chat = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `당신은 생활폐기물·환경미화 현장의 산업안전 전문 AI입니다.

중요(LOCK):
- PTW(작업허가) 필요/미제출/미승인 여부는 시스템(룰 엔진)에서만 판정합니다. PTW를 언급하거나 추정/판정하지 마세요.
- EB 누락(증빙 누락) 여부도 시스템(룰 엔진)에서만 판정합니다. EB 누락을 추정/단정하지 마세요.

당신의 역할:
- 아래에 제공되는 룰 판정값과 TBM 요약을 바탕으로, 대표에게 2~3문장으로 '오늘 해야 할 행동'을 안내합니다.
- 문장은 짧게, 실행 중심(예: 점검/연결/확인/주의).
출력 규칙: 3줄 이내, 자연스러운 문장, 불릿 없이, 이모지 1~2개 사용`,
        },
        {
          role: "user",
          content: `최근 TBM:\n${tbmSummary}

룰 판정:
- ptwMissingOrNotApproved: ${ptwMissingOrNotApproved}
- ebMissing: ${ebMissing}
- ebMissingTargets: ${JSON.stringify(ebMissingTargets)}

요약 진단 작성해줘. (PTW/EB는 위 룰 값이 true일 때만 '조치 필요'로 언급하고, false면 단정하지 마)`,
        },
      ],
      max_tokens: 250,
      temperature: 0.4,
    });

    const aiText = chat.choices[0]?.message?.content ?? "진단 결과를 가져올 수 없습니다.";

    // =========================
    // 최종 진단: PTW/EB는 룰 고정 prefix
    // =========================
    const ptwPrefix = ptwMissingOrNotApproved
      ? `🚨 [필수] PTW(작업허가) 대상 작업이 감지되었습니다(${ptwCandidateTags.join(
          ", "
        )}). 작업 시작 전 PTW 작성 및 승인/완료 처리 후 진행하세요.\n`
      : "";

    const ebPrefix = ebMissing
      ? `🟥 [필수] EB(증빙) 연결 누락이 있습니다. 관리자(QR-2)에서 해당 TBM에 증빙을 연결하세요.\n`
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

      updatedAt: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json({ diagnosis: "AI 진단 오류: " + e.message }, { status: 500 });
  }
}