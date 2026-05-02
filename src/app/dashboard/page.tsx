export const dynamic = "force-dynamic";
import { SafeNav } from "@/components/SafeLayout";

async function getStats() {
  const apiBase = "https://api.notion.com/v1/databases";
  const res = await fetch(`${apiBase}/${process.env.NOTION_TBM_DB_ID}/query`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${process.env.NOTION_API_KEY}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
    body: JSON.stringify({ page_size: 100 }),
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "error");
  const rows = data.results.map((p: any) => ({
    날짜: p.properties["날짜"]?.date?.start ?? "",
    특이사항: p.properties["특이사항"]?.checkbox ?? false,
    조치상태: p.properties["조치 상태"]?.select?.name ?? "",
    연결EB: p.properties["연결 EB"]?.relation?.length ?? 0,
  }));
  const today = new Date().toISOString().slice(0, 7);
  const EB누락 = rows.filter((r: any) => r.특이사항 && r.연결EB === 0).length;
  const 조치필요 = rows.filter((r: any) => r.조치상태 === "조치 필요").length;
  const 리스크점수 = Math.min(100, EB누락 * 20 + 조치필요 * 10);
  return { 전체: rows.length, 이번달: rows.filter((r: any) => r.날짜?.startsWith(today)).length, 특이사항: rows.filter((r: any) => r.특이사항).length, EB누락, 조치필요, 리스크점수 };
}

export default async function DashboardPage() {
  const s = await getStats();
  const 리스크색 = s.리스크점수 >= 60 ? "text-red-400" : s.리스크점수 >= 30 ? "text-yellow-400" : "text-green-400";
  const 리스크라벨 = s.리스크점수 >= 60 ? "🔴 위험" : s.리스크점수 >= 30 ? "🟡 주의" : "🟢 안전";
  return (
    <main className="min-h-screen bg-gray-950 pb-10">
      <SafeNav />
      <div className="p-4 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4 mt-2">
          <h1 className="text-white text-xl font-bold">📊 대시보드</h1>
          <span className="text-gray-400 text-xs">{new Date().toLocaleDateString("ko-KR")}</span>
        </div>
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 mb-4 flex items-center justify-between">
          <div>
            <div className="text-gray-400 text-xs mb-1">현장 리스크 지수</div>
            <div className={`text-4xl font-bold ${리스크색}`}>{s.리스크점수}점</div>
            <div className={`text-sm font-medium mt-1 ${리스크색}`}>{리스크라벨}</div>
          </div>
          <div className="text-right">
            <div className="text-gray-500 text-xs">EB누락 ×20 + 조치필요 ×10</div>
            <div className="text-gray-500 text-xs mt-1">100점 = 최고 위험</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-blue-950 border border-blue-800 rounded-xl p-4">
            <div className="text-3xl font-bold text-white">{s.전체}</div>
            <div className="text-blue-400 text-sm mt-1">전체 TBM</div>
          </div>
          <div className="bg-emerald-950 border border-emerald-800 rounded-xl p-4">
            <div className="text-3xl font-bold text-white">{s.이번달}</div>
            <div className="text-emerald-400 text-sm mt-1">이번 달 TBM</div>
          </div>
          <div className="bg-yellow-950 border border-yellow-800 rounded-xl p-4">
            <div className="text-3xl font-bold text-white">{s.특이사항}</div>
            <div className="text-yellow-400 text-sm mt-1">특이사항 발생</div>
          </div>
          <div className={`rounded-xl p-4 border ${s.EB누락 > 0 ? "bg-red-950 border-red-800" : "bg-gray-800 border-gray-700"}`}>
            <div className="text-3xl font-bold text-white">{s.EB누락}</div>
            <div className={`text-sm mt-1 ${s.EB누락 > 0 ? "text-red-400" : "text-gray-400"}`}>🔴 EB 누락</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <a href="/tbm" className="bg-gray-900 border border-gray-700 hover:border-blue-600 rounded-xl p-4 text-center transition">
            <div className="text-2xl mb-1">📋</div>
            <div className="text-white text-sm font-medium">TBM 목록</div>
          </a>
          <a href="/ebm" className="bg-gray-900 border border-gray-700 hover:border-emerald-600 rounded-xl p-4 text-center transition">
            <div className="text-2xl mb-1">📚</div>
            <div className="text-white text-sm font-medium">EB 목록</div>
          </a>
        </div>
      </div>
    </main>
  );
}
