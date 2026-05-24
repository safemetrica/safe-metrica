export type CompanyContractRole =
  | "원청"
  | "협력사"
  | "협력사";

export type ContractorRelationStatus =
  | "계약예정"
  | "세팅중"
  | "운영중"
  | "보완필요"
  | "보류";

export type ContractorSafetyStatus =
  | "확인"
  | "대기"
  | "보완 필요"
  | "해당 없음";

export type PrincipalCompany = {
  code: string;
  name: string;
  role: "원청";
  description: string;
};

export type ContractorCompany = {
  code: string;
  name: string;
  role: "협력사" | "협력사";
  description: string;
};


export type ContractorSubmissionItemType =
  | "TBM"
  | "작업 전후 사진"
  | "교육·서명·출석"
  | "위험성평가 공유 확인"
  | "조치 전후 사진";

export type ContractorSubmissionStatus =
  | "미제출"
  | "제출대기"
  | "제출완료"
  | "보완제출";

export type PrincipalReviewStatus =
  | "미검토"
  | "검토중"
  | "확인"
  | "보완요청"
  | "해당 없음";

export type ContractorSubmissionItem = {
  id: string;
  relationId: string;

  tenantCode: string;
  principalCode: string;
  principalName: string;
  contractorCode: string;
  contractorName: string;

  itemType: ContractorSubmissionItemType;
  title: string;
  description: string;

  requiredEvidence: string[];

  contractorSubmissionStatus: ContractorSubmissionStatus;
  principalReviewStatus: PrincipalReviewStatus;

  evidenceBookRequired: boolean;
  monthlyReportIncluded: boolean;
  restrictedLinkOnly: boolean;

  nextAction: string;
  note?: string;
};

export type ContractorRelation = {
  id: string;

  principalCode: string;
  principalName: string;

  contractorCode: string;
  contractorName: string;

  status: ContractorRelationStatus;
  contractExpectedDate?: string;

  workScope: string[];
  managedSafetyItems: string[];

  tbmStatus: ContractorSafetyStatus;
  inspectionEducationStatus: ContractorSafetyStatus;
  riskAssessmentShareStatus: ContractorSafetyStatus;
  educationEvidenceStatus: ContractorSafetyStatus;
  actionEvidenceStatus: ContractorSafetyStatus;
  monthlyReportStatus: ContractorSafetyStatus;

  nextAction: string;
  note?: string;
};

export const SAMPLE_PRINCIPAL_COMPANY_BUBBLEMON: PrincipalCompany = {
  code: "bubblemon",
  name: "㈜버블몬코리아",
  role: "원청",
  description: "대도환경·동우환경·한국그린환경과 같은 일반 SafeMetrica 고객사 계약 구조로 운영되는 물류업 원청 고객사",
};

export const SAMPLE_CONTRACTOR_COMPANY_MONS: ContractorCompany = {
  code: "mons",
  name: "몬스",
  role: "협력사",
  description: "물류업 원청 고객사와 연결된 협력사로, TBM, 점검·교육, 위험성평가 공유기록, 증빙자료를 관리해야 하는 작업 수행 주체",
};

export const SAMPLE_BUBBLEMON_MONS_RELATION: ContractorRelation = {
  id: "relation-bubblemon-mons-001",

  principalCode: "bubblemon",
  principalName: "㈜버블몬코리아",

  contractorCode: "mons",
  contractorName: "몬스",

  status: "계약예정",
  contractExpectedDate: "2026-05-26",

  workScope: [
    "물류업 원청·협력사 작업관리",
    "작업 전 TBM 운영",
    "점검·교육 기록관리",
    "위험성평가 결과 공유기록 관리",
    "교육·이수증빙 및 사진·서명 증빙관리",
    "월간 안전운영 보고서 반영",
  ],

  managedSafetyItems: [
    "TBM 교육기록",
    "작업 전 안전활동 사진",
    "법정교육 이수증·수료증",
    "출석부·서명 증빙",
    "위험성평가 실시·근로자 참여·결과 공유 기록",
    "조치 전·후 사진",
    "Evidence Book 연결",
  ],

  tbmStatus: "대기",
  inspectionEducationStatus: "대기",
  riskAssessmentShareStatus: "대기",
  educationEvidenceStatus: "대기",
  actionEvidenceStatus: "대기",
  monthlyReportStatus: "대기",

  nextAction: "화요일 계약 전 일반 고객사 계약 범위, 원청·협력사 운영 범위, 고객사 테넌트 세팅 기준 확정",
  note: "SafeMetrica는 EduLink와 별도로, 일반 고객사 계약 구조에서 원청과 협력사의 안전운영 기록과 증빙관리 체계화를 지원한다.",
};


