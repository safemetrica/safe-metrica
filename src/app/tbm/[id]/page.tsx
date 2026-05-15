export const dynamic = "force-dynamic";
import { SafeNav } from "@/components/SafeLayout";
import Link from "next/link";
import { evaluateTbmEvidence } from "@/lib/tbmEvidence";

function getNotionFileCount(props: any, names: string[]): number {
  for (const name of names) {
    const prop = props[name];
    if (!prop) continue;
    if (Array.isArray(prop.files)) return prop.files.length;
  }
  return 0;
}


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
    참석서명사진수: getNotionFileCount(p, [
      "TBM 참석서명사진",
      "참석 서명사진",
      "참석서명사진",
      "근로자 서명사진",
      "근로자서명사진",
      "서명사진",
      "참석자 서명사진",
    ]),
    체조사진수: getNotionFileCount(p, [
      "TBM 체조사진",
      "체조사진",
      "작업 전 체조사진",
      "작업전 체조사진",
      "작업 전 활동사진",
      "작업전 활동사진",
      "안전체조사진",
      "안전 활동사진",
    ]),
    기타증빙사진수: getNotionFileCount(p, [
      "TBM 증빙사진",
      "증빙사진",
      "작업 전 사진",
      "작업전사진",
      "현장사진",
      "사진",
      "첨부사진",
    ]),
  };
}

export default async function TbmDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = await Promise.resolve(params);
  const tbm = await getTbmDetail(id);
  const needsEB = tbm.특이사항 && tbm.연결EB === 0;
  const totalEvidencePhotoCount = tbm.참석서명사진수 + tbm.체조사진수 + tbm.기타증빙사진수;
  const evidenceCheck = evaluateTbmEvidence({
    hasSignaturePhoto: tbm.참석서명사진수 > 0,
    hasExercisePhoto: tbm.체조사진수 > 0,
    hasAnyEvidencePhoto: totalEvidencePhotoCount > 0,
    hasCautionText: Boolean(tbm.오늘주의사항?.trim()),
    hasTaskName: Boolean(tbm.작업명 && tbm.작업명 !== "(작업명 없음)"),
  });
  const evidenceTone =
    evidenceCheck.status === "적합"
      ? "border-emerald-800 bg-emerald-950/40 text-emerald-200"
      : evidenceCheck.status === "보완 필요"
        ? "border-amber-800 bg-amber-950/35 text-amber-200"
        : evidenceCheck.status === "부적합"
          ? "border-red-800 bg-red-950/35 text-red-200"
          : "border-slate-700 bg-slate-900 text-slate-300";

  return (
    <main className="min-h-screen bg-gray-950 pb-10">
      <SafeNav />
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
            <span className={`px-3 py-1 rounded-full text-xs border ${tbm.조치상태 === "조치 필요" ? "bg-red-900 text-red-300 border-red-700" : "bg-green-900 text-green-300 border-green-700"}`}>
              {tbm.조치상태}
            </span>
          )}
          <span className={`px-3 py-1 rounded-full text-xs border ${tbm.연결EB > 0 ? "bg-green-900 text-green-300 border-green-700" : tbm.특이사항 ? "bg-red-900 text-red-300 border-red-700" : "bg-gray-800 text-gray-400 border-gray-700"}`}>
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
                  <span key={tag} className="px-2 py-0.5 text-xs rounded bg-gray-800 border border-gray-600 text-gray-300">
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

        <div className={`rounded-lg border p-5 mb-6 ${evidenceTone}`}>
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg">🧾</span>
                <span className="text-sm font-bold text-white">AI TBM 증빙 확인</span>
              </div>
              <p className="mt-1 text-xs text-gray-400">
                참석 서명사진, 체조사진, 오늘의 주의사항 기록을 기준으로 TBM 증빙력을 자동 확인합니다.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-gray-950/50 px-3 py-1 text-xs font-bold">
              {evidenceCheck.status}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
            <div className="rounded-lg bg-gray-950/40 p-3 text-center">
              <div className="text-xs text-gray-400">증빙 점수</div>
              <div className="mt-1 text-2xl font-black text-white">{evidenceCheck.score}</div>
              <div className="text-xs text-gray-500">/ 100</div>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-gray-400 mb-1">판단</p>
                <p className="text-sm leading-relaxed text-gray-100 [word-break:keep-all]">
                  {evidenceCheck.reason}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-400 mb-1">보완 요청</p>
                <p className="text-sm leading-relaxed text-gray-200 [word-break:keep-all]">
                  {evidenceCheck.suggestion}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <div className="rounded-lg bg-gray-950/35 p-3">
              <p className="text-xs text-gray-500">참석 서명사진</p>
              <p className="mt-1 text-sm font-bold text-white">{tbm.참석서명사진수}건</p>
            </div>
            <div className="rounded-lg bg-gray-950/35 p-3">
              <p className="text-xs text-gray-500">체조/안전활동 사진</p>
              <p className="mt-1 text-sm font-bold text-white">{tbm.체조사진수}건</p>
            </div>
            <div className="rounded-lg bg-gray-950/35 p-3">
              <p className="text-xs text-gray-500">기타 증빙사진</p>
              <p className="mt-1 text-sm font-bold text-white">{tbm.기타증빙사진수}건</p>
            </div>
          </div>
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
    </main>
  );
}
