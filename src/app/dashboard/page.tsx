export const dynamic = "force-dynamic";

import { SafeNav } from "@/components/SafeLayout";
import Link from "next/link";
import AiDiagnosisCard from "@/components/AiDiagnosisCard";
import TodayTasksCard from "@/components/TodayTasksCard";
import EvidenceScoreCard from "@/components/EvidenceScoreCard";
import { getCompanyConfig } from "@/lib/company";

const TAG_RISK_MAP: Record<string, { factor: string; S: number; L: number }> = {
  고소작업: { factor: "추락", S: 5, L: 3 },
  밀폐공간: { factor: "산소결핍", S: 5, L: 2 },
  "차량/이동장비": { factor: "협착·충돌", S: 4, L: 3 },
  "양중/중량물": { factor: "낙하·충돌", S: 4, L: 3 },
  전기: { factor: "감전", S: 4, L: 2 },
  "화학/MSDS": { factor: "중독·화재", S: 4, L: 2 },
  "용접/용단": { factor: "화재·폭발", S: 3, L: 3 },
  "상·하차": { factor: "요통·충돌", S: 3, L: 3 },
  "정비/청소": { factor: "절단·말림", S: 3, L: 2 },
  기타: { factor: "일반위험", S: 2, L: 2 },
};

const PTW_REQUIRED_TAGS = ["고소작업", "밀폐공간", "화학/MSDS", "용접/용단", "전기"];

type NotionProperty = {
  title?: Array<{ plain_text?: string }>;
  rich_text?: Array<{ plain_text?: string }>;
  date?: { start?: string | null };
  checkbox?: boolean;
  select?: { name?: string | null };
  multi_select?: Array<{ name?: string }>;
  people?: Array<{ name?: string }>;
  relation?: unknown[];
  number?: number | null;
};

type NotionPage = {
  id: string;
  properties: Record<string, NotionProperty>;
};

type NotionQueryResponse = {
  results?: NotionPage[];
};

type TbmRow = {
  id: string;
  작업명: string;
  날짜: string;
  특이사항: boolean;
  조치상태: string;
  연결EB: number;
  실시자: string;
  작업태그: string[];
};

type PtwRow = {
  id: string;
  제목: string;
  작업일: string;
  작업유형: string;
  승인상태: string;
  허용여부: string;
};

type RiskItem = {
  id: string;
  title: string;
  no: string;
  processName: string;
  hazard: string;
  riskLevel: string;
  improvementPlan: string;
  status: string;
  budgetRequired: boolean;
  reassessmentDate: string;
};

type RiskSummary = {
  hasDb: boolean;
  total: number;
  highRiskCount: number;
  actionNeededCount: number;
  budgetNeededCount: number;
  reassessmentDueCount: number;
  highRiskItems: RiskItem[];
};

function getTitlePropPlainText(prop: NotionProperty | undefined): string {
  return prop?.title?.[0]?.plain_text?.trim() ?? "";
}

function getTextPropPlainText(prop: NotionProperty | undefined): string {
  return prop?.rich_text?.[0]?.plain_text?.trim() ?? "";
}

function getDatePropStart(prop: NotionProperty | undefined): string {
  return prop?.date?.start ?? "";
}

function getCheckboxPropValue(prop: NotionProperty | undefined): boolean {
  return prop?.checkbox ?? false;
}

function getSelectPropName(prop: NotionProperty | undefined): string {
  return prop?.select?.name?.trim() ?? "";
}

function getRelationPropCount(prop: NotionProperty | undefined): number {
  return prop?.relation?.length ?? 0;
}

function getMultiSelectNames(prop: NotionProperty | undefined): string[] {
  return prop?.multi_select?.map((item) => item.name ?? "").filter(Boolean) ?? [];
}

function getPeopleFirstName(prop: NotionProperty | undefined): string {
  return prop?.people?.[0]?.name ?? "";
}

