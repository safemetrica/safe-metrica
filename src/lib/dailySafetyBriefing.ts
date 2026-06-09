export type DailySafetyBriefingPriority = "normal" | "watch" | "warning" | "critical";

export type DailySafetyBriefingTask = {
  icon: string;
  text: string;
  href: string;
  urgent: boolean;
  source: "tbm" | "evidence" | "ptw" | "risk" | "partner" | "weather" | "system";
};

export type DailySafetyBriefingInput = {
  companyName?: string;
  todayTbmCount: number;
  ebMissingCount: number;
  actionNeededCount: number;
  ptwPendingCount: number;
  ptwBlockedCount: number;
  ptwRequiredMissingCount: number;
  highRiskCount: number;
  riskActionNeededCount: number;
  budgetNeededCount?: number;
  partnerFollowUpCount?: number;
  partnerPendingCount?: number;
  weatherDecision?: string;
};

export type DailySafetyBriefing = {
  priority: DailySafetyBriefingPriority;
  statusLabel: string;
  executiveHeadline: string;
  fieldHeadline: string;
  fieldMessages: string[];
  executiveMessages: string[];
  sifFocus: string[];
  ptwMessages: string[];
  evidenceMessages: string[];
  partnerMessages: string[];
  executiveTasks: DailySafetyBriefingTask[];
};

function pushUnique(list: string[], value: string) {
  if (value && !list.includes(value)) {
    list.push(value);
  }
}

function getPriority(input: DailySafetyBriefingInput): DailySafetyBriefingPriority {
  if (
    input.ptwBlockedCount > 0 ||
    input.ptwRequiredMissingCount > 0 ||
    (input.partnerFollowUpCount ?? 0) > 0
  ) {
    return "critical";
  }

  if (
    input.highRiskCount > 0 ||
    input.riskActionNeededCount > 0 ||
    input.actionNeededCount > 0 ||
    input.ebMissingCount > 0
  ) {
    return "warning";
  }

  if (
    input.todayTbmCount === 0 ||
    input.ptwPendingCount > 0 ||
    (input.partnerPendingCount ?? 0) > 0
  ) {
    return "watch";
  }

  return "normal";
}

function getStatusLabel(priority: DailySafetyBriefingPriority) {
  if (priority === "critical") return "즉시 확인";
  if (priority === "warning") return "주의 필요";
  if (priority === "watch") return "확인 필요";
  return "정상";
}

