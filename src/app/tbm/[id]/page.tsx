export const dynamic = "force-dynamic";
import { SafeNav } from "@/components/SafeLayout";
import Link from "next/link";

async function getTbmDetail(id: string) {
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
    작업명: p["작업명"]?.title?.[0]?.plain_text ?? "(작업명 없음)",
    날짜: p["날짜"]?.date?.start ?? "",
    특이사항: p["특이사항"]?.checkbox ?? false,
    특이사항내용: p["특이사항 내용"]?.rich_text?.[0]?.plain_text ?? "",
    조치상태: p["조치 상태"]?.select?.name ?? "",
    연결EB: p["연결 EB"]?.relation?.length ?? 0,
    작업태그: p["작업 태그"]?.multi_select?.map((t: any) => t.name) ?? [],
    작업유형: p["작업 유형"]?.select?.name ?? "",
    오늘주의사항: p["오늘의 주의사항"]?.rich_text?.[0]?.plain_text ?? "",
  };
}

export default async function TbmDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const tbm = await getTbmDetail(params.id);
  const needsEB = tbm.특이사항 && tbm.연결EB === 0;

  return (
    <SafeNav>
      <div className="max-w-2xl mx-auto px-4 py-8 text-white">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/tbm" className="text-gray-400 hover:text-white text-sm">
            ← TBM 목록
          </Link>
        </div>

        <h1 className="text-2xl font-bold mb-1">{tbm.작업명}</h1>
        <p className="text-gray-400 text-sm mb-6">{tbm.날짜}</p>

        <div className="flex flex-wrap gap-2 mb-6">
          {tbm.특이사항 ? (
            <span className="px-3 py-1 rounded-full text-xs bg-yellow-900 text-yellow-300 border border-yellow-700">
              ⚠️ 특이사항 있음
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full text-xs bg-gray-800 text-gray-400 border border-gray-700">
              특이사항 없음
            </span>
          )}
          {tbm.조치상태 && (
            <span
              className={`px-3 py-1 rounded-full text-xs border ${
                tbm.조치상태 === "조치 필요"
                  ? "bg-red-900 text-red-300 border-red-700"
                  : "bg-green-900 text-green-300 border-green-700"
              }`}
            >
              {tbm.조치상태}
            </span>
          )}
          <span
            className={`px-3 py-1 rounded-full text-xs border ${
              tbm.연결EB > 0
                ? "bg-green-900 text-green-300 border-green-700"
                : tbm.특이사항
                ? "bg-red-900 text-red-300 border-red-700"
                : "bg-gray-800 text-gray-400 border-gray-700"
            }`}
          >
            {tbm.연결EB > 0 ? `✅ EB ${tbm.연결EB}건 연결` : "EB 없음"}
          </span>
        </div>

        {needsEB && (
          <div className="bg-red-950 border border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-400 text-sm font-medium">
              🔴 특이사항 발생 건 — Evidence Book 등록 필요
            </p>
          </div>
        )}

        <div className="bg-gray-900 border border-gray-700 rounded-lg p-5 space-y-4 mb-6">
          {tbm.작업유형 && (
            <div>
              <p className="text-xs text-gray-500 mb-1">작업 유형</p>
              <p className="text-sm">{tbm.작업유형}</p>
            </div>
          )}
          {tbm.작업태그.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-1">작업 태그</p>
              <div className="flex flex-wrap gap-1">
                {tbm.작업태그.map((tag: string) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 text-xs rounded bg-gray-800 border border-gray-600 text-gray-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
          {tbm.오늘주의사항 && (
            <div>
              <p className="text-xs text-gray-500 mb-1">오늘의 주의사항</p>
              <p className="text-sm text-gray-300">{tbm.오늘주의사항}</p>
            </div>
          )}
          {tbm.특이사항내용 && (
            <div>
              <p className="text-xs text-gray-500 mb-1">특이사항 내용</p>
              <p className="text-sm text-gray-300">{tbm.특이사항내용}</p>
            </div>
          )}
        </div>

        <a
          href={tbm.notionUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center py-3 rounded-lg border border-gray-600 text-gray-400 hover:text-white hover:border-gray-400 text-sm transition"
        >
          📎 노션 원문 열기
        </a>
      </div>
    </SafeNav>
  );
}
