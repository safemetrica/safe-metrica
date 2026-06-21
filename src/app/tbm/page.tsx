import { hasTbmSpecialIssue, needsTbmEvidenceBook } from "@/lib/tbmStatus";

export const dynamic = "force-dynamic";

import { SafeNav } from "@/components/SafeLayout";
import Link from "next/link";
import { getCompanyConfig } from "@/lib/company";
import TbmFormAction from "@/components/TbmFormAction";
import TbmVoiceDraftHelper from "@/components/TbmVoiceDraftHelper";
import {
  selectTbmVoiceSubmissionListRows,
  type TbmVoiceSubmissionListRow,
} from "@/lib/supabaseServer";

import { getTbmFormUrl } from "@/lib/tenantLinks";

type TbmRow = {
  id: string;
  작업명: string;
  날짜: string;
  특이사항: boolean;
  조치상태: string;
  연결EB: number;
  EB필요: boolean;
};

type NotionPageResult = {
  id: string;
  properties?: Record<
    string,
    {
      title?: Array<{ plain_text?: string }>;
      date?: { start?: string };
      select?: { name?: string };
      relation?: unknown[];
    }
  >;
};
async function getTbmRows(): Promise<TbmRow[]> {
  const apiBase = "https://api.notion.com/v1/databases";
  const company = await getCompanyConfig();

  if (company.code === "richi") {
    return [];
  }

  const res = await fetch(`${apiBase}/${company.tbmDbId}/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      page_size: 100,
      sorts: [{ property: "날짜", direction: "descending" }],
    }),
    cache: "no-store",
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Notion API error");

  return ((data.results ?? []) as NotionPageResult[]).map((page) => {
    const properties = page.properties ?? {};

    return {
      id: page.id,
      작업명: properties["작업명"]?.title?.[0]?.plain_text ?? "",
      날짜: properties["날짜"]?.date?.start ?? "",
      특이사항: hasTbmSpecialIssue(properties),
      조치상태: properties["조치 상태"]?.select?.name ?? "",
      연결EB: properties["연결 EB"]?.relation?.length ?? 0,
      EB필요: needsTbmEvidenceBook(properties),
    };
  });
}

const RICHI_RISK_TAG_PRIORITY = [
  "미끄럼",
  "절단·베임",
  "이물혼입",
  "보호구",
  "개인위생",
  "포장실",
  "냉장·냉동",
  "컨베이어·포장기",
];

const RICHI_HIDDEN_RISK_TAGS = [
  "차량 충돌",
  "후진 충돌",
  "사각지대",
  "지게차 충돌",
];

function RichiTbmTopBar() {
  const navItems = [
    { href: "/tbm", label: "TBM" },
    { href: "/home", label: "현장 홈" },
    { href: "/monthly-report", label: "월간보고서" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-teal-300/20 bg-[#0B2742] text-white shadow-lg shadow-slate-950/10">
      <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/tbm" className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-black tracking-tight text-white">
              SafeMetrica™ TBM
            </span>
            <span className="rounded-full border border-[#BDEFE0] bg-[#DDF8EE] px-2.5 py-1 text-xs font-black text-[#0B5F52]">
              리치코리아
            </span>
          </div>
        </Link>

        <nav
          className="flex shrink-0 items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1"
          aria-label="리치코리아 TBM 메뉴"
        >
          {navItems.map((item, index) => (
            <Link
              key={item.href}
              href={item.href}
              className={`relative rounded-full px-3 py-1.5 text-xs font-black transition hover:bg-white/10 sm:text-sm ${
                index === 0 ? "text-white" : "text-white/75 hover:text-white"
              }`}
            >
              {index === 0 ? (
                <span className="absolute inset-x-3 -bottom-1 h-0.5 rounded-full bg-[#16A085]" />
              ) : null}
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

function formatKstDateValue(date = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatKstDateValueFromString(value?: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return formatKstDateValue(date);
}

function formatKstTimeValue(value?: string | null) {
  if (!value) {
    return "작성 시간 미기록";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "작성 시간 미기록";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function getRichiDisplayRiskTags(
  riskTags: TbmVoiceSubmissionListRow["risk_tags"],
) {
  if (!Array.isArray(riskTags)) {
    return [];
  }

  const hiddenTags = new Set(RICHI_HIDDEN_RISK_TAGS);
  const uniqueTags = riskTags.filter(
    (tag, index, tags) =>
      tag.trim().length > 0 &&
      !hiddenTags.has(tag) &&
      tags.indexOf(tag) === index,
  );

  return uniqueTags
    .sort((a, b) => {
      const aPriority = RICHI_RISK_TAG_PRIORITY.indexOf(a);
      const bPriority = RICHI_RISK_TAG_PRIORITY.indexOf(b);
      return (
        (aPriority === -1 ? 999 : aPriority) -
        (bPriority === -1 ? 999 : bPriority)
      );
    })
    .slice(0, 4);
}

function cleanRichiTbmPreviewText(value?: string | null) {
  if (!value) {
    return "";
  }

  return value
    .split("\n")
    .map((line) =>
      line
        .replace(/^\s*\[음성 TBM 직접저장\]\s*/u, "")
        .replace(/^\s*\[작업 내용\]\s*/u, "")
        .replace(/^\s*\[TBM 음성 작성 내용\]\s*/u, "")
        .replace(/^\s*사업장:\s*리치코리아\s*/u, "")
        .trim(),
    )
    .filter(Boolean)
    .join("\n")
    .trim();
}

function getRichiTbmPreviewText(row: TbmVoiceSubmissionListRow) {
  const mainText =
    row.snapshot && typeof row.snapshot.main_text === "string"
      ? row.snapshot.main_text
      : null;

  return (
    cleanRichiTbmPreviewText(mainText) ||
    cleanRichiTbmPreviewText(row.safety_notice)
  );
}

export default async function TbmPage() {
  const company = await getCompanyConfig();
  const isRichi = company.code === "richi";
  const rows = isRichi ? [] : await getTbmRows();
  const richiRows = isRichi
    ? await selectTbmVoiceSubmissionListRows(company.code)
    : [];
  const tbmFormUrl = getTbmFormUrl(company);
  const 특이사항건수 = isRichi
    ? richiRows.filter((r) => r.has_special_issue).length
    : rows.filter((r) => r.특이사항).length;
  const EB누락 = rows.filter((r) => r.EB필요 && r.연결EB === 0).length;
  const 조치필요 = rows.filter((r) => r.조치상태 === "조치 필요").length;
  const hasTodayActionItems = EB누락 > 0 || 조치필요 > 0;
  const totalRows = isRichi ? richiRows.length : rows.length;
  const todayDate = formatKstDateValue();
  const todayRichiRows = richiRows.filter((row) => {
    if (row.date_value) {
      return row.date_value === todayDate;
    }

    return formatKstDateValueFromString(row.created_at) === todayDate;
  });
  const recentRichiRows = richiRows.slice(0, 5);
  const groupedRecentRichiRows = recentRichiRows.reduce<
    Array<{ date: string; rows: TbmVoiceSubmissionListRow[] }>
  >((groups, row) => {
    const date =
      row.date_value ??
      formatKstDateValueFromString(row.created_at) ??
      "날짜 미지정";
    const existingGroup = groups.find((group) => group.date === date);

    if (existingGroup) {
      existingGroup.rows.push(row);
    } else {
      groups.push({ date, rows: [row] });
    }

    return groups;
  }, []);

  return (
    <main
      className={`min-h-screen overflow-x-hidden pb-[calc(3rem+env(safe-area-inset-bottom))] ${
        isRichi ? "bg-[#EAF6F1] text-[#102033]" : "bg-gray-950"
      }`}
    >
      {isRichi ? <RichiTbmTopBar /> : <SafeNav />}

      <div
        className={`mx-auto w-full px-3 py-4 sm:px-6 sm:py-8 ${isRichi ? "max-w-6xl" : "max-w-4xl"}`}
      >
        {isRichi ? (
          <div className="mb-5 rounded-[2rem] border border-[#D6EDE6] bg-white p-5 shadow-sm sm:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-teal-700">
                    SafeMetrica TBM
                  </p>
                  <span className="rounded-full border border-teal-100 bg-teal-50 px-3 py-1 text-xs font-black text-teal-700">
                    리치코리아
                  </span>
                </div>
                <h1 className="mt-4 text-3xl font-black tracking-tight text-[#102033] sm:text-4xl">
                  TBM 현황
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
                  작업 전 TBM 기록을 말로 남기고, 월별 운영기록으로 정리합니다.
                </p>
                <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                  <a
                    href="#tbm-voice-draft"
                    className="inline-flex items-center justify-center rounded-full bg-[#16A085] px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-[#12806A]"
                  >
                    🎙️ 말로 TBM 작성
                  </a>
                  <a
                    href="#recent-tbm-records"
                    className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:border-teal-300 hover:text-teal-700"
                  >
                    작성내역 확인
                  </a>
                </div>
              </div>

              <div className="shrink-0 rounded-2xl border border-teal-100 bg-teal-50 px-4 py-3 text-center">
                <p className="text-xs font-bold text-teal-700">저장된 기록</p>
                <p className="mt-1 text-2xl font-black text-[#102033]">
                  {totalRows}건
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-4 flex max-w-full items-start justify-between gap-2 sm:mb-5 sm:items-end sm:gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-blue-300 sm:text-sm">
                TBM · 현장 안전기록
              </p>
              <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">
                📋 TBM 현황
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-gray-400 sm:text-base">
                등록된 TBM과 특이사항, 증빙 연결 상태를 확인합니다.
              </p>
              <TbmFormAction
                tbmFormUrl={tbmFormUrl}
                voiceDraftHref="#tbm-voice-draft"
                compact
                className="mt-4"
              />
            </div>

            <div className="shrink-0 whitespace-nowrap rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-bold text-slate-200 sm:px-3 sm:py-2 sm:text-sm">
              {totalRows}건
            </div>
          </div>
        )}

        {isRichi ? (
          <>
            <div className="mb-5 grid max-w-full grid-cols-1 gap-3 lg:grid-cols-3">
              <div className="rounded-3xl border border-[#D6EDE6] bg-white p-5 shadow-sm lg:col-span-2">
                <p
                  className={`text-sm font-black ${
                    todayRichiRows.length > 0
                      ? "text-emerald-700"
                      : "text-teal-700"
                  }`}
                >
                  {todayRichiRows.length > 0
                    ? "오늘 TBM 저장됨"
                    : "오늘 TBM 작성 전이에요"}
                </p>
                <p className="mt-3 text-2xl font-black tracking-tight text-[#102033] sm:text-3xl">
                  {todayRichiRows.length > 0
                    ? `오늘 ${todayRichiRows.length}건의 TBM 운영기록이 저장됐어요`
                    : "아래에서 음성이나 텍스트로 간편하게 남겨주세요"}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-slate-500">
                  날짜별 운영기록은 최근 작성 순서로 정리됩니다.
                </p>
              </div>

              <div className="rounded-3xl border border-[#D6EDE6] bg-white p-5 shadow-sm">
                <p className="text-sm font-bold text-slate-500">
                  최근 저장 기록
                </p>
                <div className="mt-3 text-4xl font-black text-[#102033]">
                  {totalRows}
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  리치코리아 TBM 운영기록
                </p>
              </div>
            </div>

            <section className="mb-5 rounded-[2rem] border border-[#D6EDE6] bg-white p-4 shadow-sm sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black tracking-[0.18em] text-teal-700">
                    작성
                  </p>
                  <h2 className="mt-1 text-xl font-black text-[#102033]">
                    말로 TBM 작성
                  </h2>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                  저장 준비
                </span>
              </div>
              <TbmVoiceDraftHelper
                tbmFormUrl={tbmFormUrl}
                companyName={company.name}
                companyCode={company.code}
                visualMode="richiCompact"
              />
            </section>
          </>
        ) : (
          <>
            <div className="mb-5 grid max-w-full grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="max-w-full rounded-2xl border border-blue-700 bg-blue-950/35 p-4 sm:p-5">
                <p className="text-sm font-bold text-blue-200">전체 TBM</p>
                <div className="mt-3 text-3xl font-black text-white sm:text-4xl">
                  {totalRows}
                </div>
                <p className="mt-1 text-sm text-blue-200/80">등록된 안전기록</p>
              </div>

              <div
                className={`max-w-full rounded-2xl border p-4 sm:p-5 ${특이사항건수 > 0 ? "border-amber-700 bg-amber-950/30" : "border-slate-700 bg-slate-900"}`}
              >
                <p className="text-sm font-bold text-amber-200">특이사항</p>
                <div className="mt-3 text-3xl font-black text-white sm:text-4xl">
                  {특이사항건수}
                </div>
                <p className="mt-1 text-sm text-amber-100/80">
                  {특이사항건수 > 0 ? "확인 필요 항목" : "특이사항 없음"}
                </p>
              </div>

              <div
                className={`max-w-full rounded-2xl border p-4 sm:p-5 ${EB누락 > 0 ? "border-red-700 bg-red-950/35" : "border-emerald-700 bg-emerald-950/25"}`}
              >
                <p
                  className={`text-sm font-bold ${EB누락 > 0 ? "text-red-200" : "text-emerald-200"}`}
                >
                  EB 연결 필요
                </p>
                <div className="mt-3 text-3xl font-black text-white sm:text-4xl">
                  {EB누락}
                </div>
                <p
                  className={`mt-1 text-sm ${EB누락 > 0 ? "text-red-100/80" : "text-emerald-100/80"}`}
                >
                  {EB누락 > 0 ? "조치상태 기준 미연결" : "누락 없음"}
                </p>
              </div>
            </div>
            <TbmVoiceDraftHelper
              tbmFormUrl={tbmFormUrl}
              companyName={company.name}
              companyCode={company.code}
              className="mb-5"
            />
          </>
        )}

        {!isRichi && (
          <div
            className={`mb-5 max-w-full rounded-2xl border p-4 sm:p-5 ${
              hasTodayActionItems
                ? "border-red-700 bg-red-950/30"
                : "border-emerald-700 bg-emerald-950/20"
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">
                {hasTodayActionItems ? "🔴" : "✅"}
              </span>
              <div>
                <p
                  className={`text-base font-black ${
                    hasTodayActionItems ? "text-red-100" : "text-emerald-100"
                  }`}
                >
                  {hasTodayActionItems
                    ? "오늘 먼저 확인할 항목이 있습니다."
                    : "현재 조치 필요 항목은 없습니다."}
                </p>
                <p
                  className={`mt-1 text-sm leading-relaxed ${
                    hasTodayActionItems ? "text-red-200" : "text-emerald-200"
                  }`}
                >
                  EB 연결 필요 {EB누락}건, 조치 필요 {조치필요}건입니다.
                </p>
              </div>
            </div>
          </div>
        )}

        {isRichi ? (
          <section
            id="recent-tbm-records"
            className="max-w-full rounded-[2rem] border border-[#D6EDE6] bg-white p-4 shadow-sm sm:p-6"
          >
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black tracking-[0.18em] text-teal-700">
                  기록
                </p>
                <h2 className="mt-1 text-xl font-black text-[#102033]">
                  최근 TBM 운영기록
                </h2>
              </div>
              <p className="text-sm font-bold text-slate-500">
                최근 5건 우선 표시
              </p>
            </div>

            <div className="space-y-5">
              {groupedRecentRichiRows.map((group, groupIndex) => (
                <div key={group.date}>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-teal-500" />
                    <h3 className="text-sm font-black text-[#102033]">
                      {group.date}
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    {group.rows.map((row, rowIndex) => {
                      const isHighlightedRecent =
                        groupIndex === 0 && rowIndex === 0;
                      const hasPhotos = (row.uploaded_file_count ?? 0) > 0;
                      const riskTags = getRichiDisplayRiskTags(
                        row.risk_tags,
                      ).slice(0, hasPhotos ? 3 : 4);
                      const previewText = getRichiTbmPreviewText(row);
                      return (
                        <article
                          key={row.id}
                          className={`relative overflow-hidden rounded-3xl border bg-white p-4 shadow-sm transition hover:border-teal-200 ${
                            isHighlightedRecent
                              ? "border-teal-200 shadow-teal-900/5"
                              : "border-slate-200"
                          }`}
                        >
                          {isHighlightedRecent && (
                            <div className="absolute inset-y-0 left-0 w-1.5 bg-teal-500" />
                          )}
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="line-clamp-1 text-base font-black text-[#102033] sm:text-lg">
                                  {row.title || "TBM 운영기록"}
                                </p>
                                {isHighlightedRecent && (
                                  <span className="shrink-0 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-[11px] font-black text-teal-700">
                                    최근 기록
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 text-sm font-medium text-slate-500">
                                {row.supervisor_name
                                  ? `${row.supervisor_name} · `
                                  : ""}
                                {formatKstTimeValue(row.created_at)}
                              </p>
                            </div>
                            {row.has_special_issue && (
                              <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-700">
                                특이사항
                              </span>
                            )}
                          </div>

                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {hasPhotos && (
                              <span className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-black text-teal-800">
                                사진 {row.uploaded_file_count}건
                              </span>
                            )}
                            {riskTags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-black text-slate-600"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>

                          {previewText && (
                            <p className="mt-4 line-clamp-3 whitespace-pre-line rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-2.5 text-sm leading-relaxed text-slate-700">
                              {previewText}
                            </p>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {recentRichiRows.length === 0 && (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-bold text-slate-500">
                아직 저장된 TBM 운영기록이 없습니다.
              </div>
            )}

            <div className="mt-5 rounded-2xl border border-dashed border-teal-200 bg-teal-50/70 px-4 py-3 text-sm font-bold text-teal-800">
              월별 보관함 연결 준비
            </div>
          </section>
        ) : (
          <div className="max-w-full space-y-3">
            {rows.map((row) => {
              const needsEb = row.EB필요 && row.연결EB === 0;
              const needsAction = row.조치상태 === "조치 필요";

              return (
                <Link
                  key={row.id}
                  href={`/tbm/${row.id}`}
                  className="block max-w-full"
                >
                  <div
                    className={`max-w-full rounded-2xl border p-3 transition hover:-translate-y-0.5 hover:border-blue-500 sm:p-5 ${
                      needsEb || needsAction
                        ? "border-red-800 bg-red-950/25"
                        : row.특이사항
                          ? "border-amber-800 bg-amber-950/20"
                          : "border-slate-700 bg-slate-900"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-black text-white sm:text-xl">
                          {row.작업명 || "작업명 없음"}
                        </p>
                        <p className="mt-1 text-sm font-medium text-slate-400">
                          {row.날짜}
                        </p>

                        <div className="mt-3 flex max-w-full flex-wrap gap-1.5 sm:gap-2">
                          {row.특이사항 ? (
                            <span className="rounded-full border border-amber-700 bg-amber-950/40 px-2.5 py-1 text-xs font-bold text-amber-200 sm:px-3 sm:text-sm">
                              특이사항 있음
                            </span>
                          ) : (
                            <span className="whitespace-nowrap rounded-full border border-slate-700 bg-slate-950/50 px-2.5 py-1 text-xs font-bold text-slate-300 sm:px-3 sm:text-sm">
                              특이사항 없음
                            </span>
                          )}

                          {row.조치상태 && (
                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-bold sm:px-3 sm:text-sm ${
                                needsAction
                                  ? "border-red-700 bg-red-950/50 text-red-200"
                                  : "border-emerald-700 bg-emerald-950/40 text-emerald-200"
                              }`}
                            >
                              {row.조치상태}
                            </span>
                          )}

                          {needsEb && (
                            <span className="rounded-full border border-red-700 bg-red-950/50 px-2.5 py-1 text-xs font-bold text-red-200 sm:px-3 sm:text-sm">
                              EB 연결 필요
                            </span>
                          )}

                          {!needsEb && row.연결EB > 0 && (
                            <span className="rounded-full border border-emerald-700 bg-emerald-950/40 px-2.5 py-1 text-xs font-bold text-emerald-200 sm:px-3 sm:text-sm">
                              EB {row.연결EB}건 연결
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex h-12 items-center justify-between rounded-xl border border-slate-700 bg-slate-950/40 px-4 text-sm font-bold text-slate-300 sm:hidden">
                      <span>상세 확인</span>
                      <span>→</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