export const SAMPLE_MONS_CONTRACTOR_SUBMISSIONS: ContractorSubmissionItem[] = [
  {
    id: "mons-submission-tbm-001",
    relationId: SAMPLE_BUBBLEMON_MONS_RELATION.id,

    tenantCode: "bubblemon",
    principalCode: "bubblemon",
    principalName: "㈜버블몬코리아",
    contractorCode: "mons",
    contractorName: "몬스",

    itemType: "TBM",
    title: "㈜몬스 작업 전 TBM 제출",
    description: "㈜몬스 작업자가 작업 전 TBM 실시 기록과 참석 확인 자료를 제한 제출 구조로 제출합니다.",
    requiredEvidence: [
      "작업 전 TBM 실시 기록",
      "참석자 확인 또는 서명",
      "현장 조회·체조·안전활동 사진",
      "오늘 작업 위험요인 공유 내용",
    ],

    contractorSubmissionStatus: "제출대기",
    principalReviewStatus: "미검토",

    evidenceBookRequired: true,
    monthlyReportIncluded: true,
    restrictedLinkOnly: true,

    nextAction: "몬스용 TBM 제한 제출 링크 구조 설계",
  },
  {
    id: "mons-submission-before-after-photo-001",
    relationId: SAMPLE_BUBBLEMON_MONS_RELATION.id,

    tenantCode: "bubblemon",
    principalCode: "bubblemon",
    principalName: "㈜버블몬코리아",
    contractorCode: "mons",
    contractorName: "몬스",

    itemType: "작업 전후 사진",
    title: "작업 전후 사진 제출",
    description: "작업 전 상태와 작업 후 정리·완료 상태를 비교할 수 있도록 사진을 제출합니다.",
    requiredEvidence: [
      "작업 전 현장 상태 사진",
      "작업 중 위험구역 또는 작업대상 사진",
      "작업 후 정리·완료 상태 사진",
    ],

    contractorSubmissionStatus: "제출대기",
    principalReviewStatus: "미검토",

    evidenceBookRequired: true,
    monthlyReportIncluded: true,
    restrictedLinkOnly: true,

    nextAction: "작업 전·후 사진 제출 항목을 Evidence Book과 연결할 수 있도록 준비",
  },
  {
    id: "mons-submission-education-001",
    relationId: SAMPLE_BUBBLEMON_MONS_RELATION.id,

    tenantCode: "bubblemon",
    principalCode: "bubblemon",
    principalName: "㈜버블몬코리아",
    contractorCode: "mons",
    contractorName: "몬스",

    itemType: "교육·서명·출석",
    title: "교육·서명·출석 증빙 제출",
    description: "교육 실시 여부와 근로자 참여 여부를 확인할 수 있는 증빙을 제출합니다.",
    requiredEvidence: [
      "교육자료 또는 교육내용",
      "참석자 명단",
      "서명지",
      "교육 사진 또는 참여 확인 자료",
    ],

    contractorSubmissionStatus: "제출대기",
    principalReviewStatus: "미검토",

    evidenceBookRequired: true,
    monthlyReportIncluded: true,
    restrictedLinkOnly: true,

    nextAction: "교육·이수증빙 화면과 월간보고서 반영 구조 확인",
  },
  {
    id: "mons-submission-risk-share-001",
    relationId: SAMPLE_BUBBLEMON_MONS_RELATION.id,

    tenantCode: "bubblemon",
    principalCode: "bubblemon",
    principalName: "㈜버블몬코리아",
    contractorCode: "mons",
    contractorName: "몬스",

    itemType: "위험성평가 공유 확인",
    title: "위험성평가 공유 확인 제출",
    description: "버블몬 원청의 위험성평가 결과가 ㈜몬스 작업자에게 공유되었는지 확인합니다.",
    requiredEvidence: [
      "위험성평가 공유 확인 기록",
      "작업자 확인 또는 서명",
      "TBM 중 위험요인 공유 내용",
      "보완 필요 위험요인 확인 기록",
    ],

    contractorSubmissionStatus: "제출대기",
    principalReviewStatus: "미검토",

    evidenceBookRequired: false,
    monthlyReportIncluded: true,
    restrictedLinkOnly: true,

    nextAction: "위험성평가 공유 확인 항목을 월간보고서 원청·협력사 섹션에 반영",
  },
  {
    id: "mons-submission-action-photo-001",
    relationId: SAMPLE_BUBBLEMON_MONS_RELATION.id,

    tenantCode: "bubblemon",
    principalCode: "bubblemon",
    principalName: "㈜버블몬코리아",
    contractorCode: "mons",
    contractorName: "몬스",

    itemType: "조치 전후 사진",
    title: "조치 전후 사진 제출",
    description: "보완 요청이나 조치 필요 항목에 대해 조치 전·후 비교가 가능한 증빙을 제출합니다.",
    requiredEvidence: [
      "조치 전 상태 사진",
      "조치 중 또는 조치 방법 확인 자료",
      "조치 후 완료 사진",
      "관리자 확인 기록",
    ],

    contractorSubmissionStatus: "미제출",
    principalReviewStatus: "미검토",

    evidenceBookRequired: true,
    monthlyReportIncluded: true,
    restrictedLinkOnly: true,

    nextAction: "조치 전·후 사진을 원청 검토 상태와 분리하여 관리",
    note: "TBM 활동 증빙과 조치 이행 증빙은 별도로 판단합니다.",
  },
];


