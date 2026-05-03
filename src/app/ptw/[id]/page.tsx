export const dynamic = "force-dynamic";
import { SafeNav, StatusBadge } from "@/components/SafeLayout";
import Link from "next/link";

async function getPtwDetail(id: string) {
  const res = await fetch(`{{https://api.notion.com/v1/pages/${id}}}`, {
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
    제목: p["허가서 제목/번호 (예W-대도-20260324-고소-001)"]?.title?.[0]?.plain_text ?? "(제목 없음)",
    작업일: p["작업일"]?.date?.start ?? "",
    작업유형: p["작업유형"]?.select?.name ?? "",
    작업명: p["작업명"]?.rich_text?.[0]?.plain_text ?? "",
    작업장소: p["작업장소"]?.rich_text?.[0]?.plain_text ?? "",
    작업요청자: p["작업요청자(현장실무자)"]?.rich_text?.[0]?.plain_text ?? "",
    승인상태: p["승인상태"]?.select?.name ?? "",
    허용여부: p["작업 허용 여부"]?.select?.name ?? "",
    안전조치확인: p["안전조치 확인"]?.select?.name ?? "",
    특이사항: p["특이사항 있음"]?.checkbox ?? false,
    특이사항내용: p["특이사항 내용"]?.rich_text?.[0]?.plain_text ?? "",
    비고: p["비고"]?.rich_text?.[0]?.plain_text ?? "",
    Dday: p["D-day"]?.formula?.string ?? "",
  };
}

const 유형아이콘: Record<string, string> = {
  "화기작업": "🔥", "밀폐공간작업": "⚠️", "고소작업": "🪜",
  "정비작업": "🔧", "전기작업": "⚡", "기타": "📋",
};

export default async function PtwDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = await Promise.resolve(params);
  const ptw = await getPtwDetail(id);
  const isDanger = ptw.허용여부 === "금지" || ptw.승인상태 === "반려";

  return (
    <main className="min-h-screen bg-gray-950 pb-10">
      <SafeNav />
      <div className="max-w-2xl mx-auto px-4 py-8 text-white">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/ptw" className="text-gray-400 hover:text-white text-sm">
            ← PTW 목록
          </Link>
        </div>

        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">{유형아이콘[ptw.작업유형] ?? "📋"}</span>
          <h1 className="text-xl font-bold">{ptw.제목}</h1>
        </div>
        <p className="text-gray-400 text-sm mb-6">{ptw.작업일}{ptw.Dday ? ` · ${ptw.Dday}` : ""}</p>

        {isDanger && (
          <div className="bg-red-950 border border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-400 text-sm font-medium">🚨 금지/반려 — 즉시 확인 필요</p>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-6">
          {ptw.승인상태 && <StatusBadge status={ptw.승인상태} />}
          {ptw.허용여부 && <StatusBadge status={ptw.허용여부} />}
          {ptw.안전조치확인 && (
            <span className={`px-3 py-1 rounded-full text-xs border ${ptw.안전조치확인 === "확인" ? "bg-green-900 text-green-300 border-green-700" : "bg-red-900 text-red-300 border-red-700"}`}>
              안전조치 {ptw.안전조치확인}
            </span>
          )}
          {ptw.특이사항 && (
            <span className="px-3 py-1 rounded-full text-xs border bg-yellow-900 text-yellow-300 border-yellow-700">
              ⚠️ 특이사항 있음
            </span>
          )}
        </div>

        <div className="bg-gray-900 border border-gray-700 rounded-lg p-5 space-y-4 mb-6">
          {ptw.작업명 && (
            <div>
              <p className="text-xs text-gray-500 mb-1">작업명</p>
              <p className="text-sm">{ptw.작업명}</p>
            </div>
          )}
          {ptw.작업유형 && (
            <div>
              <p className="text-xs text-gray-500 mb-1">작업 유형</p>
              <p className="text-sm">{ptw.작업유형}</p>
            </div>
          )}
          {ptw.작업장소 && (
            <div>
              <p className="text-xs text-gray-500 mb-1">작업 장소</p>
              <p className="text-sm">{ptw.작업장소}</p>
            </div>
          )}
          {ptw.작업요청자 && (
            <div>
              <p className="text-xs text-gray-500 mb-1">작업 요청자</p>
              <p className="text-sm">{ptw.작업요청자}</p>
            </div>
          )}
          {ptw.특이사항내용 && (
            <div>
              <p className="text-xs text-gray-500 mb-1">특이사항 내용</p>
              <p className="text-sm text-gray-300">{ptw.특이사항내용}</p>
            </div>
          )}
          {ptw.비고 && (
            <div>
              <p className="text-xs text-gray-500 mb-1">비고</p>
              <p className="text-sm text-gray-300">{ptw.비고}</p>
            </div>
          )}
        </div>

        <a
          href={ptw.notionUrl}
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
