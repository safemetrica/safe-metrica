// src/lib/riskStatusApprovalFlow.ts

import type { CompletionLevel } from "./riskCompletionRules";

export type RiskApprovalActorRole =
  | "fieldSupervisor"
  | "safetyHealthManager"
  | "safetyManager"
  | "executive"
  | "admin"
  | "other"
  | "";

export type RiskApprovalDecision =
  | "approve"
  | "reject"
  | "requestMoreEvidence"
  | "hold";

export type RiskApprovalStatus =
  | "notEligible"
  | "approvalReady"
  | "approved"
  | "rejected"
  | "moreEvidenceRequired"
  | "onHold";

export type ProposedRiskDbStatus =
  | "미착수"
  | "진행중"
  | "완료"
  | "확인필요";

export interface RiskApprovalInput {
  riskItemId?: string;
  currentRiskDbStatus?: string;
  completionLevel: CompletionLevel;
  isCompletionCandidate: boolean;
  matchedRuleId?: string;
  missingEvidence?: string[];
  actorName?: string;
  actorRole?: RiskApprovalActorRole | string;
  decision?: RiskApprovalDecision;
  memo?: string;
  approvedAt?: string;
}

export interface RiskDbUpdatePayload {
  riskItemId?: string;
  status: ProposedRiskDbStatus;
  completedDate?: string;
  approvalMemo?: string;
  approvedBy?: string;
  approvedByRole?: string;
  source: "riskStatusApprovalFlow";
}

export interface RiskStatusApprovalResult {
  approvalStatus: RiskApprovalStatus;
  canApprove: boolean;
  canCreateRiskDbUpdatePayload: boolean;
  proposedRiskDbStatus: ProposedRiskDbStatus | null;
  riskDbUpdatePayload: RiskDbUpdatePayload | null;
  reason: string;
  fieldMessage: string;
  managerMessage: string;
  executiveMessage: string;
  integrityNote: string;
}

function normalize(value?: string | null): string {
  return String(value ?? "").replace(/\s+/g, "").toLowerCase();
}

function isAllowedApprovalRole(role?: string): boolean {
  const normalized = normalize(role);

  return [
    "safetyhealthmanager",
    "safetymanager",
    "executive",
    "admin",
    "안전보건관리담당자",
    "안전관리자",
    "보건관리자",
    "대표이사",
    "관리자",
  ].some((allowedRole) => normalized.includes(normalize(allowedRole)));
}

