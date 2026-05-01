export const dynamic = "force-dynamic";

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

export default async function PtwPage() {
  const rows = await getPtwRows();
  return (
    <main className="p-6">
      <div className="mb-4"><a href="/" className="text-blue-600 hover:underline text-sm">← 홈으로</a></div>
      <h1 className="mb-6 text-2xl font-bold">🧾 고위험작업허가서 (PTW)</h1>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-4 py-2 text-left">허가서 제목</th>
              <th className="border px-4 py-2 text-left">작업일</th>
              <th className="border px-4 py-2 text-left">유형</th>
              <th className="border px-4 py-2 text-left">D-day</th>
              <th className="border px-4 py-2 text-left">허용여부</th>
              <th className="border px-4 py-2 text-left">승인상태</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row: any) => {
              const isDanger = row.허용여부 === "금지" || row.승인상태 === "반려";
              return (
                <tr key={row.id} className={isDanger ? "bg-red-100 text-red-900" : "bg-white hover:bg-gray-50"}>
                  <td className="border px-4 py-2">{row.제목}</td>
                  <td className="border px-4 py-2">{row.작업일}</td>
                  <td className="border px-4 py-2">{row.작업유형}</td>
                  <td className="border px-4 py-2">{row.Dday}</td>
                  <td className="border px-4 py-2">{row.허용여부 === "허용" ? "✅ 허용" : row.허용여부 === "금지" ? "🚫 금지" : ""}</td>
                  <td className="border px-4 py-2">{row.승인상태}</td>
                </tr>
              );
            })}
            {rows.length === 0 && (<tr><td className="border px-4 py-6 text-center" colSpan={6}>데이터 없음</td></tr>)}
          </tbody>
        </table>
      </div>
    </main>
  );
}
