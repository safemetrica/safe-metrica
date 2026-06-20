export const FOOD_FACTORY_PACK = {
  packId: "food_factory_confirmation_v1",
  companyCode: "richi",
  companyName: "㈜리치코리아",
  displayName: "㈜리치코리아 현장 전자확인·피드백",
  serviceMode: "food_factory_e_confirmation_trial",
  homeHref: "/trial/richi",
  workerHref: "/field/participation?company=richi",
  managerHref: "/trial/richi/manager",
  summaryHref: "/trial/richi/summary",
};

function compactText(value?: string | null) {
  return (value ?? "").replace(/\s+/g, "").trim();
}

export function getFoodFactorySubmissionType(row: {
  submission_type?: string | null;
  legacy_type?: string | null;
}) {
  return row.submission_type || row.legacy_type || "기타";
}

export function isFoodFactoryConfirmation(row: {
  submission_type?: string | null;
  legacy_type?: string | null;
}) {
  const type = compactText(getFoodFactorySubmissionType(row));

  return (
    type.includes("위생안전확인") ||
    type.includes("위생·안전확인") ||
    type.includes("위생확인") ||
    type.includes("공유확인") ||
    type.includes("확인완료")
  );
}

export function isFoodFactoryReviewNeededStatus(status?: string | null) {
  const value = compactText(status);

  if (!value) {
    return true;
  }

  return !(
    value.includes("조치완료") ||
    value.includes("완료") ||
    value.includes("반려") ||
    value.includes("종결")
  );
}

export function getFoodFactoryPublicTypeLabel(row: {
  submission_type?: string | null;
  legacy_type?: string | null;
}) {
  const type = compactText(getFoodFactorySubmissionType(row));

  if (type.includes("개선")) return "개선의견";
  if (type.includes("불편")) return "불편사항";
  if (type.includes("아차")) return "아차사고";
  if (type.includes("위험")) return "위험제보";
  if (isFoodFactoryConfirmation(row)) return "전자확인";

  return "기타 의견";
}