export function getContractorSubmissionItemById(itemId: string) {
  return SAMPLE_MONS_CONTRACTOR_SUBMISSIONS.find((item) => item.id === itemId) ?? null;
}

export function getContractorSubmissionSummary(items: ContractorSubmissionItem[]) {
  const totalItems = items.length;
  const submittedCount = items.filter((item) =>
    item.contractorSubmissionStatus === "제출완료" ||
    item.contractorSubmissionStatus === "보완제출"
  ).length;
  const pendingCount = items.filter((item) =>
    item.contractorSubmissionStatus === "미제출" ||
    item.contractorSubmissionStatus === "제출대기"
  ).length;
  const reviewConfirmedCount = items.filter((item) => item.principalReviewStatus === "확인").length;
  const reviewFollowUpCount = items.filter((item) => item.principalReviewStatus === "보완요청").length;
  const reviewPendingCount = items.filter((item) =>
    item.principalReviewStatus === "미검토" ||
    item.principalReviewStatus === "검토중"
  ).length;
  const evidenceBookRequiredCount = items.filter((item) => item.evidenceBookRequired).length;
  const monthlyReportIncludedCount = items.filter((item) => item.monthlyReportIncluded).length;

  return {
    totalItems,
    submittedCount,
    pendingCount,
    reviewConfirmedCount,
    reviewFollowUpCount,
    reviewPendingCount,
    evidenceBookRequiredCount,
    monthlyReportIncludedCount,
    submissionRate: totalItems === 0 ? 0 : Math.round((submittedCount / totalItems) * 100),
  };
}

export function getContractorRelationSummary(relation: ContractorRelation) {
  const statuses = [
    relation.tbmStatus,
    relation.inspectionEducationStatus,
    relation.riskAssessmentShareStatus,
    relation.educationEvidenceStatus,
    relation.actionEvidenceStatus,
    relation.monthlyReportStatus,
  ];

  const confirmedCount = statuses.filter((status) => status === "확인").length;
  const followUpCount = statuses.filter((status) => status === "보완 필요").length;
  const pendingCount = statuses.filter((status) => status === "대기").length;

  return {
    totalManagedItems: statuses.length,
    confirmedCount,
    followUpCount,
    pendingCount,
    readyToOperate: relation.status === "운영중" && followUpCount === 0,
  };
}
