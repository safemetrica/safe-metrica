export type NotionProperties = Record<string, any>;

export function getTextPropPlainText(prop: any): string {
  if (!prop) return "";

  if (prop.type === "title") {
    return prop.title?.map((t: any) => t.plain_text).join("") ?? "";
  }

  if (prop.type === "rich_text") {
    return prop.rich_text?.map((t: any) => t.plain_text).join("") ?? "";
  }

  if (prop.type === "select") {
    return prop.select?.name ?? "";
  }

  if (prop.type === "status") {
    return prop.status?.name ?? "";
  }

  if (prop.type === "date") {
    return prop.date?.start ?? "";
  }

  if (prop.type === "checkbox") {
    return prop.checkbox ? "Y" : "";
  }

  if (prop.type === "number") {
    return String(prop.number ?? "");
  }

  return "";
}

export function getCheckboxPropValue(prop: any): boolean {
  if (!prop) return false;
  if (prop.type === "checkbox") return Boolean(prop.checkbox);
  return false;
}

export function getRelationCount(prop: any): number {
  if (!prop) return 0;
  if (prop.type === "relation") return prop.relation?.length ?? 0;
  return 0;
}

export function getTbmSpecialText(props: NotionProperties): string {
  return (
    getTextPropPlainText(props["특이사항내용"]) ||
    getTextPropPlainText(props["특이사항 내용"]) ||
    getTextPropPlainText(props["보완내용"]) ||
    getTextPropPlainText(props["보완 내용"]) ||
    ""
  ).trim();
}

export function hasTbmSpecialIssue(props: NotionProperties): boolean {
  // 특이사항 카운트는 체크박스 기준만 사용한다.
  // 특이사항 내용/보완 내용/오늘주의사항은 참고 텍스트이며 카운트에 포함하지 않는다.
  return (
    getCheckboxPropValue(props["특이사항"]) ||
    getCheckboxPropValue(props["특이사항 있음"])
  );
}

export function getTbmActionStatus(props: NotionProperties): string {
  // EB 필요 여부는 반드시 조치상태 전용 필드만 본다.
  // 일반 "상태" 필드는 교육/진단/화면 상태와 섞일 수 있으므로 사용하지 않는다.
  return (
    getTextPropPlainText(props["조치상태"]) ||
    getTextPropPlainText(props["조치 상태"]) ||
    ""
  ).trim();
}

export function needsTbmEvidenceBook(props: NotionProperties): boolean {
  const actionStatus = getTbmActionStatus(props);
  return /조치 필요|보완 필요|미조치|미완료/i.test(actionStatus);
}

export function hasLinkedEvidenceBook(props: NotionProperties): boolean {
  return getRelationCount(props["연결EB"]) > 0 || getRelationCount(props["관련 EB"]) > 0;
}
