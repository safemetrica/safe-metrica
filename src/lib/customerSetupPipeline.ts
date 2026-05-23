export type CustomerSetupStage =
  | "접수"
  | "자료요청"
  | "자료확인"
  | "테넌트세팅"
  | "보안링크발급"
  | "운영시작"
  | "월간보고서발행"
  | "보완필요";

export type CustomerSetupItemStatus =
  | "확인"
  | "대기"
  | "보완 필요"
  | "해당 없음";

export type CustomerSetupPipelineRecord = {
  id: string;
  partnerCode?: string;
  partnerBranchCode?: string;

  customerCode: string;
  customerName: string;
  industry: string;
  workerCount?: number;

  currentStage: CustomerSetupStage;

  companyInfoStatus: CustomerSetupItemStatus;
  contactInfoStatus: CustomerSetupItemStatus;
  riskAssessmentMaterialStatus: CustomerSetupItemStatus;
  legalEducationCertificateStatus: CustomerSetupItemStatus;
  attendanceRecordStatus: CustomerSetupItemStatus;
  tbmOperationStatus: CustomerSetupItemStatus;
  tenantSetupStatus: CustomerSetupItemStatus;
  secureLinkStatus: CustomerSetupItemStatus;
  monthlyReportStatus: CustomerSetupItemStatus;

  blockedReasons: string[];
  nextAction: string;
  memo?: string;
};

export const CUSTOMER_SETUP_PIPELINE_STAGES: {
  stage: CustomerSetupStage;
  description: string;
}[] = [
  {
    stage: "접수",
    description: "파트너 또는 내부 영업을 통해 고객사 후보가 접수된 상태입니다.",
  },
  {
    stage: "자료요청",
    description: "고객사 기본정보, 위험성평가, 교육증빙, TBM 자료를 요청합니다.",
  },
  {
    stage: "자료확인",
    description: "제출 자료의 누락 여부와 세팅 가능성을 확인합니다.",
  },
  {
    stage: "테넌트세팅",
    description: "고객사 코드, 업종 Pack, 운영 화면을 세팅합니다.",
  },
  {
    stage: "보안링크발급",
    description: "고객사 전용 보안 접속 링크를 발급합니다.",
  },
  {
    stage: "운영시작",
    description: "점검·교육, TBM, 증빙관리, 월간보고 운영을 시작합니다.",
  },
  {
    stage: "월간보고서발행",
    description: "1개월 운영 결과를 월간보고서로 정리합니다.",
  },
  {
    stage: "보완필요",
    description: "자료 누락 또는 세팅 보완이 필요한 상태입니다.",
  },
];

export const SAMPLE_CUSTOMER_SETUP_PIPELINE_RECORDS: CustomerSetupPipelineRecord[] = [
  {
    id: "setup-sample-001",
    partnerCode: "gaonedu",
    partnerBranchCode: "gaon-pilot",
    customerCode: "sample-logistics",
    customerName: "물류·도소매 샘플 사업장",
    industry: "물류·도소매",
    workerCount: 20,
    currentStage: "자료확인",
    companyInfoStatus: "확인",
    contactInfoStatus: "확인",
    riskAssessmentMaterialStatus: "확인",
    legalEducationCertificateStatus: "보완 필요",
    attendanceRecordStatus: "대기",
    tbmOperationStatus: "확인",
    tenantSetupStatus: "대기",
    secureLinkStatus: "대기",
    monthlyReportStatus: "대기",
    blockedReasons: ["법정교육 수료증 또는 이수증 확인 필요", "출석부 제출 대기"],
    nextAction: "교육증빙 자료 수령 후 고객사 테넌트 세팅",
    memo: "파일럿 1순위 후보",
  },
  {
    id: "setup-sample-002",
    partnerCode: "gaonedu",
    partnerBranchCode: "gaon-pilot",
    customerCode: "sample-manufacturing",
    customerName: "제조업 샘플 사업장",
    industry: "제조업",
    workerCount: 15,
    currentStage: "자료요청",
    companyInfoStatus: "확인",
    contactInfoStatus: "확인",
    riskAssessmentMaterialStatus: "대기",
    legalEducationCertificateStatus: "대기",
    attendanceRecordStatus: "대기",
    tbmOperationStatus: "대기",
    tenantSetupStatus: "대기",
    secureLinkStatus: "대기",
    monthlyReportStatus: "대기",
    blockedReasons: ["기존 위험성평가 자료 요청 중", "교육증빙 자료 요청 중"],
    nextAction: "고객사 자료 수집 후 세팅 가능 여부 확인",
    memo: "업종 Pack 검토 필요",
  },
];

export function getCustomerSetupPipelineSummary(records: CustomerSetupPipelineRecord[]) {
  const blocked = records.filter(
    (record) => record.currentStage === "보완필요" || record.blockedReasons.length > 0
  );

  const readyForTenantSetup = records.filter(
    (record) =>
      record.companyInfoStatus === "확인" &&
      record.contactInfoStatus === "확인" &&
      record.riskAssessmentMaterialStatus === "확인"
  );

  const secureLinkIssued = records.filter((record) => record.secureLinkStatus === "확인");

  return {
    total: records.length,
    blockedCount: blocked.length,
    readyForTenantSetupCount: readyForTenantSetup.length,
    secureLinkIssuedCount: secureLinkIssued.length,
  };
}
