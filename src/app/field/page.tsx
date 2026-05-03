export const dynamic = "force-dynamic";
import { SafeNav } from "@/components/SafeLayout";
import Link from "next/link";

const PTW_REQUIRED_TAGS = ["고소작업", "밀폐공간", "화학/MSDS", "용접/용단", "전기"];

async function getFieldData() {
  const headers = {
    Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json",
  };
  const apiBase = "https://api.notion.com/v1/databases";
  const today = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
  const thisWeek = new Date(Date.now() + 9 * 3600000 - 7 * 86400000).toISOString().slice(0, 10);

  const [tbmRes, ptwRes] = await Promise.all([
    fetch(`${apiBase}/${process.env.NOTION_TBM_DB_ID}/query`, {
      method: "POST", headers,
      body: JSON.stringify({ page_size: 100, sorts: [{ property: "날짜", direction: "descending" }] }),
      cache: "no-store",
    }),
    fetch(`${apiBase}/${process.env.NOTION_PTW_DB_ID}/query`, {
      method: "POST", headers,
      body: JSON.stringify({ page_size: 20, sorts: [{ property: "작업일", direction: "descending" }] }),
      cache: "no-store",
    }),
  ]);

  const [tbmData, ptwData] = await Promise.all([tbmRes.json(), ptwRes.json()]);

  const tbmRows = (tbmData.results ?? []).map((p: any) => ({
    id: p.id,
    작업명: p.properties["작업명"]?.title?.[0]?.plain_text ?? "",
    날짜: p.properties["날짜"]?.date?.start ?? "",
    특이사항: p.properties["특이사항"]?.checkbox ?? false,
    조치상태: p.properties["조치 상태"]?.select?.name ?? "",
    연결EB: p.properties["연결 EB"]?.relation?.length ?? 0,
    작업태그: p.properties["작업 태그"]?.multi_select?.map((t: any) => t.name) ?? [],
    주의사항: p.properties["오늘의 주의사항"]?.rich_text?.[0]?.plain_text ?? "",
  }));

  const ptwRows = (ptwData.results ?? []).map((p: any) => ({
    id: p.id,
    제목: p.properties["허가서 제목/번호 (예W-대도-20260324-고소-001)"]?.title?.[0]?.plain_text ?? "",
    작업일: p.properties["작업일"]?.date?.start ?? "",
    작업유형: p.properties["작업유형"]?.select?.name ?? "",
    승인상태: p.properties["승인상태"]?.select?.name ?? "",
    허용여부: p.properties["작업 허용 여부"]?.select?.name ?? "",
  }));

  const 오늘TBM = tbmRows.filter((r: any) => r.날짜 === today);
  const 이번주TBM = tbmRows.filter((r: any) => r.날짜 >= thisWeek);
  const EB누락 = tbmRows.filter((r: any) => r.특이사항 && r.연결EB === 0);
  const 조치필요 = tbmRows.filter((r: any) => r.조치상태 === "조치 필요");
  const PTW미승인 = ptwRows.filter((r: any) => r.승인상태 === "요청");
  const PTW위험 = ptwRows.filter((r: any) => r.허용여부 === "금지" || r.승인상태 === "반려");

  // 작업 전 체크리스트
  const checklist = [
    { done: 오늘TBM.length > 0, text: "오늘 TBM 작성", href: "/tbm", urgent: true },
    { done: EB누락.length === 0, text: `EB 누락 없음${EB누락.length > 0 ? ` (${EB누락.length}건 미등록)` : ""}`, href: "/ebm", urgent: true },
    { done: 조치필요.length === 0, text: `조치 미완료 없음${조치필요.length > 0 ? ` (${조치필요.length}건)` : ""}`, href: "/tbm", urgent: false },
    { done: PTW미승인.length === 0, text: `PTW 승인 대기 없음${PTW미승인.length > 0 ? ` (${PTW미승인.length}건)` : ""}`, href: "/ptw", urgent: false },
    { done: PTW위험.length === 0, text: `PTW 금지/반려 없음${PTW위험.length > 0 ? ` (${PTW위험.length}건 위험)` : ""}`, href: "/ptw", urgent: true },
  ];

  // PTW 필요 감지 (오늘 TBM 기준)
  const PTW필요태그: string[] = [];
  오늘TBM.forEach((r: any) => {
    r.작업태그.forEach((t: string) => {
      if (PTW_REQUIRED_TAGS.includes(t) && !PTW필요태그.includes(t)) PTW필요태그.push(t);
    });
  });
  const 오늘PTW = ptwRows.filter((r: any) => r.작업일 === today);
  const PTW필요미제출 = PTW필요태그.length > 0 && 오늘PTW.length === 0;

  // 잘된 점 멘트
  const 칭찬멘트: string[] = [];
  if (이번주TBM.length >= 5) 칭찬멘트.push(`📅 이번 주 TBM ${이번주TBM.length}건 제출 — 꾸준한 안전 기록 수고하셨습니다!`);
  if (EB누락.length === 0 && tbmRows.filter((r: any) => r.특이사항).length > 0) 칭찬멘트.push("✅ 특이사항 발생 건 모두 EB 연결 완료 — 증거 완결성 우수!");
  if (조치필요.length === 0) 칭찬멘트.push("🟢 미조치 건 없음 — 현장 조치 대응 우수!");
  if (칭찬멘트.length === 0) 칭찬멘트.push("💪 오늘도 현장 안전 관리 함께 해주셔서 감사합니다!");

  return {
    today, 오늘TBM, 이번주TBM, EB누락, 조치필요, PTW미승인, PTW위험,
    checklist, PTW필요태그, PTW필요미제출, 칭찬멘트,
    전체미완료: checklist.filter(c => !c.done).length,
  };
}

