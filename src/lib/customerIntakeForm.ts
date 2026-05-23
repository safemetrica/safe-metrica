export type CustomerIntakeFieldType =
  | "text"
  | "number"
  | "date"
  | "select"
  | "boolean"
  | "textarea";

export type CustomerIntakeRequirement = "필수" | "권장" | "선택";

export type CustomerIntakeField = {
  key: string;
  label: string;
  type: CustomerIntakeFieldType;
  requirement: CustomerIntakeRequirement;
  description: string;
  options?: string[];
};

export const CUSTOMER_INTAKE_FORM_FIELDS: CustomerIntakeField[] = [
  {
    key: "companyName",
    label: "회사명",
    type: "text",
    requirement: "필수",
    description: "SafeMetrica 고객사 테넌트 생성 기준이 되는 회사명입니다.",
  },
  {
    key: "businessNumber",
    label: "사업자등록번호",
    type: "text",
    requirement: "권장",
    description: "계약·세금계산서·고객사 식별을 위한 정보입니다.",
  },
  {
    key: "industry",
    label: "업종",
    type: "select",
    requirement: "필수",
    description: "위험요인 Pack과 초기 점검 항목을 선택하기 위한 기준입니다.",
    options: ["생활폐기물", "제조업", "물류·도소매", "포장·골판지", "건설·해체", "기타"],
  },
  {
    key: "workplaceAddress",
    label: "현장 주소",
    type: "text",
    requirement: "권장",
    description: "현장 단위 운영과 월간보고서 표시 기준입니다.",
  },
  {
    key: "workerCount",
    label: "근로자 수",
    type: "number",
    requirement: "필수",
    description: "교육대상, TBM 참여, 위험성평가 공유 대상 산정 기준입니다.",
  },
  {
    key: "managerName",
    label: "담당자",
    type: "text",
    requirement: "필수",
    description: "고객사 안전운영 담당자 또는 대표자입니다.",
  },
  {
    key: "managerPhone",
    label: "연락처",
    type: "text",
    requirement: "필수",
    description: "초기 세팅, 자료 요청, 보안링크 전달을 위한 연락처입니다.",
  },
  {
    key: "managerEmail",
    label: "이메일",
    type: "text",
    requirement: "권장",
    description: "월간보고서, 접속 안내, 자료 요청 발송용 이메일입니다.",
  },
  {
    key: "hasRiskAssessment",
    label: "기존 위험성평가 자료 여부",
    type: "boolean",
    requirement: "필수",
    description: "위험성평가 실시·근로자 참여·결과 공유 기록 확인 대상입니다.",
  },
  {
    key: "hasEducationCertificate",
    label: "법정교육 이수증/수료증 여부",
    type: "boolean",
    requirement: "필수",
    description: "교육기관 또는 사업장 자체 교육증빙 보유 여부입니다.",
  },
  {
    key: "hasAttendanceRecord",
    label: "출석부 여부",
    type: "boolean",
    requirement: "권장",
    description: "교육 참석자와 교육시간 증빙 확인 자료입니다.",
  },
  {
    key: "hasTbmOperation",
    label: "TBM 운영 여부",
    type: "boolean",
    requirement: "필수",
    description: "작업 전 위험요인 공유와 근로자 참여 기록 운영 여부입니다.",
  },
  {
    key: "desiredStartDate",
    label: "희망 운영 시작일",
    type: "date",
    requirement: "권장",
    description: "파일럿 운영 시작 일정과 월간보고서 기준월을 정하기 위한 날짜입니다.",
  },
  {
    key: "memo",
    label: "비고",
    type: "textarea",
    requirement: "선택",
    description: "업종 특이사항, 자료 보완 필요사항, 담당자 요청사항을 기록합니다.",
  },
];

export const CUSTOMER_INTAKE_CSV_HEADERS = CUSTOMER_INTAKE_FORM_FIELDS.map((field) => field.label);

export const CUSTOMER_INTAKE_SAMPLE_ROW: Record<string, string> = {
  회사명: "샘플 사업장",
  사업자등록번호: "000-00-00000",
  업종: "물류·도소매",
  "현장 주소": "인천광역시 ○○구",
  "근로자 수": "20",
  담당자: "홍길동",
  연락처: "010-0000-0000",
  이메일: "sample@example.com",
  "기존 위험성평가 자료 여부": "Y",
  "법정교육 이수증/수료증 여부": "N",
  "출석부 여부": "N",
  "TBM 운영 여부": "Y",
  "희망 운영 시작일": "2026-06-01",
  비고: "교육증빙 보완 필요",
};

export function getCustomerIntakeFormSummary(fields: CustomerIntakeField[]) {
  return {
    total: fields.length,
    required: fields.filter((field) => field.requirement === "필수").length,
    recommended: fields.filter((field) => field.requirement === "권장").length,
    optional: fields.filter((field) => field.requirement === "선택").length,
  };
}