export function buildDailySafetyBriefing(input: DailySafetyBriefingInput): DailySafetyBriefing {
  const priority = getPriority(input);
  const statusLabel = getStatusLabel(priority);

  const fieldMessages: string[] = [];
  const executiveMessages: string[] = [];
  const sifFocus: string[] = [];
  const ptwMessages: string[] = [];
  const evidenceMessages: string[] = [];
  const partnerMessages: string[] = [];
  const executiveTasks: DailySafetyBriefingTask[] = [];

  if (input.todayTbmCount === 0) {
    pushUnique(fieldMessages, "오늘 TBM 작성 후 근로자에게 작업 위험요인을 공유해 주세요.");
    pushUnique(executiveMessages, "오늘 TBM 기록이 아직 없어 현장 공유 여부 확인이 필요합니다.");
    executiveTasks.push({
      icon: "📋",
      text: "오늘 TBM 작성 및 공유 상태 확인",
      href: "/tbm",
      urgent: true,
      source: "tbm",
    });
  } else {
    pushUnique(fieldMessages, `오늘 TBM ${input.todayTbmCount}건이 확인되었습니다.`);
    pushUnique(executiveMessages, `오늘 TBM ${input.todayTbmCount}건이 작성되었습니다.`);
  }

  if (input.highRiskCount > 0) {
    pushUnique(sifFocus, `고위험 항목 ${input.highRiskCount}건`);
    pushUnique(executiveMessages, `위험성평가표상 고위험 항목 ${input.highRiskCount}건을 우선 확인해야 합니다.`);
    executiveTasks.push({
      icon: "🚨",
      text: `고위험 항목 ${input.highRiskCount}건 — 대표자 확인 필요`,
      href: "/risk",
      urgent: true,
      source: "risk",
    });
  }

  if (input.riskActionNeededCount > 0 || input.actionNeededCount > 0) {
    const isRiskActionTask = input.riskActionNeededCount > 0;
    const count = isRiskActionTask ? input.riskActionNeededCount : input.actionNeededCount;
    const taskLabel = isRiskActionTask ? "위험성평가 개선대책" : "TBM 조치필요";
    const taskHref = isRiskActionTask ? "/risk" : "/tbm";

    pushUnique(fieldMessages, `${taskLabel} ${count}건은 작업 전 상태를 확인하고 조치 후 증빙을 남겨야 합니다.`);
    pushUnique(executiveMessages, `${taskLabel} ${count}건이 있어 담당자 처리 상태 확인이 필요합니다.`);
    executiveTasks.push({
      icon: "🛠️",
      text: `${taskLabel} ${count}건 — 처리 상태 확인`,
      href: taskHref,
      urgent: input.highRiskCount > 0,
      source: isRiskActionTask ? "risk" : "tbm",
    });
  }

  if (input.ebMissingCount > 0) {
    pushUnique(evidenceMessages, `증빙 누락 ${input.ebMissingCount}건은 Evidence Book 연결이 필요합니다.`);
    executiveTasks.push({
      icon: "📎",
      text: `증빙 누락 ${input.ebMissingCount}건 — EB 연결 확인`,
      href: "/ebm",
      urgent: true,
      source: "evidence",
    });
  }

  if (input.ptwBlockedCount > 0) {
    pushUnique(ptwMessages, `금지 또는 반려된 PTW ${input.ptwBlockedCount}건은 작업 전 즉시 확인해야 합니다.`);
    executiveTasks.push({
      icon: "⛔",
      text: `PTW 금지·반려 ${input.ptwBlockedCount}건 — 작업 전 확인`,
      href: "/ptw",
      urgent: true,
      source: "ptw",
    });
  }

  if (input.ptwRequiredMissingCount > 0) {
    pushUnique(ptwMessages, `고위험 작업 중 PTW 확인 필요 항목 ${input.ptwRequiredMissingCount}건이 있습니다.`);
    executiveTasks.push({
      icon: "🧾",
      text: `고위험 작업 PTW 확인 필요 ${input.ptwRequiredMissingCount}건`,
      href: "/ptw",
      urgent: true,
      source: "ptw",
    });
  }

  if (input.ptwPendingCount > 0) {
    pushUnique(ptwMessages, `PTW 승인 대기 ${input.ptwPendingCount}건은 작업 전 승인상태를 확인해야 합니다.`);
    executiveTasks.push({
      icon: "🧾",
      text: `PTW 승인 대기 ${input.ptwPendingCount}건 — 검토 필요`,
      href: "/ptw",
      urgent: false,
      source: "ptw",
    });
  }

  if ((input.partnerFollowUpCount ?? 0) > 0) {
    pushUnique(partnerMessages, `협력사 보완요청 ${input.partnerFollowUpCount}건은 원청 확인이 필요합니다.`);
    executiveTasks.push({
      icon: "🤝",
      text: `협력사 보완요청 ${input.partnerFollowUpCount}건 — 확인 필요`,
      href: "/contractor-status",
      urgent: true,
      source: "partner",
    });
  } else if ((input.partnerPendingCount ?? 0) > 0) {
    pushUnique(partnerMessages, `협력사 미검토 제출자료 ${input.partnerPendingCount}건은 원청 검토가 필요합니다.`);
    executiveTasks.push({
      icon: "🤝",
      text: `협력사 미검토 제출자료 ${input.partnerPendingCount}건 — 원청 검토 필요`,
      href: "/contractor-status",
      urgent: false,
      source: "partner",
    });
  }

  if ((input.budgetNeededCount ?? 0) > 0) {
    pushUnique(executiveMessages, `예산 검토가 필요한 개선대책 ${input.budgetNeededCount}건이 있습니다.`);
  }

  if (fieldMessages.length === 0) {
    pushUnique(fieldMessages, "오늘 주요 미조치·증빙 누락·PTW 대기 항목은 확인되지 않습니다.");
  }

  if (executiveMessages.length === 0) {
    pushUnique(executiveMessages, "오늘 대표자가 즉시 확인해야 할 주요 위험 신호는 확인되지 않습니다.");
  }

  if (sifFocus.length === 0) {
    pushUnique(sifFocus, "오늘 별도 고위험 신호 없음");
  }

  if (ptwMessages.length === 0) {
    pushUnique(ptwMessages, "PTW 즉시 확인 필요 항목 없음");
  }

  if (evidenceMessages.length === 0) {
    pushUnique(evidenceMessages, "증빙 누락 신호 없음");
  }

  if (partnerMessages.length === 0) {
    pushUnique(partnerMessages, "협력사 보완요청 신호 없음");
  }

  const executiveHeadline =
    priority === "critical"
      ? "오늘 즉시 확인할 안전 신호가 있습니다."
      : priority === "warning"
        ? "오늘 조치와 증빙 상태를 확인해 주세요."
        : priority === "watch"
          ? "오늘 확인할 항목이 있습니다."
          : "오늘 주요 안전운영 상태는 정상 범위입니다.";

  const fieldHeadline =
    priority === "critical"
      ? "작업 전 위험요인과 승인상태를 먼저 확인해 주세요."
      : priority === "warning"
        ? "오늘 TBM에서 조치·증빙 필요사항을 공유해 주세요."
        : priority === "watch"
          ? "오늘 작업 전 TBM 공유 상태를 확인해 주세요."
          : "오늘 안전활동을 평소 기준대로 진행해 주세요.";

  return {
    priority,
    statusLabel,
    executiveHeadline,
    fieldHeadline,
    fieldMessages,
    executiveMessages,
    sifFocus,
    ptwMessages,
    evidenceMessages,
    partnerMessages,
    executiveTasks,
  };
}
