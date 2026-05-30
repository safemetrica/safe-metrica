export type FieldParticipationCopy = {
  code: string;
  companyName: string;
  badge: string;
  title: string;
  description: string;
  formNoticeTitle: string;
  formNoticeBody: string;
  submitButtonLabel: string;
  submittedReviewMessage: string;
};

function normalizeCompanyCode(value?: string | null) {
  const code = (value ?? "").trim().toLowerCase();

  if (
    code === "korea-green" ||
    code === "korea_green" ||
    code === "koreagreen" ||
    code === "greenkorea"
  ) {
    return "hankookgreen";
  }

  return code;
}

const OPERATING_COMPANY_NAMES: Record<string, string> = {
  daedo: "㈜대도환경",
  dongwoo: "㈜동우환경",
  hankookgreen: "㈜한국그린환경",
  bubblemon: "㈜버블몬코리아",
};

export function getFieldParticipationCopy(rawCode?: string | null): FieldParticipationCopy {
  const code = normalizeCompanyCode(rawCode);

  if (code === "mons") {
    return {
      code,
      companyName: "㈜몬스",
      badge: "SafeMetrica 현장의견 제출",
      title: "㈜몬스 현장의견 제출",
      description:
        "현장에서 발견한 위험요인, 아차사고, 개선이 필요한 내용을 남겨주세요. 제출 내용은 현장 안전운영 자료로 확인됩니다.",
      formNoticeTitle: "제출 안내",
      formNoticeBody:
        "제출 내용은 현장 위험을 줄이기 위한 안전 개선 자료로 활용됩니다. 필요한 경우 관리자가 내용을 확인합니다.",
      submitButtonLabel: "현장 의견 제출하기",
      submittedReviewMessage:
        "제출 내용은 현장 안전운영 자료로 확인됩니다.",
    };
  }

  const companyName = OPERATING_COMPANY_NAMES[code] ?? "현장";

  return {
    code,
    companyName,
    badge: "SafeMetrica 현장근로자 참여",
    title: `${companyName} 현장근로자 안전참여`,
    description:
      "오늘 작업 전 위험요인을 확인하고, 현장 의견이나 아차사고를 남겨주세요. 제출 내용은 안전관리자가 확인하고 필요한 조치 또는 위험성평가 반영 후보로 검토합니다.",
    formNoticeTitle: "근로자 참여 안내",
    formNoticeBody:
      "이 화면은 현장근로자용입니다. 제보 내용은 불이익 목적이 아니라 현장 위험을 줄이기 위한 안전 개선 자료로 활용됩니다.",
    submitButtonLabel: "위험요인·아차사고 제출하기",
    submittedReviewMessage:
      `${companyName} 안전관리자가 확인하고 필요한 조치 또는 위험성평가 반영 후보로 검토합니다.`,
  };
}
