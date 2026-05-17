// src/app/api/risk-approval/route.ts

import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";
import { getCompanyConfig } from "@/lib/company";

type Decision = "approve" | "reject" | "requestMoreEvidence";

type RiskApprovalRequestBody = {
  riskItemId?: string;
  decision?: Decision;
  memo?: string;
  postActionReflectionCandidate?: {
    hasCandidate?: boolean;
    content?: string;
    types?: string[];
    date?: string;
    evidence?: string;
  };
};

type NotionPropertyLike = {
  id?: string;
  type?: string;
  [key: string]: any;
};

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function getDecisionFields(decision: Decision) {
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

function toRichText(content: string) {
  return {
    rich_text: [
      {
        type: "text",
        text: {
          content,
        },
      },
    ],
  };
}

function toMultiSelectOptions(values?: string[]) {
  return (values ?? [])
    .filter(Boolean)
    .map((name) => ({
      name,
    }));
}

function buildMemoWithCandidate(
  baseMemo: string,
  candidate?: RiskApprovalRequestBody["postActionReflectionCandidate"]
): string {
  if (!candidate?.hasCandidate) return baseMemo;

  const lines = [
    baseMemo,
    "",
    "[AI 반영 후보]",
    candidate.content ? `조치 후 반영내용: ${candidate.content}` : "",
    candidate.types?.length ? `조치 반영유형: ${candidate.types.join(", ")}` : "",
    candidate.date ? `조치 반영일: ${candidate.date}` : "",
    candidate.evidence ? `조치 반영 근거: ${candidate.evidence}` : "",
  ].filter(Boolean);

  return lines.join("\n");
}

function setSelectOrStatus(
  properties: Record<string, any>,
  pageProperties: Record<string, NotionPropertyLike>,
  fieldName: string,
  value: string
) {
  const field = pageProperties[fieldName];
  if (!field) return;

  if (field.type === "status") {
    properties[fieldName] = {
      status: {
        name: value,
      },
    };
    return;
  }

  if (field.type === "select") {
    properties[fieldName] = {
      select: {
        name: value,
      },
    };
  }
}

function setRichTextIfPossible(
  properties: Record<string, any>,
  pageProperties: Record<string, NotionPropertyLike>,
  fieldName: string,
  value?: string
) {
  if (!value) return;

  const field = pageProperties[fieldName];
  if (!field) return;

  if (field.type === "rich_text") {
    properties[fieldName] = toRichText(value);
  }
}

function setDateIfPossible(
  properties: Record<string, any>,
  pageProperties: Record<string, NotionPropertyLike>,
  fieldName: string,
  value?: string
) {
  if (!value) return;

  const field = pageProperties[fieldName];
  if (!field) return;

  if (field.type === "date") {
    properties[fieldName] = {
      date: {
        start: value,
      },
    };
  }
}

function setReflectionTypeIfPossible(
  properties: Record<string, any>,
  pageProperties: Record<string, NotionPropertyLike>,
  fieldName: string,
  values?: string[]
) {
  const field = pageProperties[fieldName];
  const cleanValues = values?.filter(Boolean) ?? [];

  if (!field || cleanValues.length === 0) return;

  if (field.type === "multi_select") {
    properties[fieldName] = {
      multi_select: toMultiSelectOptions(cleanValues),
    };
    return;
  }

  if (field.type === "rich_text") {
    properties[fieldName] = toRichText(cleanValues.join(", "));
  }
}

function getNotionErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return String((error as { message: string }).message);
  }

  return "Risk approval update failed.";
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
    const decisionFields = getDecisionFields(decision);
    const notion = new Client({ auth: company.notionApiKey });

    const page = await notion.pages.retrieve({
      page_id: body.riskItemId,
    });

    const pageProperties = ("properties" in page ? page.properties : {}) as Record<
      string,
      NotionPropertyLike
    >;

    const properties: Record<string, any> = {};

    setSelectOrStatus(
      properties,
      pageProperties,
      "반영 승인상태",
      decisionFields.approvalStatus
    );

    setDateIfPossible(
      properties,
      pageProperties,
      "반영 승인일",
      todayIsoDate()
    );

    const memoContent = buildMemoWithCandidate(
      body.memo?.trim() || decisionFields.defaultMemo,
      decision === "approve" ? body.postActionReflectionCandidate : undefined
    );

    setRichTextIfPossible(
      properties,
      pageProperties,
      "반영 승인 메모",
      memoContent
    );

    setSelectOrStatus(
      properties,
      pageProperties,
      "Risk DB 반영상태",
      decisionFields.reflectionStatus
    );

    const candidate = body.postActionReflectionCandidate;

    if (decision === "approve" && candidate?.hasCandidate && candidate.content) {
      setRichTextIfPossible(
        properties,
        pageProperties,
        "조치 후 반영내용",
        candidate.content
      );

      setReflectionTypeIfPossible(
        properties,
        pageProperties,
        "조치 반영유형",
        candidate.types
      );

      setDateIfPossible(
        properties,
        pageProperties,
        "조치 반영일",
        candidate.date
      );

      setRichTextIfPossible(
        properties,
        pageProperties,
        "조치 반영 근거",
        candidate.evidence
      );
    }

    const updatedFieldNames = Object.keys(properties);
    const hasRequiredApprovalStatus = updatedFieldNames.includes("반영 승인상태");
    const hasRequiredReflectionStatus = updatedFieldNames.includes("Risk DB 반영상태");

    if (!hasRequiredApprovalStatus || !hasRequiredReflectionStatus) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "승인 필수 필드를 업데이트할 수 없습니다. Risk Items DB의 반영 승인상태 / Risk DB 반영상태 필드명과 타입을 확인하세요.",
          requiredFields: {
            "반영 승인상태": hasRequiredApprovalStatus ? "ready" : "missing-or-type-mismatch",
            "Risk DB 반영상태": hasRequiredReflectionStatus ? "ready" : "missing-or-type-mismatch",
          },
          availableFields: Object.fromEntries(
            Object.entries(pageProperties).map(([name, property]) => [
              name,
              property.type,
            ])
          ),
          preparedFields: updatedFieldNames,
        },
        { status: 400 }
      );
    }

    if (Object.keys(properties).length === 0) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "업데이트 가능한 승인 필드를 찾지 못했습니다. Risk Items DB 필드명과 타입을 확인하세요.",
          availableFields: Object.fromEntries(
            Object.entries(pageProperties).map(([name, property]) => [
              name,
              property.type,
            ])
          ),
        },
        { status: 400 }
      );
    }

    await notion.pages.update({
      page_id: body.riskItemId,
      properties,
    });

    return NextResponse.json({
      ok: true,
      riskItemId: body.riskItemId,
      decision,
      approvalStatus: decisionFields.approvalStatus,
      reflectionStatus: decisionFields.reflectionStatus,
      updatedFields: updatedFieldNames,
      skippedPostActionFields: [
        "조치 후 반영내용",
        "조치 반영유형",
        "조치 반영일",
        "조치 반영 근거",
      ].filter((fieldName) => !Object.keys(properties).includes(fieldName)),
    });
  } catch (error) {
    const message = getNotionErrorMessage(error);

    console.error("[SafeMetrica] Risk approval API failed", error);

    return NextResponse.json(
      {
        ok: false,
        message,
      },
      { status: 500 }
    );
  }
}
