import Link from "next/link";

import { buildParticipationReviewLabels, type ParticipationReviewLabel } from "@/lib/participationReviewLabels";
import { riskShareLinkCopy } from "@/lib/risk-share-link/copy";
import {
  TenantRequiredError,
  UnknownCompanyError,
  getCompanyConfig,
} from "@/lib/company";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const FIELD_VOICE_STATUS_OPTIONS = ["접수", "검토중", "조치필요", "조치완료", "반려"];

type NotionProperty = {
  type?: string;
  title?: Array<{ plain_text?: string }>;
  rich_text?: Array<{ plain_text?: string }>;
  select?: { name?: string | null } | null;
  status?: { name?: string | null } | null;
  checkbox?: boolean;
  date?: { start?: string | null } | null;
  files?: Array<{
    name?: string;
    type?: "external" | "file" | string;
    external?: { url?: string };
    file?: { url?: string };
  }>;
};

type NotionPage = {
  id: string;
  url?: string;
  created_time?: string;
  properties?: Record<string, NotionProperty>;
};

type FieldVoiceRow = {
  id: string;
  notionUrl?: string;
  title: string;
  type: string;
  status: string;
  reportedDate: string;
  location: string;
  submitter: string;
  anonymous?: boolean;
  content: string;
  actionMemo?: string;
  actionHistory?: string;
  actionAuthor?: string;
  actionCreatedAt?: string;
  actionUpdatedAt?: string;
  riskCheck?: boolean;
  riskAssessmentCheck?: boolean;
  safetyMeasureCheck?: boolean;
  files: Array<{ name: string; url: string }>;
  confirmationType?: string;
  confirmationStatus?: string;
  entryIntent?: string;
  rawPayload?: Record<string, unknown>;
};

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

function compactLabel(value: string) {
  return value.replace(/\s+/g, "").trim();
}

function normalizeVoiceType(value: string) {
  const compact = compactLabel(value);

  if (compact.includes("공유확인") || compact.includes("주지확인")) return "공유확인";
  if (compact.includes("위험제보") || compact.includes("위험요인제보") || compact.includes("위험신고")) return "위험제보";
  if (compact.includes("아차사고")) return "아차사고";
  if (compact.includes("개선제안") || compact.includes("개선의견")) return "개선제안";
  if (compact.includes("기타")) return "기타";

  return value || "공유확인";
}

function normalizeVoiceStatus(value: string) {
  const compact = compactLabel(value);
  const lower = value.trim().toLowerCase();

  if (lower === "to do") return "접수";
  if (lower === "in progress") return "검토중";
  if (lower === "done") return "조치완료";

  if (compact.includes("반려") || compact.includes("보류")) return "반려";
  if (compact.includes("조치완료") || compact === "완료" || compact.includes("처리완료")) return "조치완료";
  if (compact.includes("조치필요") || compact.includes("미조치") || compact.includes("보완필요") || compact.includes("미완료")) return "조치필요";
  if (compact.includes("검토중") || compact.includes("검토")) return "검토중";
  if (compact.includes("접수")) return "접수";

  return value || "상태 미지정";
}

function isAcknowledgementRow(row: FieldVoiceRow) {
  return normalizeVoiceType(row.type) === "공유확인";
}

function isActionNeededRow(row: FieldVoiceRow) {
  if (isAcknowledgementRow(row)) return false;

  const status = normalizeVoiceStatus(row.status);
  return status === "검토중" || status === "조치필요";
}

function getProp(
  properties: Record<string, NotionProperty>,
  names: string[]
): NotionProperty | undefined {
  for (const name of names) {
    if (properties[name]) return properties[name];
  }

  const compactNames = names.map(compactLabel);
  const matchedKey = Object.keys(properties).find((key) =>
    compactNames.includes(compactLabel(key))
  );

  return matchedKey ? properties[matchedKey] : undefined;
}

function getTitleText(prop: NotionProperty | undefined) {
  return prop?.title?.map((item) => item.plain_text ?? "").join("").trim() ?? "";
}

function getRichText(prop: NotionProperty | undefined) {
  return prop?.rich_text?.map((item) => item.plain_text ?? "").join("").trim() ?? "";
}

function getSelectName(prop: NotionProperty | undefined) {
  return prop?.select?.name?.trim() || prop?.status?.name?.trim() || "";
}

function getDateStart(prop: NotionProperty | undefined) {
  return prop?.date?.start?.trim() ?? "";
}