export default async function FieldPage() {
  const d = await getFieldData();
  const now = new Date(Date.now() + 9 * 3600000);
  const timeStr = now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  const dateStr = now.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" });

  return (
    <main className="min-h-screen bg-gray-950 pb-10">
      <SafeNav />
      <div className="p-4 max-w-2xl mx-auto">

        {/* 헤더 */}
        <div className="mb-5 mt-2">
          <h1 className="text-white text-xl font-bold">👷 현장 비서</h1>
          <p className="text-gray-400 text-sm mt-0.5">{dateStr} · {timeStr} · 관리감독자·안전담당자 전용</p>
        </div>

        {/* PTW 긴급 경고 */}
        {d.PTW필요미제출 && (
          <div className="bg-red-950 border border-red-700 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">🚨</span>
              <span className="text-red-300 font-bold text-sm">PTW 미제출 — 법적 의무 위반 위험</span>
            </div>
            <p className="text-red-200 text-xs">오늘 TBM에 고위험 작업 태그({d.PTW필요태그.join(", ")})가 있으나 PTW가 제출되지 않았습니다.</p>
            <Link href="/ptw">
              <div className="mt-2 bg-red-800 rounded-lg p-2 text-center text-red-100 text-sm font-medium hover:bg-red-700 transition">
                → PTW 제출하기
              </div>
            </Link>
          </div>
        )}

        {/* 작업 전 체크리스트 */}
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">📋</span>
              <span className="text-white font-bold text-sm">작업 전 체크리스트</span>
            </div>
            <span className={`text-sm font-bold ${d.전체미완료 > 0 ? "text-red-400" : "text-green-400"}`}>
              {d.checklist.filter(c => c.done).length}/{d.checklist.length} 완료
            </span>
          </div>
          <div className="space-y-2">
            {d.checklist.map((c, i) => (
              <Link key={i} href={c.href}>
                <div className={`flex items-center gap-3 p-3 rounded-lg hover:opacity-80 transition cursor-pointer ${
                  c.done ? "bg-gray-800" : c.urgent ? "bg-red-900/40 border border-red-800" : "bg-yellow-900/30 border border-yellow-800"
                }`}>
                  <span className="text-lg">{c.done ? "✅" : c.urgent ? "🔴" : "🟡"}</span>
                  <span className={`text-sm ${c.done ? "text-gray-400 line-through" : c.urgent ? "text-red-200 font-medium" : "text-yellow-200"}`}>
                    {c.text}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* 오늘 TBM 현황 */}
        <div className={`rounded-2xl border p-4 mb-4 ${d.오늘TBM.length > 0 ? "bg-blue-950 border-blue-800" : "bg-orange-950 border-orange-800"}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">📝</span>
              <span className="text-white font-bold text-sm">오늘 TBM</span>
            </div>
            <span className={`text-sm font-bold ${d.오늘TBM.length > 0 ? "text-blue-300" : "text-orange-300"}`}>
              {d.오늘TBM.length > 0 ? `${d.오늘TBM.length}건 제출됨` : "미제출"}
            </span>
          </div>
          {d.오늘TBM.length > 0 ? (
            <div className="space-y-2">
              {d.오늘TBM.map((r: any) => (
                <Link key={r.id} href={`/tbm/${r.id}`}>
                  <div className="bg-blue-900/40 rounded-lg p-3 hover:bg-blue-900/60 transition cursor-pointer">
                    <div className="text-white text-sm font-medium">{r.작업명}</div>
                    {r.작업태그.length > 0 && (
                      <div className="flex gap-1 flex-wrap mt-1">
                        {r.작업태그.map((t: string) => (
                          <span key={t} className={`px-2 py-0.5 rounded-full text-xs ${PTW_REQUIRED_TAGS.includes(t) ? "bg-red-800 text-red-200" : "bg-blue-800 text-blue-200"}`}>
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                    {r.특이사항 && r.연결EB === 0 && (
                      <p className="text-red-300 text-xs mt-1">⚠️ 특이사항 있음 — EB 등록 필요</p>
                    )}
                    {r.조치상태 === "조치 필요" && (
                      <p className="text-yellow-300 text-xs mt-1">🟡 조치 상태 업데이트 필요</p>
                    )}
                    {r.주의사항 && (
                      <p className="text-blue-300 text-xs mt-1">📌 {r.주의사항}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div>
              <p className="text-orange-200 text-sm mb-2">오늘 TBM이 아직 제출되지 않았습니다.</p>
              <a href="https://www.notion.so" target="_blank" rel="noopener noreferrer"
                className="block w-full text-center py-2 rounded-lg bg-orange-800 hover:bg-orange-700 text-white text-sm transition">
                📋 Notion 폼에서 TBM 작성하기
              </a>
            </div>
          )}
        </div>

        {/* 미조치 항목 */}
        {(d.EB누락.length > 0 || d.조치필요.length > 0) && (
          <div className="bg-yellow-950 border border-yellow-800 rounded-2xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">⚡</span>
              <span className="text-white font-bold text-sm">지금 바로 처리할 것</span>
            </div>
            <div className="space-y-2">
              {d.EB누락.slice(0, 3).map((r: any) => (
                <Link key={r.id} href={`/tbm/${r.id}`}>
                  <div className="bg-red-900/40 rounded-lg p-3 hover:bg-red-900/60 transition cursor-pointer">
                    <div className="text-white text-sm font-medium">{r.작업명}</div>
                    <div className="text-red-300 text-xs mt-0.5">{r.날짜} · EB 미등록 — 즉시 등록</div>
                  </div>
                </Link>
              ))}
              {d.조치필요.slice(0, 3).map((r: any) => (
                <Link key={r.id} href={`/tbm/${r.id}`}>
                  <div className="bg-yellow-900/40 rounded-lg p-3 hover:bg-yellow-900/60 transition cursor-pointer">
                    <div className="text-white text-sm font-medium">{r.작업명}</div>
                    <div className="text-yellow-300 text-xs mt-0.5">{r.날짜} · 조치 상태 업데이트 필요</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 칭찬 멘트 */}
        <div className="bg-green-950 border border-green-800 rounded-2xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🏆</span>
            <span className="text-white font-bold text-sm">현장 안전 현황</span>
          </div>
          <div className="space-y-1">
            {d.칭찬멘트.map((m, i) => (
              <p key={i} className="text-green-200 text-sm">{m}</p>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-green-800 flex justify-between text-xs text-green-400">
            <span>이번 주 TBM: {d.이번주TBM.length}건</span>
            <span>미조치: {d.EB누락.length + d.조치필요.length}건</span>
            <span>PTW 대기: {d.PTW미승인.length}건</span>
          </div>
        </div>

        {/* 바로가기 */}
        <div className="grid grid-cols-3 gap-2">
          <Link href="/tbm" className="bg-gray-900 border border-gray-700 hover:border-blue-600 rounded-xl p-3 text-center transition">
            <div className="text-xl mb-1">📋</div>
            <div className="text-white text-xs font-medium">TBM</div>
          </Link>
          <Link href="/ebm" className="bg-gray-900 border border-gray-700 hover:border-emerald-600 rounded-xl p-3 text-center transition">
            <div className="text-xl mb-1">📚</div>
            <div className="text-white text-xs font-medium">EB</div>
          </Link>
          <Link href="/ptw" className="bg-gray-900 border border-gray-700 hover:border-orange-600 rounded-xl p-3 text-center transition">
            <div className="text-xl mb-1">🧾</div>
            <div className="text-white text-xs font-medium">PTW</div>
          </Link>
        </div>

      </div>
    </main>
  );
}
