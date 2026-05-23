export type EduLinkPartnerStatus =
  | "준비중"
  | "파일럿"
  | "운영중"
  | "보류";

export type EduLinkBranchStatus =
  | "준비중"
  | "파일럿"
  | "운영중"
  | "휴면";

export type EduLinkCustomerStatus =
  | "상담중"
  | "세팅중"
  | "운영중"
  | "보완 필요"
  | "보류";

export type EduLinkMonthlyReportStatus =
  | "예정"
  | "작성중"
  | "발행 완료"
  | "보완 필요";

export type EduLinkPartner = {
  code: string;
  name: string;
  productLine: "edulink";
  status: EduLinkPartnerStatus;
  description: string;
};

export type EduLinkBranch = {
  code: string;
  partnerCode: string;
  name: string;
  region: string;
  managerName: string;
  status: EduLinkBranchStatus;
  customerCount: number;
};

export type EduLinkCustomerMapping = {
  customerCode: string;
  customerName: string;
  partnerCode: string;
  branchCode: string;
  status: EduLinkCustomerStatus;
  educationEvidenceCount: number;
  followUpCount: number;
  riskAssessmentShared: boolean;
  monthlyReportStatus: EduLinkMonthlyReportStatus;
};

export const SAMPLE_EDULINK_PARTNER: EduLinkPartner = {
  code: "gaonedu",
  name: "가온에듀",
  productLine: "edulink",
  status: "파일럿",
  description: "교육기관 제휴형 안전운영·교육이수증빙 관리 파트너",
};

export const SAMPLE_EDULINK_BRANCHES: EduLinkBranch[] = [
  {
    code: "gaon-incheon",
    partnerCode: "gaonedu",
    name: "가온에듀 인천지사",
    region: "인천",
    managerName: "지사 담당자",
    status: "파일럿",
    customerCount: 2,
  },
  {
    code: "gaon-seoul",
    partnerCode: "gaonedu",
    name: "가온에듀 서울지사",
    region: "서울",
    managerName: "지사 담당자",
    status: "준비중",
    customerCount: 0,
  },
];

export const SAMPLE_EDULINK_CUSTOMER_MAPPINGS: EduLinkCustomerMapping[] = [
  {
    customerCode: "sample-logistics",
    customerName: "물류·도소매 샘플 사업장",
    partnerCode: "gaonedu",
    branchCode: "gaon-incheon",
    status: "세팅중",
    educationEvidenceCount: 2,
    followUpCount: 1,
    riskAssessmentShared: true,
    monthlyReportStatus: "작성중",
  },
  {
    customerCode: "sample-manufacturing",
    customerName: "제조업 샘플 사업장",
    partnerCode: "gaonedu",
    branchCode: "gaon-incheon",
    status: "상담중",
    educationEvidenceCount: 0,
    followUpCount: 0,
    riskAssessmentShared: false,
    monthlyReportStatus: "예정",
  },
];

export function getEduLinkPartnerSummary(customers: EduLinkCustomerMapping[]) {
  const operatingCustomers = customers.filter(
    (customer) => customer.status === "운영중" || customer.status === "세팅중"
  );

  const followUpCustomers = customers.filter((customer) => customer.followUpCount > 0);
  const sharedRiskAssessmentCount = customers.filter((customer) => customer.riskAssessmentShared).length;
  const issuedOrInProgressReports = customers.filter(
    (customer) => customer.monthlyReportStatus === "발행 완료" || customer.monthlyReportStatus === "작성중"
  );

  return {
    totalCustomers: customers.length,
    operatingCustomerCount: operatingCustomers.length,
    followUpCustomerCount: followUpCustomers.length,
    sharedRiskAssessmentCount,
    reportActiveCount: issuedOrInProgressReports.length,
  };
}