function getCheckboxValue(prop: NotionProperty | undefined) {
  if (typeof prop?.checkbox === "boolean") return prop.checkbox;
  return undefined;
}

function getFiles(prop: NotionProperty | undefined) {
  return (
    prop?.files
      ?.map((file) => ({
        name: file.name || "첨부파일",
        url: file.external?.url || file.file?.url || "",
      }))
      .filter((file) => file.url) ?? []
  );
}

function getPropertyText(prop: NotionProperty | undefined) {
  return getTitleText(prop) || getRichText(prop) || getSelectName(prop);
}

function getInlineMetadata(content: string, label: string) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return content.match(new RegExp(`^\\s*-?\\s*${escapedLabel}\\s*:\\s*(.+?)\\s*$`, "m"))?.[1]?.trim() ?? "";
}

function parseRawPayload(value: string) {
  if (!value) return undefined;

  try {
    const parsed = JSON.parse(value);
    return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}

function truncateText(text: string, maxLength = 180) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

function formatDateLabel(value: string) {
  if (!value) return "날짜 미입력";
  return value.slice(0, 10);
}

function formatCheckLabel(value: boolean | undefined) {
  if (value === true) return "확인";
  if (value === false) return "미확인";
  return "필드 없음";
}

function getCheckClassName(value: boolean | undefined) {
  if (value === true) return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (value === false) return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-slate-200 bg-slate-50 text-slate-500";
}

async function resolveDataSourceId(notionApiKey: string, rawId: string) {
  const formattedId = formatNotionUuid(rawId);

  const response = await fetch(`https://api.notion.com/v1/databases/${formattedId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${notionApiKey}`,
      "Notion-Version": "2025-09-03",
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return formattedId;
  }

  const database = await response.json();
  return database?.data_sources?.[0]?.id ?? formattedId;
}

async function queryNotionRows(params: {
  notionApiKey: string;
  rawDbId: string;
}): Promise<NotionPage[]> {
  const formattedDbId = formatNotionUuid(params.rawDbId);
  const dataSourceId = await resolveDataSourceId(params.notionApiKey, params.rawDbId);

  const queryBodies = [
    {
      page_size: 20,
      sorts: [{ property: "등록일", direction: "descending" }],
    },
    {
      page_size: 20,
      sorts: [{ property: "일시", direction: "descending" }],
    },
    {
      page_size: 20,
    },
  ];

  const endpoints = [
    {
      url: `https://api.notion.com/v1/data_sources/${dataSourceId}/query`,
      version: "2025-09-03",
    },
    {
      url: `https://api.notion.com/v1/databases/${formattedDbId}/query`,
      version: "2022-06-28",
    },
  ];

  for (const endpoint of endpoints) {
    for (const body of queryBodies) {
      const response = await fetch(endpoint.url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${params.notionApiKey}`,
          "Notion-Version": endpoint.version,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        cache: "no-store",
      });

      if (response.ok) {
        const data = await response.json();
        return (data?.results ?? []) as NotionPage[];
      }
    }
  }

  throw new Error("FIELD_VOICE_QUERY_FAILED");
}

function toFieldVoiceRow(page: NotionPage): FieldVoiceRow {
  const properties = page.properties ?? {};

  const titleProp = getProp(properties, ["의견 제목", "제보 제목", "의견제목", "제목", "Name", "이름"]);
  const typeProp = getProp(properties, ["의견 유형", "의견유형", "제보유형", "제보 유형", "유형", "분류"]);
  const statusProp = getProp(properties, ["처리상태", "처리상태_기존", "처리 상태", "상태"]);
  const dateProp = getProp(properties, ["등록일", "등록일시", "일시", "발생/확인일", "작성일", "날짜"]);
  const locationProp = getProp(properties, ["위치/구역", "작업/위치", "위치", "구역"]);
  const submitterProp = getProp(properties, ["제출자", "작성자", "이름", "성명"]);
  const anonymousProp = getProp(properties, ["익명", "익명 제출"]);
  const contentProp = getProp(properties, ["내용", "제보 내용", "상세 내용", "상세내용", "의견 내용"]);
  const memoProp = getProp(properties, ["조치 메모", "처리 메모", "관리자 메모", "검토 메모", "조치내용", "조치 내용"]);
  const actionHistoryProp = getProp(properties, ["조치 이력", "처리 이력", "관리자 조치 이력", "검토 이력"]);
  const actionAuthorProp = getProp(properties, ["조치 메모 작성자", "조치메모 작성자", "처리자", "검토자", "관리자"]);
  const actionCreatedAtProp = getProp(properties, ["조치 메모 작성일시", "조치메모 작성일시", "처리일시", "검토일시"]);
  const actionUpdatedAtProp = getProp(properties, ["최종 조치 변경일시", "최종조치변경일시", "처리상태 변경일시", "최종 처리일시"]);
  const fileProp = getProp(properties, ["사진/파일", "사진/첨부", "첨부", "첨부파일", "파일", "사진"]);
  const confirmationTypeProp = getProp(properties, ["confirmationType", "confirmation_type", "확인 유형", "확인유형"]);
  const confirmationStatusProp = getProp(properties, ["confirmationStatus", "confirmation_status", "확인 상태", "확인상태"]);
  const entryIntentProp = getProp(properties, ["entryIntent", "entry_intent", "진입 의도", "진입의도"]);
  const rawPayloadProp = getProp(properties, ["raw_payload", "rawPayload"]);

  const title = getTitleText(titleProp) || getRichText(titleProp) || "현장참여 기록";
  const content = getRichText(contentProp);
  const rawPayload = parseRawPayload(getPropertyText(rawPayloadProp));

  return {
    id: page.id,
    notionUrl: page.url,
    title,
    type: normalizeVoiceType(getSelectName(typeProp) || "공유확인"),
    status: normalizeVoiceStatus(getSelectName(statusProp) || "상태 미지정"),
    reportedDate: getDateStart(dateProp) || page.created_time || "",
    location: getRichText(locationProp) || "위치 미입력",
    submitter: getRichText(submitterProp) || "제출자 미입력",
    anonymous: getCheckboxValue(anonymousProp),
    content: content || "내용 없음",
    actionMemo: getRichText(memoProp),
    riskCheck: getCheckboxValue(getProp(properties, ["위험요인 확인"])),
    riskAssessmentCheck: getCheckboxValue(getProp(properties, ["위험성평가 공유 확인"])),
    safetyMeasureCheck: getCheckboxValue(getProp(properties, ["안전조치 확인"])),
    files: getFiles(fileProp),
    confirmationType: getPropertyText(confirmationTypeProp) || getInlineMetadata(content, "확인 유형"),
    confirmationStatus: getPropertyText(confirmationStatusProp) || getInlineMetadata(content, "확인 상태"),
    entryIntent: getPropertyText(entryIntentProp) || getInlineMetadata(content, "진입 의도"),
    rawPayload,
  };
}

function StatusBadge({ status }: { status: string }) {
  const isDone = status.includes("완료");
  const isActionNeeded = status.includes("조치필요");
  const isProgress = status.includes("검토") || status.includes("진행");
  const className = isDone
    ? "bg-emerald-100 text-emerald-800"
    : isActionNeeded
      ? "bg-amber-100 text-amber-900"
      : isProgress
        ? "bg-blue-100 text-blue-800"
        : "bg-slate-100 text-slate-700";

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${className}`}>
      {status}
    </span>
  );
}

const PARTICIPATION_REVIEW_LABEL_CLASS_NAMES: Record<ParticipationReviewLabel, string> = {
  "공유확인 후보": "border-emerald-200 bg-emerald-50 text-emerald-800",
  "확인 필요": "border-amber-200 bg-amber-50 text-amber-900",
  "신규 제보": "border-red-200 bg-red-50 text-red-800",
  "제보 의도": "border-orange-200 bg-orange-50 text-orange-800",
  "사진 있음": "border-purple-200 bg-purple-50 text-purple-800",
  "익명": "border-slate-300 bg-slate-100 text-slate-700",
  "월간보고서 후보": "border-blue-200 bg-blue-50 text-blue-800",
};

function ParticipationReviewBadges({ row }: { row: FieldVoiceRow }) {
  const labels = buildParticipationReviewLabels({
    confirmationType: row.confirmationType,
    confirmationStatus: row.confirmationStatus,
    entryIntent: row.entryIntent,
    type: row.type,
    status: row.status,
    files: row.files,
    anonymous: row.anonymous,
    submitter: row.submitter,
    rawPayload: row.rawPayload,
  });

  if (labels.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2" aria-label="운영 분류 후보">
      {labels.map((label) => (
        <span
          key={label}
          className={`rounded-full border px-3 py-1 text-xs font-black ${PARTICIPATION_REVIEW_LABEL_CLASS_NAMES[label]}`}
        >
          {label}
        </span>
      ))}
    </div>
  );
}

function CheckPill({ label, value }: { label: string; value: boolean | undefined }) {
  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-black ${getCheckClassName(value)}`}>
      {label}: {formatCheckLabel(value)}
    </span>
  );
}

function EmptyState() {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
      <p className="text-lg font-black text-slate-900">아직 접수된 현장 의견이 없습니다.</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        근로자·협력사가 회사코드가 포함된 현장참여 QR로 위험요인, 아차사고, 개선의견을 제출하면 이곳에 표시됩니다.
      </p>
      <Link
        href="/home"
        className="mt-5 inline-flex rounded-2xl bg-blue-700 px-5 py-3 text-sm font-black text-white"
      >
        운영 홈으로 돌아가기
      </Link>
    </section>
  );
}

function ErrorState() {
  return (
    <section className="rounded-3xl border border-red-200 bg-red-50 p-6 shadow-sm">
      <p className="text-lg font-black text-red-900">현장 의견을 불러오지 못했습니다.</p>
      <p className="mt-2 text-sm leading-6 text-red-800">
        Notion 현장 의견 DB 설정, API 권한, 데이터소스 연결 상태를 확인해 주세요.
      </p>
    </section>
  );
}

function FieldVoiceCard({ row }: { row: FieldVoiceRow }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={row.status} />
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
              {row.type}
            </span>
            {row.files.length > 0 ? (
              <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-black text-purple-800">
                첨부 {row.files.length}개
              </span>
            ) : null}
          </div>

          <ParticipationReviewBadges row={row} />
          <h2 className="mt-3 text-xl font-black text-slate-950">{row.title}</h2>
        </div>

        <div className="text-left text-xs font-bold text-slate-500 sm:text-right">
          <p>{formatDateLabel(row.reportedDate)}</p>
          {row.notionUrl ? (
            <a
              href={row.notionUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex text-blue-700 underline"
            >
              Notion 원본
            </a>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
          <p className="text-xs font-black text-slate-500">위치/구역</p>
          <p className="mt-1 text-sm font-bold text-slate-900">{row.location}</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
          <p className="text-xs font-black text-slate-500">제출자</p>
          <p className="mt-1 text-sm font-bold text-slate-900">
            {row.anonymous ? "익명" : row.submitter}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
          <p className="text-xs font-black text-slate-500">처리상태</p>
          <p className="mt-1 text-sm font-bold text-slate-900">{row.status}</p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-3">
        <p className="text-xs font-black text-slate-500">내용</p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">
          {truncateText(row.content, 260)}
        </p>
      </div>

      {row.actionMemo ? (
        <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-3">
          <p className="text-xs font-black text-blue-700">관리자 조치 메모</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-blue-950">
            {row.actionMemo}
          </p>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <CheckPill label="위험요인 확인" value={row.riskCheck} />
        <CheckPill label="위험성평가 공유 확인" value={row.riskAssessmentCheck} />
        <CheckPill label="안전조치 확인" value={row.safetyMeasureCheck} />
      </div>

      <form
        action="/api/field/voice/status"
        method="post"
        className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3"
      >
        <input type="hidden" name="pageId" value={row.id} />
        <input type="hidden" name="actionAuthor" value="SafeMetrica 관리자" />
        <label htmlFor={`memo-${row.id}`} className="text-xs font-black text-slate-500">
          관리자 검토 / 조치 메모
        </label>
        <textarea
          id={`memo-${row.id}`}
          name="memo"
          rows={3}
          defaultValue={row.actionMemo ?? ""}
          placeholder={riskShareLinkCopy.manager.actionMemoPlaceholder}
          className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
        />
        <p className="mt-2 text-xs font-bold leading-5 text-slate-500">
          공유확인은 근로자 확인 기록이며 조치완료 성과로 집계하지 않습니다. 위험제보·아차사고·개선제안은
          현장 확인 결과와 필요한 조치 내용을 남겨 주세요.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {FIELD_VOICE_STATUS_OPTIONS.map((nextStatus) => (
            <button
              key={nextStatus}
              type="submit"
              name="status"
              value={nextStatus}
              disabled={row.status === nextStatus}
              className="rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:border-blue-200 disabled:bg-blue-100 disabled:text-blue-800"
            >
              {row.status === nextStatus ? `현재: ${nextStatus}` : nextStatus}
            </button>
          ))}
        </div>
      </form>

      {row.files.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-purple-100 bg-purple-50 p-3">
          <p className="text-xs font-black text-purple-800">사진/파일</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {row.files.map((file) => (
              <a
                key={file.url}
                href={file.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-white px-3 py-2 text-xs font-black text-purple-800 underline"
              >
                {file.name}
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function VoiceSection({
  title,
  description,
  rows,
  emptyText,
  badgeClassName,
}: {
  title: string;
  description: string;
  rows: FieldVoiceRow[];
  emptyText: string;
  badgeClassName: string;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-950">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
        </div>
        <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-black ${badgeClassName}`}>
          {rows.length}건
        </span>
      </div>

      <div className="mt-4 space-y-4">
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-500">
            {emptyText}
          </div>
        ) : (
          rows.map((row) => <FieldVoiceCard key={row.id} row={row} />)
        )}
      </div>
    </section>
  );
}

