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
  properties?: Record<string, {
    title?: Array<{ plain_text?: string }>;
    date?: { start?: string };
    select?: { name?: string };
    relation?: unknown[];
  }>;
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

function getSnapshotProfileBadges(snapshot: TbmVoiceSubmissionListRow["snapshot"]) {
  if (!snapshot) {
    return [];
  }

  return ["voiceProfile", "industryProfile"]
    .map((key) => snapshot[key])
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0);
}

export default async function TbmPage() {
  const company = await getCompanyConfig();
  const isRichi = company.code === "richi";
  const rows = isRichi ? [] : await getTbmRows();
  const richiRows = isRichi ? await selectTbmVoiceSubmissionListRows(company.code) : [];
  const tbmFormUrl = getTbmFormUrl(company);
  const 특이사항건수 = isRichi
    ? richiRows.filter((r) => r.has_special_issue).length
    : rows.filter((r) => r.특이사항).length;
  const EB누락 = rows.filter((r) => r.EB필요 && r.연결EB === 0).length;
  const 조치필요 = rows.filter((r) => r.조치상태 === "조치 필요").length;
  const 사진첨부 = richiRows.filter((r) => (r.uploaded_file_count ?? 0) > 0).length;
  const hasTodayActionItems = EB누락 > 0 || 조치필요 > 0;
  const totalRows = isRichi ? richiRows.length : rows.length;

  return (
    <main className="min-h-screen overflow-x-hidden bg-gray-950 pb-[calc(3rem+env(safe-area-inset-bottom))]">
      <SafeNav />

      <div className="mx-auto w-full max-w-4xl px-3 py-4 sm:px-6 sm:py-8">
        <div className="mb-4 flex max-w-full items-start justify-between gap-2 sm:mb-5 sm:items-end sm:gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-blue-300 sm:text-sm">TBM · 현장 안전기록</p>
            <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">
              📋 TBM 현황
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-gray-400 sm:text-base">
              {isRichi
                ? "말로 작성한 TBM을 Supabase 운영기록으로 저장하고 월별 보관함 연결을 준비합니다."
                : "등록된 TBM과 특이사항, 증빙 연결 상태를 확인합니다."}
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

        <div className="mb-5 grid max-w-full grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="max-w-full rounded-2xl border border-blue-700 bg-blue-950/35 p-4 sm:p-5">
            <p className="text-sm font-bold text-blue-200">전체 TBM</p>
            <div className="mt-3 text-3xl font-black text-white sm:text-4xl">{totalRows}</div>
            <p className="mt-1 text-sm text-blue-200/80">등록된 안전기록</p>
          </div>

          <div className={`max-w-full rounded-2xl border p-4 sm:p-5 ${특이사항건수 > 0 ? "border-amber-700 bg-amber-950/30" : "border-slate-700 bg-slate-900"}`}>
            <p className="text-sm font-bold text-amber-200">특이사항</p>
            <div className="mt-3 text-3xl font-black text-white sm:text-4xl">{특이사항건수}</div>
            <p className="mt-1 text-sm text-amber-100/80">
              {특이사항건수 > 0 ? "확인 필요 항목" : "특이사항 없음"}
            </p>
          </div>

          <div className={`max-w-full rounded-2xl border p-4 sm:p-5 ${!isRichi && EB누락 > 0 ? "border-red-700 bg-red-950/35" : "border-emerald-700 bg-emerald-950/25"}`}>
            {isRichi ? (
              <>
                <p className="text-sm font-bold text-emerald-200">사진 첨부</p>
                <div className="mt-3 text-3xl font-black text-white sm:text-4xl">{사진첨부}</div>
                <p className="mt-1 text-sm text-emerald-100/80">월별 보관 연결 준비</p>
              </>
            ) : (
              <>
                <p className={`text-sm font-bold ${EB누락 > 0 ? "text-red-200" : "text-emerald-200"}`}>
                  EB 연결 필요
                </p>
                <div className="mt-3 text-3xl font-black text-white sm:text-4xl">{EB누락}</div>
                <p className={`mt-1 text-sm ${EB누락 > 0 ? "text-red-100/80" : "text-emerald-100/80"}`}>
                  {EB누락 > 0 ? "조치상태 기준 미연결" : "누락 없음"}
                </p>
              </>
            )}
          </div>
        </div>
        <TbmVoiceDraftHelper
          tbmFormUrl={tbmFormUrl}
          companyName={company.name}
          companyCode={company.code}
          className="mb-5"
        />

        {!isRichi && (
          <div
            className={`mb-5 max-w-full rounded-2xl border p-4 sm:p-5 ${
            hasTodayActionItems
              ? "border-red-700 bg-red-950/30"
              : "border-emerald-700 bg-emerald-950/20"
          }`}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{hasTodayActionItems ? "🔴" : "✅"}</span>
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

        <div className="max-w-full space-y-3">
          {richiRows.map((row) => {
            const riskTags = Array.isArray(row.risk_tags) ? row.risk_tags.slice(0, 5) : [];
            const profileBadges = getSnapshotProfileBadges(row.snapshot);

            return (
              <div
                key={row.id}
                className={`max-w-full rounded-2xl border p-3 sm:p-5 ${
                  row.has_special_issue
                    ? "border-amber-800 bg-amber-950/20"
                    : "border-slate-700 bg-slate-900"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      <span className="rounded-full border border-blue-700 bg-blue-950/40 px-2.5 py-1 text-xs font-bold text-blue-200">
                        말로 작성한 TBM 운영기록
                      </span>
                      <span className="rounded-full border border-emerald-700 bg-emerald-950/40 px-2.5 py-1 text-xs font-bold text-emerald-200">
                        Supabase 운영기록
                      </span>
                      <span className="rounded-full border border-purple-700 bg-purple-950/40 px-2.5 py-1 text-xs font-bold text-purple-200">
                        월별 보관함 연결 준비
                      </span>
                    </div>
                    <p className="truncate text-base font-black text-white sm:text-xl">
                      {row.title || "말로 작성한 TBM 운영기록"}
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-400">
                      {row.date_value ?? row.created_at ?? "날짜 없음"}
                      {row.supervisor_name ? ` · ${row.supervisor_name}` : ""}
                    </p>

                    <div className="mt-3 flex max-w-full flex-wrap gap-1.5 sm:gap-2">
                      <span className="rounded-full border border-slate-700 bg-slate-950/50 px-2.5 py-1 text-xs font-bold text-slate-300 sm:px-3 sm:text-sm">
                        상세 연결 준비 중
                      </span>
                      {row.has_special_issue && (
                        <span className="rounded-full border border-amber-700 bg-amber-950/40 px-2.5 py-1 text-xs font-bold text-amber-200 sm:px-3 sm:text-sm">
                          특이사항 있음
                        </span>
                      )}
                      {row.action_status && (
                        <span className="rounded-full border border-emerald-700 bg-emerald-950/40 px-2.5 py-1 text-xs font-bold text-emerald-200 sm:px-3 sm:text-sm">
                          {row.action_status}
                        </span>
                      )}
                      {(row.uploaded_file_count ?? 0) > 0 && (
                        <span className="rounded-full border border-cyan-700 bg-cyan-950/40 px-2.5 py-1 text-xs font-bold text-cyan-200 sm:px-3 sm:text-sm">
                          사진 {row.uploaded_file_count}건
                        </span>
                      )}
                      {riskTags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-slate-700 bg-slate-950/50 px-2.5 py-1 text-xs font-bold text-slate-300 sm:px-3 sm:text-sm"
                        >
                          {tag}
                        </span>
                      ))}
                      {profileBadges.map((badge) => (
                        <span
                          key={badge}
                          className="rounded-full border border-indigo-700 bg-indigo-950/40 px-2.5 py-1 text-xs font-bold text-indigo-200 sm:px-3 sm:text-sm"
                        >
                          {badge}
                        </span>
                      ))}
                    </div>

                    {row.safety_notice && (
                      <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-300">
                        {row.safety_notice}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {rows.map((row) => {
            const needsEb = row.EB필요 && row.연결EB === 0;
            const needsAction = row.조치상태 === "조치 필요";

            return (
              <Link key={row.id} href={`/tbm/${row.id}`} className="block max-w-full">
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
                      <p className="mt-1 text-sm font-medium text-slate-400">{row.날짜}</p>

                      <div className="mt-3 flex max-w-full flex-wrap gap-1.5 sm:gap-2">
                        {row.특이사항 ? (
                          <span className="rounded-full border border-amber-700 bg-amber-950/40 px-2.5 py-1 text-xs sm:px-3 sm:text-sm font-bold text-amber-200">
                            특이사항 있음
                          </span>
                        ) : (
                          <span className="whitespace-nowrap rounded-full border border-slate-700 bg-slate-950/50 px-2.5 py-1 text-xs sm:px-3 sm:text-sm font-bold text-slate-300">
                            특이사항 없음
                          </span>
                        )}

                        {row.조치상태 && (
                          <span className={`rounded-full border px-2.5 py-1 text-xs sm:px-3 sm:text-sm font-bold ${
                            needsAction
                              ? "border-red-700 bg-red-950/50 text-red-200"
                              : "border-emerald-700 bg-emerald-950/40 text-emerald-200"
                          }`}>
                            {row.조치상태}
                          </span>
                        )}

                        {needsEb && (
                          <span className="rounded-full border border-red-700 bg-red-950/50 px-2.5 py-1 text-xs sm:px-3 sm:text-sm font-bold text-red-200">
                            EB 연결 필요
                          </span>
                        )}

                        {!needsEb && row.연결EB > 0 && (
                          <span className="rounded-full border border-emerald-700 bg-emerald-950/40 px-2.5 py-1 text-xs sm:px-3 sm:text-sm font-bold text-emerald-200">
                            EB {row.연결EB}건 연결
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 h-12 rounded-xl border border-slate-700 bg-slate-950/40 px-4 text-sm font-bold text-slate-300 flex items-center justify-between sm:hidden">
                    <span>상세 확인</span>
                    <span>→</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