function getKstDateKey(date = new Date()): string {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

async function queryNotionDatabase(
  databaseId: string,
  headers: Record<string, string>,
  body: Record<string, unknown>
): Promise<NotionQueryResponse> {
  const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Notion database query failed: ${response.status} ${text}`);
  }

  return (await response.json()) as NotionQueryResponse;
}

async function getRiskSummary(
  riskAssessmentDbId: string | undefined,
  headers: Record<string, string>
): Promise<RiskSummary> {
  if (!riskAssessmentDbId) {
    return {
      hasDb: false,
      total: 0,
      highRiskCount: 0,
      actionNeededCount: 0,
      budgetNeededCount: 0,
      reassessmentDueCount: 0,
      highRiskItems: [],
    };
  }

  const riskData = await queryNotionDatabase(riskAssessmentDbId, headers, {
    page_size: 100,
  });

  const items: RiskItem[] = (riskData.results ?? []).map((page) => {
    const props = page.properties;

    return {
      id: page.id,
      title: getTitlePropPlainText(props["Risk Item"]),
      no: getTextPropPlainText(props["No"]),
      processName: getTextPropPlainText(props["processName"]),
      hazard: getTextPropPlainText(props["hazard"]),
      riskLevel: getSelectPropName(props["riskLevel"]),
      improvementPlan: getTextPropPlainText(props["improvementPlan"]),
      status: getSelectPropName(props["status"]),
      budgetRequired: getCheckboxPropValue(props["budgetRequired"]),
      reassessmentDate: getDatePropStart(props["reassessmentDate"]),
    };
  });

  const todayPlus30 = getKstDateKey(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

  const highRiskItems = items.filter(
    (item) => item.riskLevel === "상" && item.status !== "완료"
  );

  const actionNeededItems = items.filter(
    (item) => item.improvementPlan.trim().length > 0 && item.status !== "완료"
  );

  const budgetNeededItems = items.filter(
    (item) => item.budgetRequired && item.status !== "완료"
  );

  const reassessmentDueItems = items.filter(
    (item) =>
      item.reassessmentDate &&
      item.reassessmentDate <= todayPlus30 &&
      item.status !== "완료"
  );

  return {
    hasDb: true,
    total: items.length,
    highRiskCount: highRiskItems.length,
    actionNeededCount: actionNeededItems.length,
    budgetNeededCount: budgetNeededItems.length,
    reassessmentDueCount: reassessmentDueItems.length,
    highRiskItems: highRiskItems.slice(0, 3),
  };
}

async function getDashboardData() {
  const company = await getCompanyConfig();

  const headers = {
    Authorization: `Bearer ${company.notionApiKey}`,
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json",
  };

  const [tbmData, ebData, ptwData, risk] = await Promise.all([
    queryNotionDatabase(company.tbmDbId, headers, {
      page_size: 100,
      sorts: [{ property: "날짜", direction: "descending" }],
    }),
    queryNotionDatabase(company.ebmDbId, headers, {
  page_size: 50,
  }),
    queryNotionDatabase(company.ptwDbId, headers, {
      page_size: 100,
    }),
    getRiskSummary(company.riskAssessmentDbId, headers),
  ]);

  const today = getKstDateKey();
  const thisMonth = today.slice(0, 7);

  const rows: TbmRow[] = (tbmData.results ?? []).map((page) => {
    const props = page.properties;

    return {
      id: page.id,
      작업명: getTitlePropPlainText(props["작업명"]),
      날짜: getDatePropStart(props["날짜"]),
      특이사항: getCheckboxPropValue(props["특이사항"]),
      조치상태: getSelectPropName(props["조치 상태"]),
      연결EB: getRelationPropCount(props["연결 EB"]),
      실시자: getPeopleFirstName(props["실시자(현장총괄)"]),
      작업태그: getMultiSelectNames(props["작업 태그"]),
    };
  });

  const ptwRows: PtwRow[] = (ptwData.results ?? []).map((page) => {
    const props = page.properties;

    return {
      id: page.id,
      제목: getTitlePropPlainText(props["허가서 제목/번호 (예W-대도-20260324-고소-001)"]),
      작업일: getDatePropStart(props["작업일"]),
      작업유형: getSelectPropName(props["작업유형"]),
      승인상태: getSelectPropName(props["승인상태"]),
      허용여부: getSelectPropName(props["작업 허용 여부"]),
    };
  });

  const EB누락목록 = rows.filter((row) => row.특이사항 && row.연결EB === 0);
  const 조치필요목록 = rows.filter((row) => row.조치상태 === "조치 필요");
  const 오늘TBM = rows.filter((row) => row.날짜 === today).length;
  const PTW위험목록 = ptwRows.filter(
    (row) => row.허용여부 === "금지" || row.승인상태 === "반려"
  );
  const PTW미승인목록 = ptwRows.filter((row) => row.승인상태 === "요청");

  const PTW필요미제출 = rows.filter(
    (row) =>
      row.작업태그.some((tag) => PTW_REQUIRED_TAGS.includes(tag)) &&
      ptwRows.filter((ptw) => ptw.작업일 === row.날짜).length === 0
  );

  const todayTasks: { icon: string; text: string; href: string; urgent: boolean }[] = [];

  if (오늘TBM === 0) {
    todayTasks.push({ icon: "📋", text: "오늘 TBM 미작성 — 입력 필요", href: "/tbm", urgent: true });
  }

  if (EB누락목록.length > 0) {
    todayTasks.push({ icon: "🔴", text: `EB 누락 ${EB누락목록.length}건 — 등록 필요`, href: "/ebm", urgent: true });
  }

  if (조치필요목록.length > 0) {
    todayTasks.push({ icon: "🟡", text: `조치 필요 ${조치필요목록.length}건 — 상태 업데이트`, href: "/tbm", urgent: false });
  }

  if (PTW미승인목록.length > 0) {
    todayTasks.push({ icon: "🧾", text: `PTW 승인 대기 ${PTW미승인목록.length}건 — 검토 필요`, href: "/ptw", urgent: false });
  }

  if (PTW필요미제출.length > 0) {
    todayTasks.push({ icon: "🚨", text: `고위험 작업 PTW 확인 필요 ${PTW필요미제출.length}건`, href: "/ptw", urgent: true });
  }

  const tbm전체 = rows.length;
  const 특이사항건 = rows.filter((row) => row.특이사항).length;
  const EB연결건 = rows.filter((row) => row.특이사항 && row.연결EB > 0).length;
  const PTW승인건 = ptwRows.filter(
    (row) => row.승인상태 === "승인" || row.승인상태 === "완료"
  ).length;
  const PTW전체 = ptwRows.length;

  const tbm점수 = tbm전체 > 0 ? 40 : 0;
  const eb점수 = 특이사항건 > 0 ? Math.round((EB연결건 / 특이사항건) * 30) : 30;
  const ptw점수 = PTW전체 > 0 ? Math.round((PTW승인건 / PTW전체) * 30) : 30;
  const 증거점수 = Math.min(100, tbm점수 + eb점수 + ptw점수);

  const 증거분석 = [
    { label: "TBM 기록", ok: tbm전체 > 0, count: tbm전체 },
    { label: "EB 연결 (특이사항 건)", ok: EB누락목록.length === 0, count: EB연결건 },
    { label: "PTW 승인", ok: PTW전체 === 0 || PTW승인건 === PTW전체, count: PTW승인건 },
  ];

  let 최악건:
    | (TbmRow & { 위험요인: string; S: number; L: number; R: number })
    | null = null;
  let 최악R = 0;

  for (const row of rows) {
    for (const tag of row.작업태그) {
      const mappedRisk = TAG_RISK_MAP[tag];

      if (mappedRisk) {
        const R = mappedRisk.S * mappedRisk.L;

        if (R > 최악R) {
          최악R = R;
          최악건 = {
            ...row,
            위험요인: mappedRisk.factor,
            S: mappedRisk.S,
            L: mappedRisk.L,
            R,
          };
        }
      }
    }
  }

  const 에스컬레이션 = Boolean(최악건 && (최악R >= 16 || (최악R >= 8 && 최악건.S === 5)));

  return {
    전체: tbm전체,
    이번달: rows.filter((row) => row.날짜?.startsWith(thisMonth)).length,
    특이사항: 특이사항건,
    EB누락: EB누락목록.length,
    조치필요: 조치필요목록.length,
    리스크점수: Math.min(100, EB누락목록.length * 20 + 조치필요목록.length * 10),
    EB누락목록: EB누락목록.slice(0, 3),
    조치필요목록: 조치필요목록.slice(0, 3),
    최악건,
    최악R,
    에스컬레이션,
    오늘TBM,
    PTW위험: PTW위험목록.length,
    PTW미승인: PTW미승인목록.length,
    PTW위험목록: PTW위험목록.slice(0, 3),
    PTW미승인목록: PTW미승인목록.slice(0, 3),
    todayTasks,
    증거점수,
    증거분석,
    risk,
  };
}

function RiskIntelligenceSection({ risk }: { risk: RiskSummary }) {
  if (!risk.hasDb) {
    return (
      <section className="rounded-2xl border border-slate-600/80 bg-slate-800/70 p-5 shadow-lg">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Risk Intelligence</h2>
            <p className="mt-1 text-xs text-gray-400">위험성평가 항목 기반 관리 신호</p>
          </div>
          <span className="rounded-full bg-gray-800 px-3 py-1 text-xs text-gray-400">준비 중</span>
        </div>
        <div className="rounded-xl bg-gray-800/70 p-4 text-sm text-gray-300">
          위험성평가 항목 등록 후 표시됩니다.
        </div>
      </section>
    );
  }

  const cards = [
  {
    label: "고위험 관리 항목",
    value: risk.highRiskCount,
    hint: "위험수준 상 + 완료 전",
    accent: "text-red-200",
  },
  {
    label: "개선대책 관리 필요",
    value: risk.actionNeededCount,
    hint: "개선대책 있음 + 완료 전",
    accent: "text-yellow-200",
  },
  {
    label: "예산 검토 필요",
    value: risk.budgetNeededCount,
    hint: "예산 수반 + 완료 전",
    accent: "text-orange-200",
  },
  {
    label: "재평가 예정",
    value: risk.reassessmentDueCount,
    hint: "30일 이내 재확인",
    accent: "text-blue-200",
  },
];

  return (
    <section className="rounded-2xl border border-slate-600/80 bg-slate-800/70 p-5 shadow-lg">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white">Risk Intelligence</h2>
          <p className="mt-1 text-xs text-gray-400">
            위험성평가 항목 {risk.total}건 기준 관리 필요 신호입니다.
          </p>
        </div>
        <Link
          href="/risk"
          className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-blue-400/40 bg-blue-600/90 px-3 py-1 text-xs font-bold text-white shadow-sm hover:bg-blue-500"
        >
          Risk 상세 보기 →
        </Link>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-slate-600/80 bg-slate-800/80 p-4 shadow-sm"
      >
            <div className={`text-4xl font-bold leading-none ${card.accent}`}>{card.value}</div>
            <div className="mt-3 text-base font-semibold text-white">{card.label}</div>
            <div className="mt-1 text-xs leading-relaxed text-slate-300">{card.hint}</div>
      </div>
        ))}
      </div>

      {risk.highRiskItems.length > 0 ? (
        <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-4">
          <div className="mb-2 text-xs font-semibold text-gray-400 [word-break:keep-all]">
            고위험 관리 항목 예시
          </div>
          <div className="space-y-2">
            {risk.highRiskItems.map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-600/70 bg-slate-900/80 p-3">
                <div className="text-sm font-medium leading-snug text-white [word-break:keep-all]">
                  {item.no ? `${item.no}. ` : ""}
                  {item.title || item.processName || "위험성평가 항목"}
                </div>
                <div className="mt-1 text-xs leading-relaxed text-slate-300">
                  {item.processName}
                  {item.hazard ? ` · ${item.hazard}` : ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl bg-gray-800/70 p-4 text-sm text-gray-300">
          현재 표시할 고위험 관리 항목이 없습니다.
        </div>
      )}
    </section>
  );
}

export default async function DashboardPage() {
  const s = await getDashboardData();
  const 리스크색 =
    s.리스크점수 >= 60
      ? "text-red-400"
      : s.리스크점수 >= 30
        ? "text-yellow-400"
        : "text-green-400";
  const 리스크라벨 =
    s.리스크점수 >= 60 ? "🔴 관리 필요" : s.리스크점수 >= 30 ? "🟡 확인 필요" : "🟢 양호";

  return (
    <main className="min-h-screen bg-slate-950 pb-10 text-slate-100">
      <SafeNav />

      <div className="mx-auto max-w-7xl px-5 py-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">📊 대표 대시보드</h1>
            <p className="mt-1 text-sm text-slate-400 [word-break:keep-all]">
              오늘의 운영 상태와 관리 필요 신호를 요약합니다.
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-300">
            {new Date()
              .toLocaleDateString("ko-KR")
              .replace(/\.\s*/g, ".")
              .replace(/\.$/, "")}
         </span>
        </div>

        {/* ZONE 1: 오늘의 결론 */}
        <section className="mb-5 rounded-3xl border border-slate-700 bg-gradient-to-br from-slate-800 via-slate-850 to-slate-900 p-5 shadow-2xl">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px_240px]">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-300">
                  오늘의 결론
                </span>
                <span className="text-xs text-slate-400">대표 확인용 요약</span>
              </div>

              <h2 className="text-2xl font-bold leading-tight text-white [word-break:keep-all]">
                {s.조치필요 > 0 || s.EB누락 > 0 || s.PTW미승인 > 0 || s.risk.highRiskCount > 0
                  ? "관리 필요 항목을 확인하세요."
                  : "현재 주요 관리 신호는 안정적입니다."}
              </h2>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300 [word-break:keep-all]">
                오늘 조치 필요 {s.조치필요}건, EB 누락 {s.EB누락}건, PTW 승인대기 {s.PTW미승인}건,
                위험성평가 기준 고위험 관리 항목 {s.risk.highRiskCount}건입니다.
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <div className="text-xs font-medium text-emerald-300">현장 리스크 지수</div>
              <div className={`mt-2 text-5xl font-black leading-none ${리스크색}`}>{s.리스크점수}점</div>
              <div className={`mt-2 text-sm font-semibold ${리스크색}`}>{리스크라벨}</div>
              <div className="mt-3 text-xs text-slate-400">EB누락 ×20 + 조치필요 ×10</div>
            </div>

            <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4">
              <div className="text-xs font-medium text-blue-300">Risk Intelligence</div>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-5xl font-black leading-none text-white">{s.risk.highRiskCount}</span>
                <span className="pb-1 text-sm text-slate-300">고위험</span>
              </div>
              <div className="mt-3 text-xs text-slate-400">
                개선대책 {s.risk.actionNeededCount}건 · 예산 {s.risk.budgetNeededCount}건
              </div>
            </div>
          </div>
        </section>

        {/* ZONE 2: 핵심 의사결정 영역 */}
        <section className="mb-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(460px,0.95fr)]">
          {/* 좌측: 운영 브리핑 + 오늘 관리 필요 */}
          <div className="space-y-5">
            <div className="rounded-3xl border border-slate-700 bg-slate-900/80 p-4 shadow-xl">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-bold text-white">AI 운영 브리핑</h2>
                <span className="text-xs text-slate-500">TBM · EB · PTW 기준</span>
              </div>
              <AiDiagnosisCard />
            </div>

            <div className="rounded-3xl border border-slate-700 bg-slate-900/80 p-5 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">오늘 관리 필요</h2>
                  <p className="mt-1 text-xs text-slate-400">
                    조치, 증빙, 승인 상태 중 대표가 확인할 항목입니다.
                  </p>
                </div>
                <span className="inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full bg-amber-500/15 px-3 py-1 text-sm font-bold leading-none text-amber-300">
                  {s.조치필요 + s.EB누락 + s.PTW미승인 + s.PTW위험}건
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">조치 필요</span>
                    <span className="text-2xl font-black text-amber-300">{s.조치필요}</span>
                  </div>
                  {s.조치필요목록[0] ? (
                    <Link href={`/tbm/${s.조치필요목록[0].id}`}>
                      <div className="mt-3 rounded-xl bg-slate-950/60 p-3 text-xs text-slate-300 hover:bg-slate-950">
                        <div className="font-semibold text-white">{s.조치필요목록[0].작업명}</div>
                        <div className="mt-1 text-amber-300">{s.조치필요목록[0].날짜}</div>
                      </div>
                    </Link>
                  ) : (
                    <div className="mt-3 text-xs text-slate-400">조치 필요 없음 ✅</div>
                  )}
                </div>

                <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">EB 누락</span>
                    <span className="text-2xl font-black text-rose-300">{s.EB누락}</span>
                  </div>
                  {s.EB누락목록[0] ? (
                    <Link href={`/tbm/${s.EB누락목록[0].id}`}>
                      <div className="mt-3 rounded-xl bg-slate-950/60 p-3 text-xs text-slate-300 hover:bg-slate-950">
                        <div className="font-semibold text-white">{s.EB누락목록[0].작업명}</div>
                        <div className="mt-1 text-rose-300">{s.EB누락목록[0].날짜}</div>
                      </div>
                    </Link>
                  ) : (
                    <div className="mt-3 text-xs text-slate-400">누락 없음 ✅</div>
                  )}
                </div>

                <div className="rounded-2xl border border-blue-500/25 bg-blue-500/10 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">PTW 확인</span>
                    <span className="text-2xl font-black text-blue-300">{s.PTW미승인 + s.PTW위험}</span>
                  </div>
                  <div className="mt-3 text-xs leading-5 text-slate-300">
                    위험 {s.PTW위험}건 · 승인대기 {s.PTW미승인}건
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-600 bg-slate-800/70 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">대표 확인</span>
                    <span className="text-2xl font-black text-slate-200">
                      {s.최악건 ? `R=${s.최악R}` : "-"}
                    </span>
                  </div>
                  <div className="mt-3 text-xs leading-5 text-slate-400">
                    {s.최악건 ? s.최악건.작업명 : "작업 태그 매핑 없음"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 우측: Risk Intelligence */}
          <div className="space-y-5">
            <RiskIntelligenceSection risk={s.risk} />
          </div>
        </section>

        {/* ZONE 3: 증빙/운영 상태 */}
        <section className="mb-5 grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="rounded-3xl border border-slate-700 bg-slate-900/80 p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-white">증거 완결성</h2>
              <span className="text-xs text-slate-500">기록 · 증빙 · 승인</span>
            </div>
            <EvidenceScoreCard score={s.증거점수} breakdown={s.증거분석} />
          </div>

          <div className="rounded-3xl border border-slate-700 bg-slate-900/80 p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-white">운영 KPI</h2>
              <span className="text-xs text-slate-500">TBM · EB · PTW</span>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
                <div className="text-3xl font-black text-white">{s.전체}</div>
                <div className="mt-1 text-xs text-blue-300">전체 TBM</div>
              </div>
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                <div className="text-3xl font-black text-white">{s.이번달}</div>
                <div className="mt-1 text-xs text-emerald-300">이번 달 TBM</div>
              </div>
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                <div className="text-3xl font-black text-white">{s.특이사항}</div>
                <div className="mt-1 text-xs text-amber-300">특이사항</div>
              </div>
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4">
                <div className="text-3xl font-black text-white">{s.EB누락}</div>
                <div className="mt-1 text-xs text-rose-300">EB 누락</div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <Link
                href="/tbm"
                className="rounded-2xl border border-slate-700 bg-slate-800/80 p-4 text-center transition hover:border-blue-500 hover:bg-slate-800"
              >
                <div className="text-2xl">📋</div>
                <div className="mt-1 text-sm font-semibold text-white">TBM 목록</div>
              </Link>
              <Link
                href="/ebm"
                className="rounded-2xl border border-slate-700 bg-slate-800/80 p-4 text-center transition hover:border-emerald-500 hover:bg-slate-800"
              >
                <div className="text-2xl">📚</div>
                <div className="mt-1 text-sm font-semibold text-white">EB 목록</div>
              </Link>
            </div>
          </div>
        </section>

        {/* ZONE 4: 상세 상태 */}
        <section className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-700 bg-slate-900/80 p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-white">PTW 현황</h2>
              <span className="text-xs text-slate-400">
                {s.PTW위험 === 0 && s.PTW미승인 === 0 ? "이상 없음 ✅" : "확인 필요"}
              </span>
            </div>

            {s.PTW위험목록.length === 0 && s.PTW미승인목록.length === 0 ? (
              <div className="rounded-2xl bg-slate-800/70 p-4 text-sm text-slate-400">
                현재 승인대기 또는 반려 항목이 없습니다.
              </div>
            ) : (
              <div className="space-y-2">
                {[...s.PTW위험목록, ...s.PTW미승인목록].map((row) => (
                  <Link key={row.id} href={`/ptw/${row.id}`}>
                    <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-3 text-sm text-white hover:bg-slate-800">
                      {row.제목 || "제목 없음"}
                      <div className="mt-1 text-xs text-slate-400">
                        {row.작업일} · {row.작업유형} · {row.승인상태 || row.허용여부}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-700 bg-slate-900/80 p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-white">오늘 할 일</h2>
              <span className="text-xs text-slate-400">{s.todayTasks.length}건</span>
            </div>
            <TodayTasksCard tasks={s.todayTasks} />
          </div>
        </section>
      </div>
    </main>
  );
}