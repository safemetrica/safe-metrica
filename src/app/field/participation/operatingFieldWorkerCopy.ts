export type OperatingFieldWorkerCopy = {
  code: string;
  companyName: string;
  badge: string;
  title: string;
  description: string;
  noticeTitle: string;
  noticeBody: string;
  submitButtonLabel: string;
  submittedMessage: string;
  feedbackTypes?: string[];
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

  if (
    code === "richi-korea" ||
    code === "richi_korea" ||
    code === "richikorea" ||
    code === "rich"
  ) {
    return "richi";
  }

  return code;
}

const OPERATING_FIELD_WORKER_COPY: Record<string, OperatingFieldWorkerCopy> = {
  daedo: {
    code: "daedo",
    companyName: "㈜대도환경",
    badge: "SafeMetrica 현장근로자 참여",
    title: "㈜대도환경 현장근로자 안전참여",
    description:
      "오늘 작업 전 위험요인을 확인하고, 현장 의견이나 아차사고를 남겨주세요. 제출 내용은 안전관리자가 확인하고 필요한 조치 또는 위험성평가 반영 후보로 검토합니다.",
    noticeTitle: "현장근로자 참여 안내",
    noticeBody:
      "이 화면은 ㈜대도환경 현장근로자용입니다. 제보 내용은 불이익 목적이 아니라 현장 위험을 줄이기 위한 안전 개선 자료로 활용됩니다.",
    submitButtonLabel: "위험요인·아차사고 제출하기",
    submittedMessage:
      "㈜대도환경 안전관리자가 확인하고 필요한 조치 또는 위험성평가 반영 후보로 검토합니다.",
  },
  dongwoo: {
    code: "dongwoo",
    companyName: "㈜동우환경",
    badge: "SafeMetrica 현장근로자 참여",
    title: "㈜동우환경 현장근로자 안전참여",
    description:
      "오늘 작업 전 위험요인을 확인하고, 현장 의견이나 아차사고를 남겨주세요. 제출 내용은 안전관리자가 확인하고 필요한 조치 또는 위험성평가 반영 후보로 검토합니다.",
    noticeTitle: "현장근로자 참여 안내",
    noticeBody:
      "이 화면은 ㈜동우환경 현장근로자용입니다. 제보 내용은 불이익 목적이 아니라 현장 위험을 줄이기 위한 안전 개선 자료로 활용됩니다.",
    submitButtonLabel: "위험요인·아차사고 제출하기",
    submittedMessage:
      "㈜동우환경 안전관리자가 확인하고 필요한 조치 또는 위험성평가 반영 후보로 검토합니다.",
  },
  hankookgreen: {
    code: "hankookgreen",
    companyName: "㈜한국그린환경",
    badge: "SafeMetrica 현장근로자 참여",
    title: "㈜한국그린환경 현장근로자 안전참여",
    description:
      "오늘 작업 전 위험요인을 확인하고, 현장 의견이나 아차사고를 남겨주세요. 제출 내용은 안전관리자가 확인하고 필요한 조치 또는 위험성평가 반영 후보로 검토합니다.",
    noticeTitle: "현장근로자 참여 안내",
    noticeBody:
      "이 화면은 ㈜한국그린환경 현장근로자용입니다. 제보 내용은 불이익 목적이 아니라 현장 위험을 줄이기 위한 안전 개선 자료로 활용됩니다.",
    submitButtonLabel: "위험요인·아차사고 제출하기",
    submittedMessage:
      "㈜한국그린환경 안전관리자가 확인하고 필요한 조치 또는 위험성평가 반영 후보로 검토합니다.",
  },
  bubblemon: {
    code: "bubblemon",
    companyName: "㈜버블몬코리아",
    badge: "SafeMetrica 현장근로자 참여",
    title: "㈜버블몬코리아 현장근로자 안전참여",
    description:
      "오늘 작업 전 위험요인을 확인하고, 현장 의견이나 아차사고를 남겨주세요. 제출 내용은 안전관리자가 확인하고 필요한 조치 또는 위험성평가 반영 후보로 검토합니다.",
    noticeTitle: "현장근로자 참여 안내",
    noticeBody:
      "이 화면은 ㈜버블몬코리아 현장근로자용입니다. 제보 내용은 불이익 목적이 아니라 현장 위험을 줄이기 위한 안전 개선 자료로 활용됩니다.",
    submitButtonLabel: "위험요인·아차사고 제출하기",
    submittedMessage:
      "㈜버블몬코리아 안전관리자가 확인하고 필요한 조치 또는 위험성평가 반영 후보로 검토합니다.",
  },
    richi: {
      code: "richi",
      companyName: "㈜리치코리아",
      badge: "㈜리치코리아 현장 전자확인",
      title: "㈜리치코리아 현장 전자확인·피드백",
      description:
        "작업 전 위생·안전 확인 내용을 확인하고, 불편사항이나 개선의견이 있으면 짧게 남겨 주세요. 확인 기록은 ㈜리치코리아 현장 운영 개선 검토 자료로 활용됩니다.",
      noticeTitle: "전자확인 안내",
      noticeBody:
        "제출 내용은 현장 확인, 관리자 피드백, 주간 요약용 운영기록으로 활용됩니다. 필요한 경우 관리자 확인 후 개선 검토 자료로 활용됩니다.",
      submitButtonLabel: "전자확인·의견 제출하기",
      submittedMessage:
        "㈜리치코리아 관리자가 제출 내용을 확인하고 필요한 피드백 또는 개선 검토 자료로 활용합니다.",
      feedbackTypes: ["위생·안전 확인", "불편사항", "개선의견", "기타"],
    },
  mons: {
    code: "mons",
    companyName: "㈜몬스",
    badge: "SafeMetrica 현장근로자 참여",
    title: "㈜몬스 현장근로자 안전참여",
    description:
      "오늘 작업 전 TBM 공유 내용과 현장 주의사항을 확인하고, 필요한 의견이나 아차사고를 남겨주세요.",
    noticeTitle: "현장근로자 참여 안내",
    noticeBody:
      "이 화면은 ㈜몬스 현장근로자용입니다. 제출 내용은 현장 안전 확인과 작업 전 공유 기록으로 활용됩니다.",
    submitButtonLabel: "현장 의견 제출하기",
    submittedMessage:
      "㈜몬스 현장관리자가 확인하고 필요한 조치 또는 TBM 운영 참고자료로 검토합니다.",
  },
};

export function getOperatingFieldWorkerCopy(rawCode?: string | null) {
  const code = normalizeCompanyCode(rawCode);
  return OPERATING_FIELD_WORKER_COPY[code] ?? null;
}
