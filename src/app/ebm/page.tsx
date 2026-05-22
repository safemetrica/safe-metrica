export const dynamic = "force-dynamic";
import { SafeNav } from "@/components/SafeLayout";
import Link from "next/link";
import { getCompanyConfig } from "@/lib/company";
import { evaluateEvidenceSufficiency } from "@/lib/evidenceSufficiency";

async function getEbRows() {
  const apiBase = "https://api.notion.com/v1/databases";
  const company = await getCompanyConfig();
  const res = await fetch(`${apiBase}/${company.ebmDbId}/query`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${process.env.NOTION_API_KEY}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
    body: JSON.stringify({ page_size: 100, sorts: [{ property: "등록일", direction: "descending" }] }),
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Notion API error");
  return data.results.map((page: any) => ({
    id: page.id,
    증빙명: page.properties["증빙명"]?.title?.[0]?.plain_text ?? "",
    등록일: page.properties["등록일"]?.date?.start ?? "",
    증빙유형: page.properties["증빙유형"]?.select?.name ?? "",
    관련TBM: page.properties["관련 TBM"]?.relation?.length ?? 0,
    관련PTW: page.properties["관련 PTW"]?.relation?.length ?? 0,
    비고: page.properties["비고"]?.rich_text?.map((t: any) => t.plain_text).join("") ?? "",
  })).map((row: any) => ({
    ...row,
    증빙적정성: evaluateEvidenceSufficiency({
      title: row.증빙명,
      evidenceType: row.증빙유형,
      note: row.비고,
      relatedTbmCount: row.관련TBM,
      relatedPtwCount: row.관련PTW,
    }),
  }));
}

const 유형색: Record<string, string> = {
  "사진": "bg-blue-900 text-blue-300 border-blue-700",
  "TBM기록": "bg-emerald-900 text-emerald-300 border-emerald-700",
  "작업허가서": "bg-orange-900 text-orange-300 border-orange-700",
  "점검표": "bg-yellow-900 text-yellow-300 border-yellow-700",
  "교육기록": "bg-purple-900 text-purple-300 border-purple-700",
};

export default async function EbmPage() {
  const rows = await getEbRows();
  return (
    <main className="min-h-screen bg-gray-950 pb-10">
      <SafeNav />
      <div className="p-4 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4 mt-2">
          <h1 className="text-white text-xl font-bold">📚 Evidence Book</h1>
          <span className="text-gray-400 text-sm">{rows.length}건</span>
        </div>
        <div className="space-y-2">
          {rows.map((row: any) => (
            <Link key={row.id} href={`/ebm/${row.id}`}>
              <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 cursor-pointer hover:opacity-80 transition">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium text-sm">{row.증빙명 || "제목 없음"}</div>
                    <div className="text-gray-400 text-xs mt-1">{row.등록일}</div>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {row.관련TBM > 0 && <span className="px-2 py-0.5 bg-blue-900 text-blue-300 border border-blue-700 rounded-full text-xs">TBM {row.관련TBM}건</span>}
                      {row.관련PTW > 0 && <span className="px-2 py-0.5 bg-orange-900 text-orange-300 border border-orange-700 rounded-full text-xs">PTW {row.관련PTW}건</span>}
                      {row.증빙적정성?.status === "needs_supplement" && (
                        <span className="px-2 py-0.5 bg-amber-950 text-amber-300 border border-amber-700 rounded-full text-xs">
                          증빙 보완 필요
                        </span>
                      )}
                    </div>
                    {row.증빙적정성?.status === "needs_supplement" && (
                      <p className="mt-2 text-xs leading-relaxed text-amber-200">
                        {row.증빙적정성.reason}
                      </p>
                    )}
                  </div>
                  {row.증빙유형 && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border shrink-0 ${유형색[row.증빙유형] ?? "bg-gray-700 text-gray-300 border-gray-600"}`}>
                      {row.증빙유형}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
          {rows.length === 0 && <div className="text-center text-gray-500 py-10">등록된 증빙 없음</div>}
        </div>
      </div>
    </main>
  );
}
