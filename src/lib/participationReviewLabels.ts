export type ParticipationReviewLabel =
  | "공유확인 후보"
  | "확인 필요"
  | "신규 제보"
  | "제보 의도"
  | "사진 있음"
  | "확인정보 있음"
  | "익명"
  | "기존기록/확인정보 미입력"
  | "기존기록/제출자 표시 있음"
  | "월간보고서 후보";

type ParticipationReviewRecord = {
  confirmationType?: unknown;
  confirmation_type?: unknown;
  confirmationStatus?: unknown;
  confirmation_status?: unknown;
  entryIntent?: unknown;
  entry_intent?: unknown;
  submissionType?: unknown;
  submission_type?: unknown;
  legacyType?: unknown;
  legacy_type?: unknown;
  type?: unknown;
  status?: unknown;
  file_urls?: unknown;
  fileUrls?: unknown;
  file_url?: unknown;
  fileUrl?: unknown;
  files?: unknown;
  anonymous?: unknown;
  submitter?: unknown;
  raw_payload?: unknown;
  rawPayload?: unknown;
};

function asObject(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function getText(...values: unknown[]) {
  const value = values.find(
    (candidate) => typeof candidate === "string" && candidate.trim(),
  );
  return typeof value === "string" ? value.trim() : "";
}

function compact(value: string) {
  return value.replace(/[\s_-]+/g, "").toLowerCase();
}

function getBoolean(...values: unknown[]) {
  const value = values.find(
    (candidate) =>
      typeof candidate === "boolean" ||
      (typeof candidate === "string" && candidate.trim().length > 0),
  );

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = compact(value);
    return normalized === "true" || normalized === "yes" || normalized === "on" || normalized === "예";
  }

  return false;
}

function getIdentityReviewLabel(
  record: ParticipationReviewRecord,
  rawPayload: Record<string, unknown>,
): ParticipationReviewLabel {
  const identityMode = getText(rawPayload.identityMode, rawPayload.identity_mode);

  if (identityMode === "identified") {
    return "확인정보 있음";
  }

  if (identityMode === "anonymous") {
    return "익명";
  }

  if (identityMode === "legacy_unidentified") {
    return "기존기록/확인정보 미입력";
  }

  if (identityMode === "legacy_identified") {
    return "기존기록/제출자 표시 있음";
  }

  if (getBoolean(record.anonymous) || getText(record.submitter) === "익명") {
    return "익명";
  }

  const submitter = getText(record.submitter, rawPayload.workerName, rawPayload.worker_name);

  if (!submitter || submitter === "미입력" || submitter === "익명" || submitter === "제출자 미입력") {
    return "기존기록/확인정보 미입력";
  }

  return "기존기록/제출자 표시 있음";
}

function hasFiles(record: ParticipationReviewRecord) {
  const fileCollections = [record.file_urls, record.fileUrls, record.files];
  const hasFileCollection = fileCollections.some(
    (value) => Array.isArray(value) && value.length > 0,
  );
  const singleFile = getText(record.file_url, record.fileUrl);

  return hasFileCollection || Boolean(singleFile);
}

function isMonthlyReportCandidate(params: {
  confirmationType: string;
  entryIntent: string;
  submissionType: string;
  status: string;
}) {
  const normalizedType = compact(params.submissionType);
  const normalizedStatus = compact(params.status);

  return (
    params.confirmationType === "worker_report" ||
    params.entryIntent === "report" ||
    ["위험제보", "위험요인제보", "아차사고", "개선제안", "개선의견"].some(
      (type) => normalizedType.includes(type),
    ) ||
    ["조치필요", "조치완료"].some((status) => normalizedStatus.includes(status))
  );
}

export function buildParticipationReviewLabels(
  record: ParticipationReviewRecord,
): ParticipationReviewLabel[] {
  const rawPayload =
    asObject(record.raw_payload) ??
    asObject(record.rawPayload) ??
    Object.create(null);
  const confirmationType = getText(
    record.confirmationType,
    record.confirmation_type,
    rawPayload.confirmationType,
    rawPayload.confirmation_type,
  );
  const confirmationStatus = getText(
    record.confirmationStatus,
    record.confirmation_status,
    rawPayload.confirmationStatus,
    rawPayload.confirmation_status,
  );
  const entryIntent = getText(
    record.entryIntent,
    record.entry_intent,
    rawPayload.entryIntent,
    rawPayload.entry_intent,
  );
  const submissionType = getText(
    record.submissionType,
    record.submission_type,
    record.legacyType,
    record.legacy_type,
    record.type,
  );
  const status = getText(record.status);
  const labels: ParticipationReviewLabel[] = [];

  if (confirmationType === "risk_share_confirm") {
    labels.push(
      confirmationStatus === "confirmed" ? "공유확인 후보" : "확인 필요",
    );
  }

  if (confirmationType === "worker_report") {
    labels.push("신규 제보");
  }

  if (entryIntent === "report") {
    labels.push("제보 의도");
  }

  if (hasFiles(record)) {
    labels.push("사진 있음");
  }

  labels.push(getIdentityReviewLabel(record, rawPayload));

  if (
    isMonthlyReportCandidate({
      confirmationType,
      entryIntent,
      submissionType,
      status,
    })
  ) {
    labels.push("월간보고서 후보");
  }

  return labels;
}
