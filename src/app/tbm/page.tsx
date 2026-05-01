import { NOTION_API_KEY, NOTION_TBM_DB_ID } from "@/lib/notion";
export const dynamic = "force-dynamic";

async function getTbmRows() {
  const res = await fetch(`https://api.notion.com/v1/databases/${NOTION_TBM_DB_ID}/query`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${NOTION_API_KEY}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
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
    연결EBCount: page.properties["연결 EB"]?.relation?.length ?? 0,
  }));
}

export default async function TbmPage() {
  const rows = await getTbmRows();
  return (
    <main className="p-6"><div className="mb-4"><a href="/" className="text-blue-600 hover:underline text-sm">← 홈으로</a></div>
      <h1 className="mb-6 text-2xl font-bold">🛡️ TBM 목록</h1>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-4 py-2 text-left">작업명</th>
              <th className="border px-4 py-2 text-left">날짜</th>
              <th className="border px-4 py-2 text-left">특이사항</th>
              <th className="border px-4 py-2 text-left">조치상태</th>
              <th className="border px-4 py-2 text-left">연결EB</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row: any) => {
              const needsEb = row.특이사항 && row.연결EBCount === 0;
              return (
                <tr key={row.id} className={needsEb ? "bg-red-100 text-red-900" : "bg-white"}>
                  <td className="border px-4 py-2">{row.작업명}</td>
                  <td className="border px-4 py-2">{row.날짜}</td>
                  <td className="border px-4 py-2">{row.특이사항 ? "✅ 예" : "아니오"}</td>
                  <td className="border px-4 py-2">{row.조치상태}</td>
                  <td className="border px-4 py-2">{row.연결EBCount > 0 ? `${row.연결EBCount}건` : "없음"}</td>
                </tr>
              );
            })}
            {rows.length === 0 && (<tr><td className="border px-4 py-6 text-center" colSpan={5}>데이터 없음</td></tr>)}
          </tbody>
        </table>
      </div>
    </main>
  );
}
