export const dynamic = "force-dynamic";

async function getEbRows() {
  const apiBase = "https://api.notion.com/v1/databases";
  const res = await fetch(`${apiBase}/${process.env.NOTION_EBM_DB_ID}/query`, {
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
  }));
}

export default async function EbmPage() {
  const rows = await getEbRows();
  return (
    <main className="p-6">
      <div className="mb-4"><a href="/" className="text-blue-600 hover:underline text-sm">← 홈으로</a></div>
      <h1 className="mb-6 text-2xl font-bold">📚 Evidence Book</h1>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-4 py-2 text-left">증빙명</th>
              <th className="border px-4 py-2 text-left">등록일</th>
              <th className="border px-4 py-2 text-left">유형</th>
              <th className="border px-4 py-2 text-left">연결TBM</th>
              <th className="border px-4 py-2 text-left">연결PTW</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row: any) => (
              <tr key={row.id} className="bg-white hover:bg-gray-50">
                <td className="border px-4 py-2">{row.증빙명}</td>
                <td className="border px-4 py-2">{row.등록일}</td>
                <td className="border px-4 py-2">{row.증빙유형}</td>
                <td className="border px-4 py-2">{row.관련TBM > 0 ? `${row.관련TBM}건` : "없음"}</td>
                <td className="border px-4 py-2">{row.관련PTW > 0 ? `${row.관련PTW}건` : "없음"}</td>
              </tr>
            ))}
            {rows.length === 0 && (<tr><td className="border px-4 py-6 text-center" colSpan={5}>데이터 없음</td></tr>)}
          </tbody>
        </table>
      </div>
    </main>
  );
}