function isAlreadyCompleted(status?: string): boolean {
  return normalize(status).includes("완료");
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildApprovedPayload(input: RiskApprovalInput): RiskDbUpdatePayload {
  return {
    riskItemId: input.riskItemId,
    status: "완료",
    completedDate: input.approvedAt ?? todayIsoDate(),
    approvalMemo: input.memo,
    approvedBy: input.actorName,
    approvedByRole: input.actorRole,
    source: "riskStatusApprovalFlow",
  };
}

export function evaluateRiskStatusApproval(
  input: RiskApprovalInput
): RiskStatusApprovalResult {
  const missingEvidence = input.missingEvidence ?? [];
  const allowedRole = isAllowedApprovalRole(input.actorRole);
  const alreadyCompleted = isAlreadyCompleted(input.currentRiskDbStatus);

  if (alreadyCompleted) {
    return {
      approvalStatus: "notEligible",
      canApprove: false,
      canCreateRiskDbUpdatePayload: false,
      proposedRiskDbStatus: null,
      riskDbUpdatePayload: null,
      reason: "이미 Risk DB 상태가 완료로 표시되어 있습니다.",
      fieldMessage: "이미 완료 처리된 항목입니다.",
      managerMessage: "중복 승인하지 않습니다. 기존 완료 기록을 확인하세요.",
      executiveMessage: "이미 완료 처리된 위험항목입니다.",
      integrityNote:
        "완료 후보와 승인 완료는 분리하며, 중복 완료 처리는 하지 않습니다.",
    };
  }

  if (!input.isCompletionCandidate || input.completionLevel !== "completionCandidate") {
    return {
      approvalStatus: "notEligible",
      canApprove: false,
      canCreateRiskDbUpdatePayload: false,
      proposedRiskDbStatus: null,
      riskDbUpdatePayload: null,
      reason: "위험요인별 완료조건을 충족한 완료 후보가 아닙니다.",
      fieldMessage: "아직 완료 승인 대상이 아닙니다.",
      managerMessage:
        "조치사진, 작업대상사진, 조치상태, 위험요인별 완료조건을 먼저 확인하세요.",
      executiveMessage: "완료 승인 전 추가 확인이 필요한 항목입니다.",
      integrityNote:
        "증빙이 있더라도 완료조건을 충족하지 않으면 Risk DB 완료로 반영하지 않습니다.",
    };
  }

  if (missingEvidence.length > 0) {
    return {
      approvalStatus: "moreEvidenceRequired",
      canApprove: false,
      canCreateRiskDbUpdatePayload: false,
      proposedRiskDbStatus: "확인필요",
      riskDbUpdatePayload: null,
      reason: "완료 후보이나 일부 증빙 보완 항목이 남아 있습니다.",
      fieldMessage: "증빙 보완 후 다시 확인해 주세요.",
      managerMessage: `보완 필요 증빙: ${missingEvidence.join(", ")}`,
      executiveMessage: "증빙 보완 후 승인 검토가 필요한 항목입니다.",
      integrityNote:
        "완료 후보 단계에서도 누락 증빙이 있으면 Risk DB 완료 반영을 보류합니다.",
    };
  }

  if (!allowedRole) {
    return {
      approvalStatus: "approvalReady",
      canApprove: false,
      canCreateRiskDbUpdatePayload: false,
      proposedRiskDbStatus: "완료",
      riskDbUpdatePayload: null,
      reason: "완료 후보이나 승인 권한 역할 확인이 필요합니다.",
      fieldMessage: "관리자 확인 대기 상태입니다.",
      managerMessage:
        "안전보건관리담당자, 안전관리자, 대표이사 또는 관리자 권한으로 승인해야 합니다.",
      executiveMessage: "승인 권한 확인 후 완료 반영이 가능합니다.",
      integrityNote:
        "현장 공유 또는 조치 등록자가 곧바로 Risk DB 완료를 확정하지 않습니다.",
    };
  }

  if (input.decision === "reject") {
    return {
      approvalStatus: "rejected",
      canApprove: false,
      canCreateRiskDbUpdatePayload: false,
      proposedRiskDbStatus: "진행중",
      riskDbUpdatePayload: null,
      reason: "관리자가 완료 반영을 반려했습니다.",
      fieldMessage: "관리자 반려로 추가 조치가 필요합니다.",
      managerMessage: "반려 사유를 확인하고 조치 또는 증빙을 보완하세요.",
      executiveMessage: "완료 반영이 반려된 항목입니다.",
      integrityNote:
        "반려된 완료 후보는 Risk DB 완료로 반영하지 않습니다.",
    };
  }

  if (input.decision === "requestMoreEvidence") {
    return {
      approvalStatus: "moreEvidenceRequired",
      canApprove: false,
      canCreateRiskDbUpdatePayload: false,
      proposedRiskDbStatus: "확인필요",
      riskDbUpdatePayload: null,
      reason: "관리자가 추가 증빙을 요청했습니다.",
      fieldMessage: "추가 증빙을 등록해 주세요.",
      managerMessage: "추가 증빙 등록 후 다시 검토하세요.",
      executiveMessage: "추가 증빙 요청 상태입니다.",
      integrityNote:
        "추가 증빙 요청 상태에서는 Risk DB 완료로 반영하지 않습니다.",
    };
  }

  if (input.decision === "hold" || !input.decision) {
    return {
      approvalStatus: "approvalReady",
      canApprove: true,
      canCreateRiskDbUpdatePayload: false,
      proposedRiskDbStatus: "완료",
      riskDbUpdatePayload: null,
      reason: "완료 후보이며 승인 가능한 상태입니다.",
      fieldMessage: "관리자 승인 대기 상태입니다.",
      managerMessage: "승인 시 Risk DB 상태를 완료로 반영할 수 있습니다.",
      executiveMessage: "승인 대기 중인 완료 후보 항목입니다.",
      integrityNote:
        "승인 전까지 Risk DB 상태는 변경하지 않습니다.",
    };
  }

  return {
    approvalStatus: "approved",
    canApprove: true,
    canCreateRiskDbUpdatePayload: true,
    proposedRiskDbStatus: "완료",
    riskDbUpdatePayload: buildApprovedPayload(input),
    reason: "관리자 승인으로 Risk DB 완료 반영 payload를 생성했습니다.",
    fieldMessage: "관리자 승인 완료 상태입니다.",
    managerMessage:
      "승인 payload가 생성되었습니다. 실제 Notion DB write는 별도 저장 단계에서 수행합니다.",
    executiveMessage: "개선대책 완료 승인 항목입니다.",
    integrityNote:
      "이 함수는 반영 payload만 생성하며, Notion DB를 직접 변경하지 않습니다.",
  };
}
