export const riskShareLinkCopy = {
  worker: {
    title: "위험요인 확인 / 의견제출",
    intro:
      "오늘 작업 전 위험요인을 확인해 주세요. 위험하거나 불편한 점이 있으면 의견을 남길 수 있습니다.",
    checks: {
      riskAssessment: "위험성평가 내용을 확인했습니다.",
      safetyMeasure: "오늘 안전조치와 주의사항을 확인했습니다.",
      ppe: "보호구 착용 기준을 확인했습니다.",
      preWorkCondition: "작업 전 이상 여부를 확인했습니다.",
      heatIllnessSymptom: "온열질환 자각증상을 확인했습니다.",
    },
    buttons: {
      checkRisk: "위험요인 확인하기",
      submitAfterCheck: "확인 후 제출하기",
      confirmOnly: "의견 없음, 확인만 제출",
      submitReport: "위험 또는 개선의견 제출",
      attachPhoto: "사진 첨부하기",
      submitting: "제출 중입니다...",
      completed: "제출 완료",
    },
    completion: {
      shareConfirmation:
        "확인 기록이 제출되었습니다. 오늘 작업 전 위험요인과 안전조치 확인 기록으로 저장됩니다.",
      report:
        "의견이 접수되었습니다. 현장관리자가 내용을 확인하고 필요한 경우 조치사항을 기록합니다.",
      photo:
        "사진이 함께 제출되었습니다. 현장 확인과 조치 검토 자료로 활용될 수 있습니다.",
    },
  },

  submissionTypes: {
    shareConfirmation: {
      label: "공유확인",
      description: "위험성평가와 안전조치 내용을 확인한 기록",
    },
    riskReport: {
      label: "위험제보",
      description: "위험요인 또는 불안전 상태 제보",
    },
    nearMiss: {
      label: "아차사고",
      description: "사고로 이어질 뻔한 상황",
    },
    improvement: {
      label: "개선제안",
      description: "작업환경·동선·보호구·설비 개선 의견",
    },
    other: {
      label: "기타",
      description: "분류가 어려운 현장 의견",
    },
  },

  manager: {
    tabs: {
      shareConfirmation: "공유확인",
      reviewNeeded: "검토 필요",
      actionNeeded: "조치 필요",
      completed: "조치완료",
      rejected: "반려",
      all: "전체",
    },
    summaryLabels: {
      todayShareConfirmation: "오늘 공유확인",
      reviewNeeded: "검토 필요",
      actionNeeded: "조치 필요",
      completed: "조치완료",
    },
    guide:
      "공유확인과 위험제보를 구분해 확인하세요. 위험제보는 현장 확인 후 처리상태와 조치 메모를 남겨 주세요.",
    actionMemoPlaceholder: "조치 내용 또는 확인 결과를 입력해 주세요.",
  },

  statuses: {
    received: {
      label: "접수",
      description: "제출 내용이 접수된 상태",
    },
    reviewing: {
      label: "검토중",
      description: "관리자가 내용을 확인 중인 상태",
    },
    actionNeeded: {
      label: "조치필요",
      description: "현장 조치 또는 추가 확인이 필요한 상태",
    },
    completed: {
      label: "조치완료",
      description: "관리자가 조치 완료로 기록한 상태",
    },
    rejected: {
      label: "반려",
      description: "조치 대상이 아니거나 정보가 부족한 상태",
    },
  },

  ceoSummary: {
    labels: {
      monthlyShareConfirmation: "이번 달 공유확인",
      riskReport: "위험제보",
      nearMiss: "아차사고",
      improvement: "개선제안",
      pendingReview: "미검토",
      actionNeeded: "조치필요",
      completed: "조치완료",
    },
    sentence:
      "이번 달 근로자 공유확인 {shareCount}건, 위험제보 {reportCount}건, 조치완료 {doneCount}건입니다. 미검토 {pendingCount}건은 확인이 필요합니다.",
    caution: "공유확인 수를 조치완료 수로 표시하지 않습니다.",
  },

  poster: {
    title: "위험요인 확인 / 의견제출 QR",
    body:
      "오늘 작업 전 위험요인을 확인해 주세요. 의견이 없으면 “의견 없음”으로 제출해 주세요. 위험하거나 불편한 점이 있으면 사진과 함께 남겨 주세요.",
    steps: ["QR 접속", "위험요인 확인", "의견 없음 또는 위험제보 제출"],
    short:
      "오늘 작업 전 위험요인을 확인하고 의견이 있으면 남겨 주세요.",
  },

  industry: {
    waste: {
      title: "생활폐기물 수거 작업 전 위험요인 확인 QR",
      hazards: ["후진 차량", "적재함 협착", "미끄럼", "찔림·베임", "야간작업"],
      body:
        "후진 차량, 적재함 협착, 미끄럼, 찔림·베임, 야간작업 위험을 확인해 주세요. 위험하거나 불편한 장소가 있으면 사진과 함께 남겨 주세요.",
    },
    logistics: {
      title: "물류 작업 전 위험요인 확인 QR",
      hazards: ["지게차 이동", "상·하차", "랙 주변", "고소대", "보행자 동선"],
      body:
        "지게차 이동, 상·하차, 랙 주변, 고소대, 보행자 동선을 확인해 주세요. 개선이 필요한 점은 QR로 남겨 주세요.",
    },
    manufacturing: {
      title: "제조 작업 전 위험요인 확인 QR",
      hazards: ["끼임", "협착", "중량물", "감전", "고열", "지게차"],
      body:
        "끼임, 협착, 중량물, 감전, 고열, 지게차 위험을 확인해 주세요. 위험하거나 불편한 점은 QR로 남겨 주세요.",
    },
    chemical: {
      title: "화학물질 취급 전 위험요인 확인 QR",
      hazards: ["물질명", "경고표지", "보호구", "환기", "비상대응"],
      body:
        "물질명, 경고표지, 보호구, 환기, 비상대응 방법을 확인해 주세요. 이상 증상이나 누출 위험이 있으면 즉시 알리고 QR로 기록해 주세요.",
      caution: "화학물질 취급 현장은 QR 제출보다 즉시 대피·보고·응급조치가 우선입니다.",
    },
  },

  weather: {
    heat: {
      title: "온열질환 주의",
      body:
        "오늘은 온열질환 주의가 필요합니다. 물, 그늘, 휴식 준비상태를 확인해 주세요. 어지러움, 두통, 근육경련이 있으면 즉시 알리고 의견을 남겨 주세요.",
      check: "온열질환 자각증상을 확인했습니다.",
    },
    strongWind: {
      title: "강풍 위험 확인",
      body:
        "강풍 위험이 있는 작업은 작업 전 상태 확인이 필요합니다. 고소작업, 적재물, 외부 작업구역을 확인해 주세요.",
    },
    caution:
      "기상 위험 카드는 작업중지 명령이 아닙니다. 기상 위험 문구는 작업 전 확인 안내로 표시합니다.",
  },

  legal: {
    full:
      "본 기능은 사업장의 위험성평가 공유, 근로자 확인, 의견제출, 관리자 검토 과정을 기록으로 남기기 위한 운영지원 기능입니다. 위험성평가의 최종 실시, 위험성 결정, 개선대책 확정, 현장 조치 실행 및 법적 책임은 사업주에게 있습니다.",
    short:
      "본 서비스는 법적 면책이나 과태료 방지를 보장하지 않습니다. 공유·확인·검토 과정을 기록으로 남기는 운영지원 도구입니다.",
    aiRole:
      "AI는 후보 제안자이며 최종 판단과 조치 책임은 관리자와 사업주에게 있습니다.",
  },

  partnerDemo: {
    intro:
      "샘플 현장 위험요인을 확인해 주세요. 이 화면은 실제 고객 데이터가 아닌 체험용 샘플입니다.",
    completion:
      "샘플 확인 기록이 저장되었습니다. Partner Demo에서는 실제 고객 DB에 저장되지 않습니다.",
    prohibitedExposures: [
      "실제 고객명",
      "실제 고객 사진",
      "실제 Notion DB",
      "Supabase 직접 호출",
      "API 직접 호출",
      "Owner Console",
      "토큰",
      "API Key",
      "환경변수 값",
      "실제 고객 민감정보",
    ],
  },

  export: {
    labels: [
      "공유확인 목록",
      "위험제보 목록",
      "아차사고 목록",
      "개선제안 목록",
      "조치상태 목록",
      "사진증빙 목록",
      "월간 요약",
    ],
    excludedFields: [
      "내부 UUID",
      "raw payload",
      "Notion URL",
      "Owner/Admin 전용 링크",
      "API Key",
      "환경변수명과 값",
      "토큰 또는 토큰 유사 문자열",
      "내부 디버그 메시지",
      "실제 고객 민감정보",
    ],
  },
} as const;