export default async function FieldVoiceReviewPage() {
  let company;

  try {
    company = await getCompanyConfig();
  } catch (error) {
    if (error instanceof TenantRequiredError) {
      return (
        <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900">
          <div className="mx-auto max-w-5xl">
            <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
              <p className="text-lg font-black text-amber-900">고객사 선택이 필요합니다.</p>
              <p className="mt-2 text-sm leading-6 text-amber-800">
                고객사 운영 홈에서 접속한 뒤 현장참여 검토 화면을 다시 열어주세요.
              </p>
              <Link
                href="/login?error=tenant_required"
                className="mt-5 inline-flex rounded-2xl bg-amber-700 px-5 py-3 text-sm font-black text-white"
              >
                고객사 선택하기
              </Link>
            </section>
          </div>
        </main>
      );
    }

    if (error instanceof UnknownCompanyError) {
      return (
        <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900">
          <div className="mx-auto max-w-5xl">
            <ErrorState />
          </div>
        </main>
      );
    }

    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900">
        <div className="mx-auto max-w-5xl">
          <ErrorState />
        </div>
      </main>
    );
  }

  let rows: FieldVoiceRow[] = [];
  let hasError = false;

  if (company.fieldVoiceDbId) {
    try {
      const notionRows = await queryNotionRows({
        notionApiKey: company.notionApiKey,
        rawDbId: company.fieldVoiceDbId,
      });
      rows = notionRows.map(toFieldVoiceRow);
    } catch {
      hasError = true;
    }
  } else {
    hasError = true;
  }

  const acknowledgementRows = rows.filter(isAcknowledgementRow);
  const actionNeededRows = rows.filter(isActionNeededRow);
  const reviewRequiredRows = rows.filter(
    (row) => !isAcknowledgementRow(row) && !isActionNeededRow(row)
  );

  const uncheckedCount = rows.filter(
    (row) =>
      row.riskCheck === false ||
      row.riskAssessmentCheck === false ||
      row.safetyMeasureCheck === false
  ).length;

  const fieldWorkerParticipationPath = `/field/participation?company=${encodeURIComponent(company.code)}`;
  const fieldWorkerParticipationUrl = `https://safe-metrica.vercel.app${fieldWorkerParticipationPath}`;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-black text-blue-700">SafeMetrica 현장참여</p>
              <h1 className="mt-2 text-2xl font-black text-slate-950">현장참여 접수함</h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {riskShareLinkCopy.manager.guide} 공유확인은 조치완료 KPI와 분리해 확인합니다.
              </p>
            </div>

            <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm">
              <p className="font-black text-blue-900">{company.name}</p>
              <p className="mt-1 whitespace-nowrap text-blue-700">최근 접수 {rows.length}건</p>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-3xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
          <p className="text-sm font-black text-blue-900">Risk Share Link 운영 기준</p>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-white p-3">
              <p className="text-xs font-black text-emerald-700">공유확인</p>
              <p className="mt-1 text-sm font-bold leading-6 text-slate-700">
                위험성평가와 안전조치 내용을 확인한 기록입니다. 조치완료 KPI에는 포함하지 않습니다.
              </p>
            </div>
            <div className="rounded-2xl bg-white p-3">
              <p className="text-xs font-black text-blue-700">관리자 검토대상</p>
              <p className="mt-1 text-sm font-bold leading-6 text-slate-700">
                위험제보·아차사고·개선제안은 현장 확인 후 처리상태와 조치 메모를 남깁니다.
              </p>
            </div>
            <div className="rounded-2xl bg-white p-3">
              <p className="text-xs font-black text-amber-700">조치 필요</p>
              <p className="mt-1 text-sm font-bold leading-6 text-slate-700">
                조치필요·검토중·미조치 항목은 후속 확인 대상으로 관리합니다.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black text-emerald-700">현장근로자 QR 링크</p>
              <h2 className="mt-2 text-xl font-black text-slate-950">
                {company.name} 근로자 안전참여 링크
              </h2>
              <p className="mt-2 text-sm leading-6 text-emerald-900">
                이 링크는 근로자가 위험성평가 공유확인, 위험제보, 아차사고, 개선제안을 제출하는
                공개 QR용 링크입니다. 관리자 접수함과 원본 DB 관리 화면은 분리해 사용하세요.
              </p>
            </div>

            <a
              href={fieldWorkerParticipationPath}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-emerald-600"
            >
              근로자 화면 열기
            </a>
          </div>

          <div className="mt-4 rounded-2xl border border-emerald-200 bg-white p-4">
            <p className="text-xs font-black text-emerald-700">QR 생성용 주소</p>
            <code className="mt-2 block break-all rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-emerald-100">
              {fieldWorkerParticipationUrl}
            </code>
          </div>
        </section>

        <section className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
            <p className="text-xs font-black text-emerald-700">공유확인 기록 · KPI 제외</p>
            <p className="mt-2 text-2xl font-black text-emerald-950">{acknowledgementRows.length}</p>
          </div>
          <div className="rounded-3xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
            <p className="text-xs font-black text-blue-700">관리자 검토대상</p>
            <p className="mt-2 text-2xl font-black text-blue-950">{reviewRequiredRows.length}</p>
          </div>
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <p className="text-xs font-black text-amber-700">조치 필요 / 미조치</p>
            <p className="mt-2 text-2xl font-black text-amber-950">{actionNeededRows.length}</p>
          </div>
        </section>

        <section className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-black text-slate-500">사진/파일 있음</p>
            <p className="mt-2 text-2xl font-black text-slate-950">
              {rows.filter((row) => row.files.length > 0).length}
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-black text-slate-500">확인 체크 미완료 포함</p>
            <p className="mt-2 text-2xl font-black text-slate-950">{uncheckedCount}</p>
          </div>
        </section>

        <section className="mt-4 rounded-3xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <p className="text-sm font-black text-amber-900">관리자 검토 / 조치 메모 v1</p>
          <p className="mt-2 text-sm leading-6 text-amber-900">
            현재는 접수함 분류와 처리상태 변경, 조치 메모 저장까지 처리합니다. 공유확인은 조치완료 성과와
            분리하고, 담당자 지정·완료사진·위험성평가 반영 후보 연결은 후속 단계에서 분리 구현합니다.
          </p>
        </section>

        <div className="mt-5 space-y-5">
          {hasError ? (
            <ErrorState />
          ) : rows.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <VoiceSection
                title="공유확인 기록"
                description="의견 없이 위험요인·위험성평가·안전조치 확인만 완료한 주지확인 기록입니다. 조치완료 KPI에는 포함하지 않습니다."
                rows={acknowledgementRows}
                emptyText="공유확인 기록이 아직 없습니다."
                badgeClassName="bg-emerald-100 text-emerald-800"
              />

              <VoiceSection
                title="검토 필요 접수"
                description="위험제보·아차사고·개선제안 중 관리자 확인이 필요한 항목입니다. 현장 확인 후 처리상태와 조치 메모를 남겨 주세요."
                rows={reviewRequiredRows}
                emptyText="검토할 현장 제보가 없습니다."
                badgeClassName="bg-blue-100 text-blue-800"
              />

              <VoiceSection
                title="조치 필요 / 미조치"
                description="위험제보·아차사고·개선제안 중 현장 조치 또는 추가 확인이 필요한 항목입니다."
                rows={actionNeededRows}
                emptyText="현재 조치 필요로 분류된 현장 제보가 없습니다."
                badgeClassName="bg-amber-100 text-amber-900"
              />
            </>
          )}
        </div>
      </div>
    </main>
  );
}
