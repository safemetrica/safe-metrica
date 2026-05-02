export const dynamic = "force-dynamic";
import { SafeNav, StatusBadge } from "@/components/SafeLayout";

async function getPtwRows() {
  const apiBase = "https://api.notion.com/v1/databases";
  const res = await fetch(`${apiBase}/${process.env.NOTION_PTW_DB_ID}/query`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${process.env.NOTION_API_KEY}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
    body: JSON.stringify({ page_size: 100, sorts: [{ property: "작업일", direction: "descending" }] }),
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Notion API error");
  return data.results.map((page: any) => ({
    id: page.id,
    제목: page.properties["허가서 제목/번호 (예W-대도-20260324-고소-001)"]?.title?.[0]?.plain_text ?? "",
    작업일: page.properties["작업일"]?.date?.start ?? "",
    작업유형: page.properties["작업유형"]?.select?.name ?? "",
    승인상태: page.properties["승인상태"]?.select?.name ?? "",
    허용여부: page.properties["작업 허용 여부"]?.select?.name ?? "",
    Dday: page.properties["D-day"]?.formula?.string ?? "",
  }));
}

const 유형아이콘: Record<string, string> = { "화기작업": "🔥", "밀폐공간작업": "⚠️", "고소작업": "🪜", "정비작업": "🔧", "전기작업": "⚡", "기타": "📋" };

export default async function PtwPage() {
  const rows = await getPtwRows();
  const 위험건수 = rows.filter((r: any) => r.허용여부 === "금지" || r.승인상태 === "반려").length;
  return (
    <main className="min-h-screen bg-gray-950 pb-10">
      <SafeNav />
      <div className="p-4 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4 mt-2">
          <h1 className="text-white text-xl font-bold">🧾 고위험작업허가서</h1>
          <span className="text-gray-400 text-sm">{rows.length}건</span>
        </div>
        {위험건수 > 0 && (
          <div className="bg-red-950 border border-red-700 rounded-xl p-3 mb-4 flex items-center gap-2">
            <span className="text-red-400">🚨</span>
            <p className="text-red-300 text-sm font-medium">금지/반려 항목 {위험건수}건 — 즉시 확인 필요</p>
          </div>
        )}
        <div className="space-y-2">
          {rows.map((row: any) => {
            const isDanger = row.허용여부 === "금지" || row.승인상태 === "반려";
            return (
              <div key={row.id} className={`rounded-xl border p-4 ${isDanger ? "bg-red-950 border-red-800" : "bg-gray-900 border-gray-700"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{유형아이콘[row.작업유형] ?? "📋"}</span>
                      <span className="text-white font-medium text-sm truncate">{row.제목 || "제목 없음"}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-gray-400 text-xs">{row.작업일}</span>
                      {row.작업유형 && <span className="text-gray-500 text-xs">· {row.작업유형}</span>}
                      {row.Dday && <span className={`text-xs font-medium ${row.Dday === "✅ 완료" ? "text-gray-500" : "text-yellow-400"}`}>{row.Dday}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {row.허용여부 && <StatusBadge status={row.허용여부} />}
                    {row.승인상태 && <StatusBadge status={row.승인상태} />}
                  </div>
                </div>
              </div>
            );
          })}
          {rows.length === 0 && <div className="text-center text-gray-500 py-10">등록된 PTW 없음</div>}
        </div>
      </div>
    </main>
  );
}
