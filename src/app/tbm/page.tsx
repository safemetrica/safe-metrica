import { hasTbmSpecialIssue, needsTbmEvidenceBook, hasLinkedEvidenceBook } from "@/lib/tbmStatus";

export const dynamic = "force-dynamic";

import { SafeNav } from "@/components/SafeLayout";
import Link from "next/link";
import { getCompanyConfig } from "@/lib/company";
import TbmFormAction from "@/components/TbmFormAction";
import TbmVoiceDraftHelper from "@/components/TbmVoiceDraftHelper";

import { getTbmFormUrl } from "@/lib/tenantLinks";
async function getTbmRows() {
  const apiBase = "https://api.notion.com/v1/databases";
  const company = await getCompanyConfig();

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

  return data.results.map((page: any) => ({
    id: page.id,
    작업명: page.properties["작업명"]?.title?.[0]?.plain_text ?? "",
    날짜: page.properties["날짜"]?.date?.start ?? "",
    특이사항: hasTbmSpecialIssue(page.properties ?? {}),
    조치상태: page.properties["조치 상태"]?.select?.name ?? "",
    연결EB: page.properties["연결 EB"]?.relation?.length ?? 0,
    EB필요: needsTbmEvidenceBook(page.properties ?? {}),
  }));
}

export default async function TbmPage() {
  const rows = await getTbmRows();
  const company = await getCompanyConfig();
  const tbmFormUrl = getTbmFormUrl(company);
  const 특이사항건수 = rows.filter((r: any) => r.특이사항).length;
  const EB누락 = rows.filter((r: any) => r.EB필요 && r.연결EB === 0).length;
  const 조치필요 = rows.filter((r: any) => r.조치상태 === "조치 필요").length;
  const hasTodayActionItems = EB누락 > 0 || 조치필요 > 0;

  return (
    <main className="min-h-screen bg-gray-950 pb-12">
      <SafeNav />

      <div className="mx-auto max-w-4xl px-4 py-5 sm:px-6 sm:py-8">
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-blue-300">TBM · 현장 안전기록</p>
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

          <div className="whitespace-nowrap rounded-full border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-bold text-slate-200">
            {rows.length}건
          </div>
        </div>

        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-blue-700 bg-blue-950/35 p-5">
            <p className="text-sm font-bold text-blue-200">전체 TBM</p>
            <div className="mt-3 text-4xl font-black text-white">{rows.length}</div>
            <p className="mt-1 text-sm text-blue-200/80">등록된 안전기록</p>
          </div>

          <div className={`rounded-2xl border p-5 ${특이사항건수 > 0 ? "border-amber-700 bg-amber-950/30" : "border-slate-700 bg-slate-900"}`}>
            <p className="text-sm font-bold text-amber-200">특이사항</p>
            <div className="mt-3 text-4xl font-black text-white">{특이사항건수}</div>
            <p className="mt-1 text-sm text-amber-100/80">
              {특이사항건수 > 0 ? "확인 필요 항목" : "특이사항 없음"}
            </p>
          </div>

          <div className={`rounded-2xl border p-5 ${EB누락 > 0 ? "border-red-700 bg-red-950/35" : "border-emerald-700 bg-emerald-950/25"}`}>
            <p className={`text-sm font-bold ${EB누락 > 0 ? "text-red-200" : "text-emerald-200"}`}>
              EB 연결 필요
            </p>
            <div className="mt-3 text-4xl font-black text-white">{EB누락}</div>
            <p className={`mt-1 text-sm ${EB누락 > 0 ? "text-red-100/80" : "text-emerald-100/80"}`}>
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

        <div
          className={`mb-5 rounded-2xl border p-4 sm:p-5 ${
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

        <div className="space-y-3">
          {rows.map((row: any) => {
            const needsEb = row.EB필요 && row.연결EB === 0;
            const needsAction = row.조치상태 === "조치 필요";

            return (
              <Link key={row.id} href={`/tbm/${row.id}`} className="block">
                <div
                  className={`rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:border-blue-500 sm:p-5 ${
                    needsEb || needsAction
                      ? "border-red-800 bg-red-950/25"
                      : row.특이사항
                        ? "border-amber-800 bg-amber-950/20"
                        : "border-slate-700 bg-slate-900"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-lg font-black text-white sm:text-xl">
                        {row.작업명 || "작업명 없음"}
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-400">{row.날짜}</p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {row.특이사항 ? (
                          <span className="rounded-full border border-amber-700 bg-amber-950/40 px-3 py-1 text-sm font-bold text-amber-200">
                            특이사항 있음
                          </span>
                        ) : (
                          <span className="whitespace-nowrap rounded-full border border-slate-700 bg-slate-950/50 px-3 py-1 text-sm font-bold text-slate-300">
                            특이사항 없음
                          </span>
                        )}

                        {row.조치상태 && (
                          <span className={`rounded-full border px-3 py-1 text-sm font-bold ${
                            needsAction
                              ? "border-red-700 bg-red-950/50 text-red-200"
                              : "border-emerald-700 bg-emerald-950/40 text-emerald-200"
                          }`}>
                            {row.조치상태}
                          </span>
                        )}

                        {needsEb && (
                          <span className="rounded-full border border-red-700 bg-red-950/50 px-3 py-1 text-sm font-bold text-red-200">
                            EB 연결 필요
                          </span>
                        )}

                        {!needsEb && row.연결EB > 0 && (
                          <span className="rounded-full border border-emerald-700 bg-emerald-950/40 px-3 py-1 text-sm font-bold text-emerald-200">
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
