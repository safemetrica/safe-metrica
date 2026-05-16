export const dynamic = "force-dynamic";
import { SafeNav } from "@/components/SafeLayout";
import Link from "next/link";
import { evaluateTbmEvidence } from "@/lib/tbmEvidence";
import { evaluateActionEvidence } from "@/lib/actionEvidence";
import { classifyNotionPhotoFields } from "@/lib/photoClassification";
import { findImprovementEvidence } from "@/lib/improvementEvidenceRules";
import { getCompanyConfig } from "@/lib/company";
import { getRiskIntelligenceData } from "@/lib/risk";
import { matchTbmToRiskItems } from "@/lib/tbmRiskLink";
import { detectVehicleTbmIntent } from "@/lib/vehicleTbmIntent";
import { evaluateImprovementTracking, summarizeImprovementTracking } from "@/lib/improvementTracking";

function getNotionFileCountsByPurpose(props: any) {
  let signature = 0;
  let safetyActivity = 0;
  let workTarget = 0;
  let action = 0;
  let other = 0;

  for (const [name, prop] of Object.entries(props) as any) {
    const files = prop?.files;
    if (!Array.isArray(files) || files.length === 0) continue;

    const count = files.length;
    const normalized = String(name).replace(/\s+/g, "").toLowerCase();

    if (
      normalized.includes("서명") ||
      normalized.includes("참석") ||
      normalized.includes("출석") ||
      normalized.includes("sign")
    ) {
      signature += count;
      continue;
    }

    if (
      normalized.includes("조치") ||
      normalized.includes("개선") ||
      normalized.includes("완료") ||
      normalized.includes("전후") ||
      normalized.includes("beforeafter") ||
      normalized.includes("action")
    ) {
      action += count;
      continue;
    }

    if (
      normalized.includes("작업대상") ||
      normalized.includes("대상") ||
      normalized.includes("작업사진") ||
      normalized.includes("축대") ||
      normalized.includes("공사") ||
      normalized.includes("시설") ||
      normalized.includes("설비") ||
      normalized.includes("장비") ||
      normalized.includes("차량")
    ) {
      workTarget += count;
      continue;
    }

    if (
      normalized.includes("체조") ||
      normalized.includes("스트레칭") ||
      normalized.includes("현장사진") ||
      normalized.includes("현장") ||
      normalized.includes("안전활동") ||
      normalized.includes("브리핑") ||
      normalized.includes("교육") ||
      normalized.includes("tbm")
    ) {
      safetyActivity += count;
      continue;
    }

    if (
      normalized.includes("현장") ||
      normalized.includes("안전") ||
      normalized.includes("작업") ||
      normalized.includes("사진")
    ) {
      other += count;
      continue;
    }

    other += count;
  }

  return {
    signature,
    safetyActivity,
    workTarget,
    action,
    other,
  };
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
  const evidencePhotoCounts = getNotionFileCountsByPurpose(p);
  const photoClassification = classifyNotionPhotoFields(p);

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
    참석서명사진수: evidencePhotoCounts.signature,
    "작업 전 안전활동 사진수": evidencePhotoCounts.safetyActivity,
    작업대상사진수: evidencePhotoCounts.workTarget,
    조치사진수: evidencePhotoCounts.action,
    기타사진기록수: evidencePhotoCounts.other,
    사진분류: photoClassification,
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
  const totalEvidencePhotoCount =
    tbm.참석서명사진수 +
    tbm["작업 전 안전활동 사진수"] +
    tbm.작업대상사진수 +
    tbm.조치사진수 +
    tbm.기타사진기록수;
  const evidenceCheck = evaluateTbmEvidence({
    hasSignaturePhoto: tbm.참석서명사진수 > 0,
    hasExercisePhoto: tbm["작업 전 안전활동 사진수"] > 0,
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

  const actionEvidence = evaluateActionEvidence({
    taskName: tbm.작업명,
    cautionText: tbm.오늘주의사항,
    actionStatus: tbm.조치상태,
    hasIssue: tbm.특이사항,
    actionPhotoCount: tbm.작업대상사진수 + tbm.조치사진수,
  });

  const improvementEvidence = findImprovementEvidence(
    `${tbm.작업명} ${tbm.오늘주의사항} ${tbm.특이사항내용}`
  );

  const company = await getCompanyConfig();

  const riskData = await getRiskIntelligenceData(
    company.riskAssessmentDbId,
    company.notionApiKey
  );

  const tbmRiskText = `${tbm.작업명} ${tbm.오늘주의사항} ${tbm.특이사항내용}`;
  const vehicleIntent = detectVehicleTbmIntent(tbmRiskText);

  const linkedRiskItems = vehicleIntent.isAmbiguous
    ? []
    : matchTbmToRiskItems(tbmRiskText, riskData.items);

  const improvementTrackingItems = evaluateImprovementTracking({
    linkedRiskItems,
    actionPhotoCount: tbm.조치사진수,
    workTargetPhotoCount: tbm.작업대상사진수,
    hasTbmEvidence: evidenceCheck.status === "적합" || evidenceCheck.status === "보완 필요",
  });

  const improvementTrackingSummary = summarizeImprovementTracking(improvementTrackingItems);

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

        <div className="rounded-xl border border-cyan-800 bg-cyan-950/20 p-5 mb-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg">🧠</span>
                <h2 className="text-lg font-bold text-white">오늘 안전기록 요약</h2>
              </div>
              <p className="mt-1 text-sm text-gray-400">
                오늘 교육, 작업사진, 위험요인 연결 상태를 한눈에 확인합니다.
              </p>
            </div>
            <span className="rounded-full border border-cyan-700 bg-cyan-950/40 px-3 py-1 text-xs font-bold text-cyan-100">
              요약
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-lg bg-gray-950/40 p-3">
              <p className="text-xs text-gray-400">교육 기록</p>
              <p className="mt-1 text-base font-bold text-white">{evidenceCheck.status}</p>
            </div>
            <div className="rounded-lg bg-gray-950/40 p-3">
              <p className="text-xs text-gray-400">작업 확인</p>
              <p className="mt-1 text-base font-bold text-white">{actionEvidence.status}</p>
            </div>
            <div className="rounded-lg bg-gray-950/40 p-3">
              <p className="text-xs text-gray-400">연결된 위험요인</p>
              <p className="mt-1 text-base font-bold text-white">{improvementEvidence.length}건</p>
            </div>
            <div className="rounded-lg bg-gray-950/40 p-3">
              <p className="text-xs text-gray-400">사진 확인</p>
              <p className="mt-1 text-base font-bold text-white">{tbm.사진분류.items.length}개 필드</p>
            </div>
          </div>
        </div>

        <div className={`rounded-lg border p-5 mb-6 ${evidenceTone}`}>
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg">🧾</span>
                <span className="text-sm font-bold text-white">TBM 교육 기록 확인</span>
              </div>
              <p className="mt-1 text-xs text-gray-400">
                참석 서명사진, 작업 전 안전활동 사진, 오늘의 주의사항 기록을 기준으로 교육 기록이 잘 남았는지 확인합니다.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-gray-950/50 px-3 py-1 text-xs font-bold">
              {evidenceCheck.status}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
            <div className="rounded-lg bg-gray-950/40 p-3 text-center">
              <div className="text-xs text-gray-400">기록 점수</div>
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
              <p className="text-xs text-gray-500">작업 전 안전활동 사진</p>
              <p className="mt-1 text-sm font-bold text-white">{tbm["작업 전 안전활동 사진수"]}건</p>
            </div>
            <div className="rounded-lg bg-gray-950/35 p-3">
              <p className="text-xs text-gray-500">작업 대상사진</p>
              <p className="mt-1 text-sm font-bold text-white">{tbm.작업대상사진수}건</p>
            </div>
            <div className="rounded-lg bg-gray-950/35 p-3">
              <p className="text-xs text-gray-500">조치사진</p>
              <p className="mt-1 text-sm font-bold text-white">{tbm.조치사진수}건</p>
            </div>
            <div className="rounded-lg bg-gray-950/35 p-3">
              <p className="text-xs text-gray-500">기타 사진</p>
              <p className="mt-1 text-sm font-bold text-white">{tbm.기타사진기록수}건</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-blue-800 bg-blue-950/30 p-5 mb-6">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg">🛠️</span>
                <span className="text-sm font-bold text-white">오늘 작업사진 확인</span>
              </div>
              <p className="mt-1 text-xs text-gray-400">
                오늘 작업에 필요한 사진이 충분한지 확인합니다.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-gray-950/50 px-3 py-1 text-xs font-bold text-white">
              {actionEvidence.status}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 mb-4">
            <div className="rounded-lg bg-gray-950/35 p-3">
              <p className="text-xs text-gray-500">위험 수준</p>
              <p className="mt-1 text-sm font-bold text-white">{actionEvidence.level}</p>
            </div>
            <div className="rounded-lg bg-gray-950/35 p-3">
              <p className="text-xs text-gray-500">허가서 필요한 작업 여부</p>
              <p className="mt-1 text-sm font-bold text-white">
                {actionEvidence.needsPTW ? "확인 권장" : "낮음"}
              </p>
            </div>
            <div className="rounded-lg bg-gray-950/35 p-3">
              <p className="text-xs text-gray-500">오늘 작업 위험</p>
              <p className="mt-1 text-sm font-bold text-white">
                {actionEvidence.detectedKeywords.length > 0
                  ? actionEvidence.detectedKeywords.join(", ")
                  : "-"}
              </p>
            </div>
          </div>

          {actionEvidence.expectedEvidence.length > 0 && (
            <div className="rounded-lg bg-gray-950/35 p-3 mb-4">
              <p className="text-xs text-gray-500 mb-2">추가로 남기면 좋은 사진</p>
              <div className="flex flex-wrap gap-2">
                {actionEvidence.expectedEvidence.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-blue-700 bg-blue-950/40 px-2 py-1 text-xs text-blue-100"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold text-gray-400 mb-1">판단</p>
              <p className="text-sm leading-relaxed text-gray-100 [word-break:keep-all]">
                {actionEvidence.reason}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 mb-1">추천</p>
              <p className="text-sm leading-relaxed text-gray-200 [word-break:keep-all]">
                {actionEvidence.suggestion}
              </p>
            </div>
          </div>
        </div>

        {vehicleIntent.isAmbiguous && (
          <div className="rounded-lg border border-amber-800 bg-amber-950/25 p-5 mb-6">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">🚚</span>
                  <span className="text-sm font-bold text-white">
                    차량점검 내용 구분 필요
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  차량점검은 의미가 넓어서 어떤 점검인지 구체화가 필요합니다.
                </p>
              </div>
              <span className="rounded-full border border-amber-700 bg-amber-950/40 px-3 py-1 text-xs font-bold text-amber-100">
                확인 필요
              </span>
            </div>

            <div className="rounded-lg bg-gray-950/35 p-3 mb-3">
              <p className="text-xs text-gray-500 mb-1">안내</p>
              <p className="text-sm leading-relaxed text-gray-100 [word-break:keep-all]">
                {vehicleIntent.guidance}
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {[
                "출발 전 차량 안전점검",
                "후진 전 유도자 확인",
                "엔진오일·타이어 점검",
                "차량·보행자 동선 확인",
              ].map((example) => (
                <div
                  key={example}
                  className="rounded-lg border border-amber-800/60 bg-gray-950/30 px-3 py-2 text-xs text-amber-100"
                >
                  예: {example}
                </div>
              ))}
            </div>
          </div>
        )}

        {improvementTrackingItems.length > 0 && (
          <div className="rounded-lg border border-emerald-800 bg-emerald-950/20 p-5 mb-6">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">✅</span>
                  <span className="text-sm font-bold text-white">개선조치 진행현황</span>
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  위험요인별 안전조치가 TBM과 현장사진으로 얼마나 진행됐는지 확인합니다.
                </p>
              </div>
              <span className="rounded-full border border-emerald-700 bg-emerald-950/40 px-3 py-1 text-xs font-bold text-emerald-100">
                {improvementTrackingSummary.completed}완료 · {improvementTrackingSummary.inProgress}진행
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 mb-4">
              <div className="rounded-lg bg-gray-950/35 p-3">
                <p className="text-xs text-gray-500">전체</p>
                <p className="mt-1 text-sm font-bold text-white">{improvementTrackingSummary.total}건</p>
              </div>
              <div className="rounded-lg bg-gray-950/35 p-3">
                <p className="text-xs text-gray-500">완료</p>
                <p className="mt-1 text-sm font-bold text-emerald-200">{improvementTrackingSummary.completed}건</p>
              </div>
              <div className="rounded-lg bg-gray-950/35 p-3">
                <p className="text-xs text-gray-500">진행중</p>
                <p className="mt-1 text-sm font-bold text-blue-200">{improvementTrackingSummary.inProgress}건</p>
              </div>
              <div className="rounded-lg bg-gray-950/35 p-3">
                <p className="text-xs text-gray-500">미조치/확인</p>
                <p className="mt-1 text-sm font-bold text-amber-200">
                  {improvementTrackingSummary.notStarted + improvementTrackingSummary.needsReview}건
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {improvementTrackingItems.slice(0, 3).map((item) => (
                <div key={item.riskId} className="rounded-lg bg-gray-950/35 p-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-sm font-bold text-white">{item.riskTitle}</p>
                    <span className="rounded-full border border-emerald-700 bg-emerald-950/40 px-2 py-0.5 text-xs text-emerald-100">
                      {item.status} · {item.completionScore}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mb-2 [word-break:keep-all]">{item.reason}</p>
                  <p className="text-xs text-gray-200 [word-break:keep-all]">다음: {item.nextAction}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {linkedRiskItems.length > 0 && (
          <div className="rounded-lg border border-fuchsia-800 bg-fuchsia-950/20 p-5 mb-6">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">🔗</span>
                  <span className="text-sm font-bold text-white">
                    연결된 위험요인
                  </span>
                </div>

                <p className="mt-1 text-xs text-gray-400">
                  오늘 작업과 회사 위험관리표를 연결했습니다.
                </p>
              </div>

              <span className="rounded-full border border-fuchsia-700 bg-fuchsia-950/40 px-3 py-1 text-xs font-bold text-fuchsia-100">
                {linkedRiskItems.length}건 연결
              </span>
            </div>

            <div className="space-y-3">
              {linkedRiskItems.map((item: any) => (
                <div
                  key={item.id}
                  className="rounded-lg bg-gray-950/35 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="rounded-full bg-red-950/40 border border-red-700 px-2 py-0.5 text-xs text-red-200">
                      {item.riskLevel || "위험도"}
                    </span>

                    <span className="rounded-full bg-gray-900 px-2 py-0.5 text-xs text-gray-300">
                      점수 {item.riskScore ?? "-"}
                    </span>

                    <span className="rounded-full bg-fuchsia-950/40 border border-fuchsia-700 px-2 py-0.5 text-xs text-fuchsia-100">
                      매칭 {item.matchScore}
                    </span>
                  </div>

                  <p className="text-sm font-bold text-white mb-2">
                    {item.title || item.taskName}
                  </p>

                  {item.hazard && (
                    <p className="text-xs text-gray-400 mb-2">
                      위험요인: {item.hazard}
                    </p>
                  )}

                  {item.improvementPlan && (
                    <div className="rounded-lg bg-gray-900/60 p-3 mb-2">
                      <p className="text-xs text-gray-500 mb-1">
                        개선대책
                      </p>
                      <p className="text-xs text-gray-200 leading-relaxed">
                        {item.improvementPlan}
                      </p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 text-xs">
                    {item.owner && (
                      <span className="rounded-full border border-gray-700 px-2 py-1 text-gray-300">
                        담당: {item.owner}
                      </span>
                    )}

                    {item.dueDate && (
                      <span className="rounded-full border border-gray-700 px-2 py-1 text-gray-300">
                        기한: {item.dueDate}
                      </span>
                    )}

                    {item.status && (
                      <span className="rounded-full border border-gray-700 px-2 py-1 text-gray-300">
                        상태: {item.status}
                      </span>
                    )}
                  </div>

                  {item.matchedKeywords.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {item.matchedKeywords.map((keyword: string) => (
                        <span
                          key={keyword}
                          className="rounded-full border border-fuchsia-700 bg-fuchsia-950/40 px-2 py-1 text-[11px] text-fuchsia-100"
                        >
                          #{keyword}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {improvementEvidence.length > 0 && (
          <div className="rounded-lg border border-emerald-800 bg-emerald-950/20 p-5 mb-6">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">🧭</span>
                  <span className="text-sm font-bold text-white">연결된 위험요인 추가로 남기면 좋은 사진</span>
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  오늘 작업과 관련된 위험요인을 보고, 추가로 찍으면 좋은 사진을 알려줍니다.
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-gray-950/50 px-3 py-1 text-xs font-bold text-emerald-100">
                {improvementEvidence.length}개 연계
              </span>
            </div>

            <div className="space-y-3">
              {improvementEvidence.map((rule: any) => (
                <div key={rule.keyword} className="rounded-lg bg-gray-950/35 p-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-sm font-bold text-white">
                      {rule.keyword} · {rule.riskCategory}
                    </p>
                    <span className="rounded-full border border-emerald-700 bg-emerald-950/40 px-2 py-0.5 text-xs text-emerald-100">
                      안전조치 사진
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {rule.expectedEvidence.map((item: string) => (
                      <span
                        key={item}
                        className="rounded-full border border-emerald-700 bg-emerald-950/40 px-2 py-1 text-xs text-emerald-100"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tbm.사진분류.items.length > 0 && (
          <div className="rounded-lg border border-cyan-800 bg-cyan-950/20 p-5 mb-6">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">📷</span>
                  <span className="text-sm font-bold text-white">등록된 사진 확인</span>
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  올린 사진이 어떤 용도인지 먼저 구분합니다.
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-gray-950/50 px-3 py-1 text-xs font-bold text-cyan-100">
                {tbm.사진분류.items.length}개 필드
              </span>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {tbm.사진분류.items.map((item: any) => (
                <div key={item.fieldName} className="rounded-lg bg-gray-950/35 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-white">{item.purpose}</p>
                    <span className="rounded-full bg-gray-900 px-2 py-0.5 text-xs text-gray-300">
                      {item.count}건 · {item.confidence}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">{item.fieldName}</p>
                  <p className="mt-2 text-xs leading-relaxed text-gray-300 [word-break:keep-all]">
                    {item.reason}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

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
