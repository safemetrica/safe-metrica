export type EducationCategory =
  | "법정교육"
  | "TBM"
  | "위험성평가 공유"
  | "특별안전교육"
  | "신규채용교육"
  | "관리감독자교육"
  | "기타";

export type EducationProviderType =
  | "교육기관"
  | "자체교육"
  | "외부기관"
  | "혼합";

export type EducationEvidenceStatus =
  | "확인"
  | "보완 필요"
  | "미등록"
  | "해당 없음";

export type EducationFollowUpReason =
  | "수료증 누락"
  | "출석부 누락"
  | "참석자 누락"
  | "서명 누락"
  | "사진 누락"
  | "위험성평가 공유 기록 누락"
  | "TBM 연결 누락"
  | "Evidence Book 연결 누락"
  | "확인 필요";

export type EducationEvidenceRecord = {
  id: string;
  customerCode: string;
  partnerCode?: string;
  partnerBranchCode?: string;

  educationTitle: string;
  educationCategory: EducationCategory;
  educationDate: string;
  providerType: EducationProviderType;
  providerName?: string;

  targetGroup: string;
  participantCount?: number;
  participantNames?: string[];

  certificateStatus: EducationEvidenceStatus;
  attendanceEvidenceStatus: EducationEvidenceStatus;
  signatureEvidenceStatus: EducationEvidenceStatus;
  photoEvidenceStatus: EducationEvidenceStatus;

  linkedRiskAssessmentId?: string;
  linkedTbmId?: string;
  linkedEvidenceBookId?: string;

  needsFollowUp: boolean;
  followUpReasons: EducationFollowUpReason[];

  note?: string;
};

export const EDUCATION_EVIDENCE_CATEGORIES: EducationCategory[] = [
  "법정교육",
  "TBM",
  "위험성평가 공유",
  "특별안전교육",
  "신규채용교육",
  "관리감독자교육",
  "기타",
];

export const EDUCATION_EVIDENCE_STATUSES: EducationEvidenceStatus[] = [
  "확인",
  "보완 필요",
  "미등록",
  "해당 없음",
];

export function summarizeEducationEvidenceStatus(record: EducationEvidenceRecord) {
  const evidenceStatuses = [
    record.certificateStatus,
    record.attendanceEvidenceStatus,
    record.signatureEvidenceStatus,
    record.photoEvidenceStatus,
  ];

  if (record.needsFollowUp || evidenceStatuses.includes("보완 필요") || evidenceStatuses.includes("미등록")) {
    return {
      status: "보완 필요" as const,
      message: "교육·참여 증빙 중 보완이 필요한 항목이 있습니다.",
      reasons: record.followUpReasons,
    };
  }

  return {
    status: "확인" as const,
    message: "교육·참여 증빙이 기본 요건에 맞게 등록되었습니다.",
    reasons: [],
  };
}

export const SAMPLE_EDUCATION_EVIDENCE_RECORDS: EducationEvidenceRecord[] = [
  {
    id: "edu-sample-001",
    customerCode: "sample",
    partnerCode: "gaonedu",
    partnerBranchCode: "sample-branch",
    educationTitle: "6월 위험성평가 결과 공유 교육",
    educationCategory: "위험성평가 공유",
    educationDate: "2026-06-01",
    providerType: "자체교육",
    providerName: "사업장 자체",
    targetGroup: "현장근로자",
    participantCount: 12,
    participantNames: [],
    certificateStatus: "해당 없음",
    attendanceEvidenceStatus: "확인",
    signatureEvidenceStatus: "보완 필요",
    photoEvidenceStatus: "확인",
    linkedRiskAssessmentId: "risk-sample-001",
    linkedTbmId: "tbm-sample-001",
    linkedEvidenceBookId: "eb-sample-001",
    needsFollowUp: true,
    followUpReasons: ["서명 누락"],
    note: "위험성평가 결과 공유는 확인되나 일부 참석자 서명 보완이 필요합니다.",
  },
  {
    id: "edu-sample-002",
    customerCode: "sample",
    partnerCode: "gaonedu",
    partnerBranchCode: "sample-branch",
    educationTitle: "정기 안전보건교육",
    educationCategory: "법정교육",
    educationDate: "2026-06-10",
    providerType: "교육기관",
    providerName: "가온에듀",
    targetGroup: "전체 근로자",
    participantCount: 20,
    participantNames: [],
    certificateStatus: "확인",
    attendanceEvidenceStatus: "확인",
    signatureEvidenceStatus: "확인",
    photoEvidenceStatus: "확인",
    needsFollowUp: false,
    followUpReasons: [],
    note: "교육기관 수료증과 출석 증빙이 등록된 상태입니다.",
  },
];