export const riskShareLinkForbiddenCopy = [
  "위험성평가 법적 완료",
  "근로자 참여 의무 자동 충족",
  "법정교육 인정 완료",
  "교육시간 인정 보장",
  "과태료 방지",
  "중대재해 면책",
  "법적 방어 보장",
  "무재해 보장",
  "KOSHA 인정 보장",
  "안전조치 완료 확정",
  "QR 제출만으로 법적 의무 완료",
  "AI가 조치완료를 판단",
  "사진 업로드만으로 증빙 완료",
] as const;

export const riskShareLinkSubmissionTypeLabels = [
  riskShareLinkCopy.submissionTypes.shareConfirmation.label,
  riskShareLinkCopy.submissionTypes.riskReport.label,
  riskShareLinkCopy.submissionTypes.nearMiss.label,
  riskShareLinkCopy.submissionTypes.improvement.label,
  riskShareLinkCopy.submissionTypes.other.label,
] as const;

export const riskShareLinkStatusLabels = [
  riskShareLinkCopy.statuses.received.label,
  riskShareLinkCopy.statuses.reviewing.label,
  riskShareLinkCopy.statuses.actionNeeded.label,
  riskShareLinkCopy.statuses.completed.label,
  riskShareLinkCopy.statuses.rejected.label,
] as const;

export type RiskShareLinkSubmissionTypeLabel =
  (typeof riskShareLinkSubmissionTypeLabels)[number];

export type RiskShareLinkStatusLabel =
  (typeof riskShareLinkStatusLabels)[number];

export type RiskShareLinkIndustryKey = keyof typeof riskShareLinkCopy.industry;