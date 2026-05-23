export type CompanyContractRole =
  | "원청"
  | "하청"
  | "협력업체";

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
  role: "하청" | "협력업체";
  description: string;
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
  name: "버블몬코리아",
  role: "원청",
  description: "대도환경·동우환경·한국그린환경과 같은 일반 SafeMetrica 고객사 계약 구조로 운영되는 물류업 원청 고객사",
};

export const SAMPLE_CONTRACTOR_COMPANY_MONS: ContractorCompany = {
  code: "mons",
  name: "몬스",
  role: "하청",
  description: "물류업 원청 고객사와 연결된 하청·협력업체로, TBM, 점검·교육, 위험성평가 공유기록, 증빙자료를 관리해야 하는 작업 수행 주체",
};

export const SAMPLE_BUBBLEMON_MONS_RELATION: ContractorRelation = {
  id: "relation-bubblemon-mons-001",

  principalCode: "bubblemon",
  principalName: "버블몬코리아",

  contractorCode: "mons",
  contractorName: "몬스",

  status: "계약예정",
  contractExpectedDate: "2026-05-26",

  workScope: [
    "물류업 원청·하청 작업관리",
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

  nextAction: "화요일 계약 전 일반 고객사 계약 범위, 원청·하청 운영 범위, 고객사 테넌트 세팅 기준 확정",
  note: "SafeMetrica는 EduLink와 별도로, 일반 고객사 계약 구조에서 원청과 협력업체의 안전운영 기록과 증빙관리 체계화를 지원한다.",
};

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
