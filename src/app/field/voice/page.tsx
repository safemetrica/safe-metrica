import Link from "next/link";

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
  riskCheck?: boolean;
  riskAssessmentCheck?: boolean;
  safetyMeasureCheck?: boolean;
  files: Array<{ name: string; url: string }>;
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

function getProp(
  properties: Record<string, NotionProperty>,
  names: string[]
): NotionProperty | undefined {
  for (const name of names) {
    if (properties[name]) return properties[name];
  }

  return undefined;
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

  const titleProp = getProp(properties, ["의견 제목", "제목", "Name", "이름"]);
  const typeProp = getProp(properties, ["의견 유형", "유형", "분류"]);
  const statusProp = getProp(properties, ["처리상태", "상태"]);
  const dateProp = getProp(properties, ["등록일", "발생/확인일", "작성일", "날짜"]);
  const locationProp = getProp(properties, ["위치/구역", "위치", "구역"]);
  const submitterProp = getProp(properties, ["제출자", "작성자", "이름"]);
  const anonymousProp = getProp(properties, ["익명", "익명 제출"]);
  const contentProp = getProp(properties, ["내용", "상세 내용", "상세내용", "의견 내용"]);
  const fileProp = getProp(properties, ["사진/파일", "첨부", "첨부파일", "파일", "사진"]);

  const title = getTitleText(titleProp) || getRichText(titleProp) || "제목 없음";
  const content = getRichText(contentProp);

  return {
    id: page.id,
    notionUrl: page.url,
    title,
    type: getSelectName(typeProp) || "유형 미지정",
    status: getSelectName(statusProp) || "상태 미지정",
    reportedDate: getDateStart(dateProp) || page.created_time || "",
    location: getRichText(locationProp) || "위치 미입력",
    submitter: getRichText(submitterProp) || "제출자 미입력",
    anonymous: getCheckboxValue(anonymousProp),
    content: content || "내용 없음",
    riskCheck: getCheckboxValue(getProp(properties, ["위험요인 확인"])),
    riskAssessmentCheck: getCheckboxValue(getProp(properties, ["위험성평가 공유 확인"])),
    safetyMeasureCheck: getCheckboxValue(getProp(properties, ["안전조치 확인"])),
    files: getFiles(fileProp),
  };
}

function StatusBadge({ status }: { status: string }) {
  const isDone = status.includes("완료");
  const isProgress = status.includes("검토") || status.includes("진행");
  const className = isDone
    ? "bg-emerald-100 text-emerald-800"
    : isProgress
      ? "bg-blue-100 text-blue-800"
      : "bg-slate-100 text-slate-700";

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${className}`}>
      {status}
    </span>
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
        근로자·협력사가 현장참여 QR로 위험요인, 아차사고, 개선의견을 제출하면 이곳에 표시됩니다.
      </p>
      <Link
        href="/field/participation"
        className="mt-5 inline-flex rounded-2xl bg-blue-700 px-5 py-3 text-sm font-black text-white"
      >
        현장참여 입력 화면 보기
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

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-black text-blue-700">SafeMetrica 현장참여</p>
              <h1 className="mt-2 text-2xl font-black text-slate-950">
                현장참여 관리자 검토
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                근로자·협력사가 제출한 위험요인, 아차사고, 개선의견, 안전조치 확인 내용을
                읽기 전용으로 검토합니다. 상태 변경과 조치 완료 처리는 다음 단계에서 지원됩니다.
              </p>
            </div>

            <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm">
              <p className="font-black text-blue-900">{company.name}</p>
              <p className="mt-1 whitespace-nowrap text-blue-700">최근 접수 {rows.length}건</p>
            </div>
          </div>
        </section>

        <section className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-black text-slate-500">최근 접수</p>
            <p className="mt-2 text-2xl font-black text-slate-950">{rows.length}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-black text-slate-500">사진/파일 있음</p>
            <p className="mt-2 text-2xl font-black text-slate-950">
              {rows.filter((row) => row.files.length > 0).length}
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-black text-slate-500">미확인 포함</p>
            <p className="mt-2 text-2xl font-black text-slate-950">
              {
                rows.filter(
                  (row) =>
                    row.riskCheck === false ||
                    row.riskAssessmentCheck === false ||
                    row.safetyMeasureCheck === false
                ).length
              }
            </p>
          </div>
        </section>

        <section className="mt-4 rounded-3xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <p className="text-sm font-black text-amber-900">#202 상태 변경 v1</p>
          <p className="mt-2 text-sm leading-6 text-amber-900">
            이 화면에서는 현장참여 접수 건의 처리상태를 변경할 수 있습니다. 담당자 지정,
            조치 메모, 완료사진, 위험성평가 반영 기능은 후속 단계에서 분리 구현합니다.
          </p>
        </section>

        <div className="mt-5 space-y-4">
          {hasError ? (
            <ErrorState />
          ) : rows.length === 0 ? (
            <EmptyState />
          ) : (
            rows.map((row) => (
              <article
                key={row.id}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
              >
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

                <div className="mt-4 flex flex-wrap gap-2">
                  <CheckPill label="위험요인 확인" value={row.riskCheck} />
                  <CheckPill label="위험성평가 공유 확인" value={row.riskAssessmentCheck} />
                  <CheckPill label="안전조치 확인" value={row.safetyMeasureCheck} />
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-black text-slate-500">상태 변경</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {FIELD_VOICE_STATUS_OPTIONS.map((nextStatus) => (
                      <form key={nextStatus} action="/api/field/voice/status" method="post">
                        <input type="hidden" name="pageId" value={row.id} />
                        <input type="hidden" name="status" value={nextStatus} />
                        <button
                          type="submit"
                          disabled={row.status === nextStatus}
                          className="rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:border-blue-200 disabled:bg-blue-100 disabled:text-blue-800"
                        >
                          {row.status === nextStatus ? `현재: ${nextStatus}` : nextStatus}
                        </button>
                      </form>
                    ))}
                  </div>
                </div>

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
            ))
          )}
        </div>
      </div>
    </main>
  );
}
