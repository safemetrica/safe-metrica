import "server-only";

export type ContractorSubmissionRecord = {
  id: string;
  title: string;
  tenantCode: string;
  principalCode: string;
  contractorCode: string;
  submissionItemId: string;
  itemType: string;
  workDate: string;
  workName: string;
  siteArea: string;
  submitterName: string;
  contact: string;
  submissionContent: string;
  evidenceMemo: string;
  submissionStatus: string;
  principalReviewStatus: string;
  createdTime?: string;
  lastEditedTime?: string;
};

type NotionProperty = {
  title?: Array<{ plain_text?: string }>;
  rich_text?: Array<{ plain_text?: string }>;
  select?: { name?: string };
  date?: { start?: string };
  phone_number?: string;
};

type NotionPage = {
  id: string;
  created_time?: string;
  last_edited_time?: string;
  properties?: Record<string, NotionProperty>;
};

function getTitle(prop: NotionProperty | undefined) {
  return prop?.title?.map((item) => item.plain_text ?? "").join("").trim() ?? "";
}

function getText(prop: NotionProperty | undefined) {
  return prop?.rich_text?.map((item) => item.plain_text ?? "").join("").trim() ?? "";
}

function getSelect(prop: NotionProperty | undefined) {
  return prop?.select?.name?.trim() ?? "";
}

function getDate(prop: NotionProperty | undefined) {
  return prop?.date?.start ?? "";
}

function getPhone(prop: NotionProperty | undefined) {
  return prop?.phone_number ?? "";
}

function normalizeNotionId(rawId: string) {
  return rawId.trim().replace(/^collection:\/\//, "").replace(/-/g, "");
}

function formatNotionUuid(rawId: string) {
  const normalized = normalizeNotionId(rawId);

  if (/^[0-9a-fA-F]{32}$/.test(normalized)) {
    return [
      normalized.slice(0, 8),
      normalized.slice(8, 12),
      normalized.slice(12, 16),
      normalized.slice(16, 20),
      normalized.slice(20),
    ].join("-");
  }

  return rawId.trim();
}

function mapSubmissionPage(page: NotionPage): ContractorSubmissionRecord {
  const props = page.properties ?? {};

  return {
    id: page.id,
    title: getTitle(props["제출명"]) || "몬스 제출자료",
    tenantCode: getText(props["tenantCode"]),
    principalCode: getText(props["principalCode"]),
    contractorCode: getText(props["contractorCode"]),
    submissionItemId: getText(props["submissionItemId"]),
    itemType: getSelect(props["제출항목"]),
    workDate: getDate(props["작업일"]),
    workName: getText(props["작업명"]),
    siteArea: getText(props["현장/구역"]),
    submitterName: getText(props["제출자"]),
    contact: getPhone(props["연락처"]),
    submissionContent: getText(props["제출내용"]),
    evidenceMemo: getText(props["증빙메모"]),
    submissionStatus: getSelect(props["제출상태"]) || "제출완료",
    principalReviewStatus: getSelect(props["원청검토상태"]) || "미검토",
    createdTime: page.created_time,
    lastEditedTime: page.last_edited_time,
  };
}

export async function fetchContractorSubmissionRecords() {
  const notionApiKey = process.env.NOTION_API_KEY;
  const rawDatabaseId = process.env.NOTION_CONTRACTOR_SUBMISSIONS_DB_ID;
  const dataSourceId = rawDatabaseId ? formatNotionUuid(rawDatabaseId) : "";

  if (!notionApiKey || !dataSourceId) {
    return {
      configured: false,
      records: [] as ContractorSubmissionRecord[],
      errorMessage: "",
    };
  }

  const response = await fetch(`https://api.notion.com/v1/data_sources/${dataSourceId}/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${notionApiKey}`,
      "Notion-Version": "2025-09-03",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sorts: [
        {
          timestamp: "created_time",
          direction: "descending",
        },
      ],
      page_size: 25,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    return {
      configured: true,
      records: [] as ContractorSubmissionRecord[],
      errorMessage: `${response.status} ${text.slice(0, 160)}`,
    };
  }

  const data = await response.json();

  // LEGACY:
  // 과거 버블몬 원청·몬스 협력사 제출 모듈 확인용 필터입니다.
  // 최신 운영 기준에서 몬스는 독립 테넌트이며, 신규 운영 동선은 현장참여/TBM 중심입니다.
  const records = ((data?.results ?? []) as NotionPage[])
    .map(mapSubmissionPage)
    .filter((record) => record.tenantCode === "bubblemon" && record.contractorCode === "mons");

  return {
    configured: true,
    records,
    errorMessage: "",
  };
}

export function getContractorSubmissionRecordSummary(records: ContractorSubmissionRecord[]) {
  const total = records.length;
  const submittedCount = records.filter((record) => record.submissionStatus === "제출완료").length;
  const principalPendingCount = records.filter((record) =>
    record.principalReviewStatus === "미검토" ||
    record.principalReviewStatus === "검토중" ||
    !record.principalReviewStatus
  ).length;
  const principalConfirmedCount = records.filter((record) => record.principalReviewStatus === "확인").length;
  const followUpCount = records.filter((record) => record.principalReviewStatus === "보완요청").length;

  return {
    total,
    submittedCount,
    principalPendingCount,
    principalConfirmedCount,
    followUpCount,
  };
}

export function extractEvidenceUrls(evidenceMemo: string) {
  const urlPattern = /https?:\/\/[^\s]+/g;
  const urls = evidenceMemo.match(urlPattern) ?? [];

  return urls.map((url) => ({
    url,
    fileName: decodeURIComponent(url.split("/").pop() ?? "첨부파일").split("?")[0],
  }));
}

export function getEvidenceMemoWithoutUrls(evidenceMemo: string) {
  return evidenceMemo
    .split("\n")
    .filter((line) => !line.includes("http://") && !line.includes("https://"))
    .join("\n")
    .trim();
}

