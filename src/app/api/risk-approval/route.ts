// src/app/api/risk-approval/route.ts

import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";
import { getCompanyConfig } from "@/lib/company";

type RiskApprovalRequestBody = {
  riskItemId?: string;
  decision?: "approve" | "reject" | "requestMoreEvidence";
  memo?: string;
  postActionReflectionCandidate?: {
    hasCandidate?: boolean;
    content?: string;
    types?: string[];
    date?: string;
    evidence?: string;
  };
};

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function toMultiSelectOptions(values?: string[]) {
  return (values ?? [])
    .filter(Boolean)
    .map((name) => ({
      name,
    }));
}

function getDecisionFields(decision: RiskApprovalRequestBody["decision"]) {
  if (decision === "reject") {
    return {
      approvalStatus: "반려",
      reflectionStatus: "미반영",
      defaultMemo: "SafeMetrica 관리자 반려",
    };
  }

  if (decision === "requestMoreEvidence") {
    return {
      approvalStatus: "보완 요청",
      reflectionStatus: "미반영",
      defaultMemo: "SafeMetrica 관리자 보완 요청",
    };
  }

  return {
    approvalStatus: "승인 완료",
    reflectionStatus: "반영 완료",
    defaultMemo: "SafeMetrica 관리자 승인",
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RiskApprovalRequestBody;

    if (!body.riskItemId) {
      return NextResponse.json(
        {
          ok: false,
          message: "riskItemId is required.",
        },
        { status: 400 }
      );
    }

    const company = await getCompanyConfig();

    if (!company.notionApiKey) {
      return NextResponse.json(
        {
          ok: false,
          message: "Notion API key is missing.",
        },
        { status: 500 }
      );
    }

    const decision = body.decision ?? "approve";
    const fields = getDecisionFields(decision);
    const notion = new Client({ auth: company.notionApiKey });

    const properties: Record<string, any> = {
      "반영 승인상태": {
        select: {
          name: fields.approvalStatus,
        },
      },
      "반영 승인일": {
        date: {
          start: todayIsoDate(),
        },
      },
      "반영 승인 메모": {
        rich_text: [
          {
            type: "text",
            text: {
              content: body.memo?.trim() || fields.defaultMemo,
            },
          },
        ],
      },
      "Risk DB 반영상태": {
        select: {
          name: fields.reflectionStatus,
        },
      },
    };

    const candidate = body.postActionReflectionCandidate;

    if (decision === "approve" && candidate?.hasCandidate && candidate.content) {
      properties["조치 후 반영내용"] = {
        rich_text: [
          {
            type: "text",
            text: {
              content: candidate.content,
            },
          },
        ],
      };

      properties["조치 반영유형"] = {
        multi_select: toMultiSelectOptions(candidate.types),
      };

      if (candidate.date) {
        properties["조치 반영일"] = {
          date: {
            start: candidate.date,
          },
        };
      }

      if (candidate.evidence) {
        properties["조치 반영 근거"] = {
          rich_text: [
            {
              type: "text",
              text: {
                content: candidate.evidence,
              },
            },
          ],
        };
      }
    }

    await notion.pages.update({
      page_id: body.riskItemId,
      properties,
    });

    return NextResponse.json({
      ok: true,
      riskItemId: body.riskItemId,
      decision,
      approvalStatus: fields.approvalStatus,
      reflectionStatus: fields.reflectionStatus,
    });
  } catch (error) {
    console.error("[SafeMetrica] Risk approval API failed", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Risk approval update failed.",
      },
      { status: 500 }
    );
  }
}
