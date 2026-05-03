export const dynamic = "force-dynamic";
import { SafeNav } from "@/components/SafeLayout";
import Link from "next/link";

async function getEbDetail(id: string) {
  const res = await fetch(`https://api.notion.com/v1/pages/${id}`, {
    headers: {
      Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
      "Notion-Version": "2022-06-28",
    },
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Notion API error");
  const p = data.properties;
  return {
    id: data.id,
    notionUrl: data.url,
    증빙명: p["증빙명"]?.title?.[0]?.plain_text ?? "(제목 없음)",
    등록일: p["등록일"]?.date?.start ?? "",
    증빙유형: p["증빙유형"]?.select?.name ?? "",
    비고: p["비고"]?.rich_text?.[0]?.plain_text ?? "",
    관련TBM: p["관련 TBM"]?.relation?.length ?? 0,
    관련PTW: p["관련 PTW"]?.relation?.length ?? 0,
  };
}

const 유형색: Record<string, string> = {
  "사진": "bg-blue-900 text-blue-300 border-blue-700",
  "TBM기록": "bg-emerald-900 text-emerald-300 border-emerald-700",
  "작업허가서": "bg-orange-900 text-orange-300 border-orange-700",
  "점검표": "bg-yellow-900 text-yellow-300 border-yellow-700",
  "교육기록": "bg-purple-900 text-purple-300 border-purple-700",
};

export default async function EbDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = await Promise.resolve(params);
  const eb = await getEbDetail(id);

  return (
    <main className="min-h-screen bg-gray-950 pb-10">
      <SafeNav />
      <div className="max-w-2xl mx-auto px-4 py-8 text-white">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/ebm" className="text-gray-400 hover:text-white text-sm">
            ← EB 목록
          </Link>
        </div>

        <h1 className="text-2xl font-bold mb-1">{eb.증빙명}</h1>
        <p className="text-gray-400 text-sm mb-6">{eb.등록일}</p>

        <div className="flex flex-wrap gap-2 mb-6">
          {eb.증빙유형 && (
            <span className={`px-3 py-1 rounded-full text-xs border ${유형색[eb.증빙유형] ?? "bg-gray-700 text-gray-300 border-gray-600"}`}>
              {eb.증빙유형}
            </span>
          )}
          {eb.관련TBM > 0 && (
            <span className="px-3 py-1 rounded-full text-xs border bg-blue-900 text-blue-300 border-blue-700">
              ✅ TBM {eb.관련TBM}건 연결
            </span>
          )}
          {eb.관련PTW > 0 && (
            <span className="px-3 py-1 rounded-full text-xs border bg-orange-900 text-orange-300 border-orange-700">
              ✅ PTW {eb.관련PTW}건 연결
            </span>
          )}
        </div>

        {eb.비고 && (
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-5 mb-6">
            <p className="text-xs text-gray-500 mb-1">비고</p>
            <p className="text-sm text-gray-300">{eb.비고}</p>
          </div>
        )}

        <a
          href={eb.notionUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center py-3 rounded-lg border border-gray-600 text-gray-400 hover:text-white hover:border-gray-400 text-sm transition"
        >
          📎 노션 원문 열기
        </a>
      </div>
    </main>
  );
}
