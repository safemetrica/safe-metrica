export type RiskApprovalReadback = {
  approvalStatus: string;
  approvalReviewer: string;
  approvalApprovedAt: string;
  approvalMemo: string;
  riskDbReflectionStatus: string;
  postActionReflection: string;
  actionReflectionType: string;
  actionReflectionDate: string;
  actionReflectionEvidence: string;
};

export function normalizeNotionId(id?: string | null): string {
  return String(id ?? "").replace(/-/g, "").trim();
}

export function readNotionPlainText(prop: any): string {
  if (!prop) return "";

  if (prop.type === "select") return prop.select?.name ?? "";
  if (prop.type === "status") return prop.status?.name ?? "";

  if (prop.type === "rich_text") {
    return prop.rich_text?.map((t: any) => t.plain_text ?? "").join("").trim() ?? "";
  }

  if (prop.type === "title") {
    return prop.title?.map((t: any) => t.plain_text ?? "").join("").trim() ?? "";
  }

  if (prop.type === "date") return prop.date?.start ?? "";

  if (typeof prop === "string") return prop;

  return "";
}

export function readRiskApprovalReadbackFromPage(page: any): RiskApprovalReadback {
  const props = page?.properties ?? {};

  return {
    approvalStatus: readNotionPlainText(props["반영 승인상태"]),
    approvalReviewer: readNotionPlainText(props["반영 승인자"]),
    approvalApprovedAt: readNotionPlainText(props["반영 승인일"]),
    approvalMemo: readNotionPlainText(props["반영 승인 메모"]),
    riskDbReflectionStatus: readNotionPlainText(props["Risk DB 반영상태"]),
    postActionReflection: readNotionPlainText(props["조치 후 반영내용"]),
    actionReflectionType: readNotionPlainText(props["조치 반영유형"]),
    actionReflectionDate: readNotionPlainText(props["조치 반영일"]),
    actionReflectionEvidence: readNotionPlainText(props["조치 반영 근거"]),
  };
}

export function mergeRiskApprovalReadback<T extends Record<string, any>>(
  base: T,
  readback?: Partial<RiskApprovalReadback> | null
): T & RiskApprovalReadback {
  const approvalStatus =
    readback?.approvalStatus ||
    base.approvalStatus ||
    "승인 대기";

  const riskDbReflectionStatus =
    readback?.riskDbReflectionStatus ||
    base.riskDbReflectionStatus ||
    "미반영";

  return {
    ...base,
    approvalStatus,
    approvalReviewer: readback?.approvalReviewer || base.approvalReviewer || "",
    approvalApprovedAt: readback?.approvalApprovedAt || base.approvalApprovedAt || "",
    approvalMemo: readback?.approvalMemo || base.approvalMemo || "",
    riskDbReflectionStatus,
    postActionReflection: readback?.postActionReflection || base.postActionReflection || "",
    actionReflectionType: readback?.actionReflectionType || base.actionReflectionType || "",
    actionReflectionDate: readback?.actionReflectionDate || base.actionReflectionDate || "",
    actionReflectionEvidence: readback?.actionReflectionEvidence || base.actionReflectionEvidence || "",
  };
}

export function isRiskApprovalCompleted(status?: string | null): boolean {
  return String(status ?? "").trim() === "승인 완료";
}

export function isRiskDbReflected(status?: string | null): boolean {
  return String(status ?? "").trim() === "반영 완료";
}

export function getRiskDbReflectionLabel(status?: string | null): string {
  return isRiskDbReflected(status) ? "Risk DB 반영 완료" : "Risk DB 미반영";
}

export function canShowRiskApprovalButton(args: {
  isTbmShared: boolean;
  connectedTbmCount: number;
  isImprovementCompletionCandidate: boolean;
  approvalStatus?: string | null;
}): boolean {
  const approvalStatus = String(args.approvalStatus ?? "").trim();

  return (
    args.isTbmShared &&
    args.connectedTbmCount > 0 &&
    args.isImprovementCompletionCandidate &&
    approvalStatus !== "승인 완료" &&
    approvalStatus !== "반려" &&
    approvalStatus !== "보완 요청"
  );
}
