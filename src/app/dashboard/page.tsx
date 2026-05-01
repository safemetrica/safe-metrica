export const dynamic = "force-dynamic";
async function getTbmStats() {
  const res = await fetch(`https://api.notion.com/v1/databases/${process.env.NOTION_TBM_DB_ID}/query`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${process.env.NOTION_API_KEY}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
    body: JSON.stringify({ page_size: 100 }),
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Notion API error");
  const rows = data.results.map((p: any) => ({ 날짜: p.properties["날짜"]?.date?.start ?? "", 특이사항: p.properties["특이사항"]?.checkbox ?? false, 조치상태: p.properties["조치 상태"]?.select?.name ?? "", 연결EB: p.properties["연결 EB"]?.relation?.length ?? 0 }));
  const today = new Date().toISOString().slice(0, 7);
  return { 전체: rows.length, 이번달: rows.filter((r: any) => r.날짜?.startsWith(today)).length, 특이사항: rows.filter((r: any) => r.특이사항).length, EB누락: rows.filter((r: any) => r.특이사항 && r.연결EB === 0).length, 조치필요: rows.filter((r: any) => r.조치상태 === "조치 필요").length };
}
export default async function DashboardPage() {
  const s = await getTbmStats();
  return (
    <main className="p-6 bg-gray-950 min-h-screen text-white">
      <div className="mb-4"><a href="/" className="text-blue-400 hover:underline text-sm">← 홈으로</a></div>
      <h1 className="mb-8 text-2xl font-bold">📊 SafeMetrica™ 대시보드 · 대도환경</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-3xl">
        <div className="bg-blue-900 rounded-xl p-5"><div className="text-4xl font-bold">{s.전체}</div><div className="text-blue-300 mt-1 text-sm">전체 TBM</div></div>
        <div className="bg-green-900 rounded-xl p-5"><div className="text-4xl font-bold">{s.이번달}</div><div className="text-green-300 mt-1 text-sm">이번 달 TBM</div></div>
        <div className="bg-yellow-900 rounded-xl p-5"><div className="text-4xl font-bold">{s.특이사항}</div><div className="text-yellow-300 mt-1 text-sm">특이사항 발생</div></div>
        <div className={`rounded-xl p-5 ${s.EB누락 > 0 ? "bg-red-900" : "bg-gray-800"}`}><div className="text-4xl font-bold">{s.EB누락}</div><div className={`mt-1 text-sm ${s.EB누락 > 0 ? "text-red-300" : "text-gray-400"}`}>🔴 EB 누락</div></div>
        <div className={`rounded-xl p-5 ${s.조치필요 > 0 ? "bg-orange-900" : "bg-gray-800"}`}><div className="text-4xl font-bold">{s.조치필요}</div><div className={`mt-1 text-sm ${s.조치필요 > 0 ? "text-orange-300" : "text-gray-400"}`}>⚠️ 조치 필요</div></div>
      </div>
      <div className="mt-8 flex gap-3">
        <a href="/tbm" className="bg-blue-700 hover:bg-blue-600 px-4 py-2 rounded-lg text-sm transition">📋 TBM 목록</a>
        <a href="/ebm" className="bg-green-700 hover:bg-green-600 px-4 py-2 rounded-lg text-sm transition">📚 EB 목록</a>
      </div>
    </main>
  );
}
