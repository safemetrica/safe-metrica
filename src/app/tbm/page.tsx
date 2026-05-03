export const dynamic = "force-dynamic";
import { SafeNav, StatusBadge } from "@/components/SafeLayout";
import Link from "next/link";

async function getTbmRows() {
  const apiBase = "https://api.notion.com/v1/databases";
  const res = await fetch(`${apiBase}/${process.env.NOTION_TBM_DB_ID}/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ page_size: 100, sorts: [{ property: "날짜", direction: "descending" }] }),
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Notion API error");
  return data.results.map((page: any) => ({
    id: page.id,
    작업명: page.properties["작업명"]?.title?.[0]?.plain_text ?? "",
    날짜: page.properties["날짜"]?.date?.start ?? "",
    특이사항: page.properties["특이사항"]?.checkbox ?? false,
    조치상태: page.properties["조치 상태"]?.select?.name ?? "",
    연결EB: page.properties["연결 EB"]?.relation?.length ?? 0,
  }));
}

export default async function TbmPage() {
  const rows = await getTbmRows();
  const 특이사항건수 = rows.filter((r: any) => r.특이사항).length;
  const EB누락 = rows.filter((r: any) => r.특이사항 && r.연결EB === 0).length;
  return (
    <main className="min-h-screen bg-[#F6F8FB] pb-10">
      <SafeNav />
      <div className="p-4 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4 mt-2">
          <h1 className="text-white text-xl font-bold">📋 TBM 현황</h1>
          <span className="text-gray-400 text-sm">{rows.length}건</span>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-blue-950 border border-blue-800 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-white">{rows.length}</div>
            <div className="text-blue-400 text-xs mt-0.5">전체</div>
          </div>
          <div className="bg-yellow-950 border border-yellow-800 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-white">{특이사항건수}</div>
            <div className="text-yellow-400 text-xs mt-0.5">특이사항</div>
          </div>
          <div className={`rounded-xl p-3 text-center border ${EB누락 > 0 ? "bg-red-950 border-red-800" : "bg-gray-800 border-gray-700"}`}>
            <div className="text-2xl font-bold text-white">{EB누락}</div>
            <div className={`text-xs mt-0.5 ${EB누락 > 0 ? "text-red-400" : "text-gray-400"}`}>EB 누락</div>
          </div>
        </div>
        {EB누락 > 0 && (
          <div className="bg-red-950 border border-red-700 rounded-xl p-3 mb-4 flex items-center gap-2">
            <span className="text-red-400 text-lg">🔴</span>
            <p className="text-red-300 text-sm font-medium">특이사항 발생 건 중 Evidence Book 미등록 {EB누락}건 — 즉시 등록 필요</p>
          </div>
        )}
        <div className="space-y-2">
          {rows.map((row: any) => {
            const needsEb = row.특이사항 && row.연결EB === 0;
            return (
              <Link key={row.id} href={`/tbm/${row.id}`}>
                <div className={`rounded-xl border p-4 cursor-pointer hover:opacity-80 transition ${needsEb ? "bg-red-950 border-red-800" : "bg-gray-900 border-gray-700"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium text-sm truncate">{row.작업명 || "작업명 없음"}</div>
                      <div className="text-gray-400 text-xs mt-1">{row.날짜}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {row.조치상태 && <StatusBadge status={row.조치상태} />}
                      {row.특이사항 && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${row.연결EB > 0 ? "bg-green-900 text-green-300 border-green-700" : "bg-red-900 text-red-300 border-red-700"}`}>
                          {row.연결EB > 0 ? `✅ EB ${row.연결EB}건` : "🔴 EB 없음"}
                        </span>
                      )}
                    </div>
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
