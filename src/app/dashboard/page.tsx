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
        <span className="rounded-full bg-blue-950 px-3 py-1 text-xs text-blue-300">
          Risk Items DB
        </span>
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
          <div className="mb-2 text-xs font-semibold text-gray-400">고위험 관리 항목 예시</div>
          <div className="space-y-2">
            {risk.highRiskItems.map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-600/70 bg-slate-900/80 p-3">
                <div className="text-sm font-medium text-white">
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
    <main className="min-h-screen bg-[#07111f] pb-10">
      <SafeNav />

      <div className="mx-auto max-w-7xl p-4">
        <div className="mb-4 mt-2 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">📊 대시보드</h1>
          <span className="text-xs text-gray-400">
            {new Date().toLocaleDateString("ko-KR")}
          </span>
        </div>

        {/* 상단 핵심 요약: 운영 브리핑 + Risk Intelligence */}
        <div className="mb-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(480px,0.95fr)]">
          {/* 좌측: 오늘 운영 상태 */}
          <div className="space-y-4">
          <AiDiagnosisCard />

          <TodayTasksCard tasks={s.todayTasks} />

    {s.오늘TBM === 0 && (
      <div className="flex items-center gap-2 rounded-xl border border-orange-800/70 bg-orange-950/40 p-3">
        <span className="text-lg text-orange-300">📋</span>
        <p className="text-sm font-medium text-orange-200">
          오늘 TBM 미작성 — 입력 필요
        </p>
        <Link
          href="/tbm"
          className="ml-auto text-xs text-orange-300 hover:underline"
        >
          → 입력
        </Link>
      </div>
    )}

    <EvidenceScoreCard score={s.증거점수} breakdown={s.증거분석} />
  </div>

  {/* 우측: 위험성평가 기반 관리 신호 */}
  <div className="space-y-4">
    <RiskIntelligenceSection risk={s.risk} />
  </div>
</div>

        <div className="mb-4 flex items-center justify-between rounded-2xl border border-gray-700 bg-gray-900 p-5">
          <div>
            <div className="mb-1 text-xs text-gray-400">현장 리스크 지수</div>
            <div className={`text-4xl font-bold ${리스크색}`}>{s.리스크점수}점</div>
            <div className={`mt-1 text-sm font-medium ${리스크색}`}>{리스크라벨}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">EB누락 ×20 + 조치필요 ×10</div>
            <div className="mt-1 text-xs text-gray-500">100점 = 관리 필요 최대</div>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-blue-800 bg-blue-950 p-4">
            <div className="text-3xl font-bold text-white">{s.전체}</div>
            <div className="mt-1 text-sm text-blue-400">전체 TBM</div>
          </div>
          <div className="rounded-xl border border-emerald-800 bg-emerald-950 p-4">
            <div className="text-3xl font-bold text-white">{s.이번달}</div>
            <div className="mt-1 text-sm text-emerald-400">이번 달 TBM</div>
          </div>
          <div className="rounded-xl border border-yellow-800 bg-yellow-950 p-4">
            <div className="text-3xl font-bold text-white">{s.특이사항}</div>
            <div className="mt-1 text-sm text-yellow-400">특이사항 발생</div>
          </div>
          <div
            className={`rounded-xl border p-4 ${
              s.EB누락 > 0 ? "border-red-800 bg-red-950" : "border-gray-700 bg-gray-800"
            }`}
          >
            <div className="text-3xl font-bold text-white">{s.EB누락}</div>
            <div className={`mt-1 text-sm ${s.EB누락 > 0 ? "text-red-400" : "text-gray-400"}`}>
              🔴 EB 누락
            </div>
          </div>
        </div>

        <div
          className={`mb-3 rounded-2xl border p-4 ${
            s.EB누락 > 0 ? "border-red-800 bg-red-950" : "border-gray-700 bg-gray-900"
          }`}
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🔴</span>
              <span className="font-bold text-white">EB 누락</span>
            </div>
            <span className={`text-2xl font-bold ${s.EB누락 > 0 ? "text-red-400" : "text-gray-400"}`}>
              {s.EB누락}건
            </span>
          </div>

          {s.EB누락목록.length > 0 ? (
            <div className="space-y-2">
              {s.EB누락목록.map((row) => (
                <Link key={row.id} href={`/tbm/${row.id}`}>
                  <div className="cursor-pointer rounded-lg bg-red-900/40 p-3 transition hover:bg-red-900/60">
                    <div className="text-sm font-medium text-white">{row.작업명}</div>
                    <div className="mt-0.5 text-xs text-red-300">
                      {row.날짜}
                      {row.실시자 ? ` · ${row.실시자}` : ""}
                    </div>
                  </div>
                </Link>
              ))}
              {s.EB누락 > 3 && (
                <Link href="/tbm">
                  <div className="pt-1 text-center text-xs text-red-400 hover:underline">
                    + {s.EB누락 - 3}건 더 보기
                  </div>
                </Link>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-500">누락 없음 ✅</div>
          )}
        </div>

        <div
          className={`mb-3 rounded-2xl border p-4 ${
            s.조치필요 > 0 ? "border-yellow-800 bg-yellow-950" : "border-gray-700 bg-gray-900"
          }`}
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🟡</span>
              <span className="font-bold text-white">조치 필요</span>
            </div>
            <span className={`text-2xl font-bold ${s.조치필요 > 0 ? "text-yellow-400" : "text-gray-400"}`}>
              {s.조치필요}건
            </span>
          </div>

          {s.조치필요목록.length > 0 ? (
            <div className="space-y-2">
              {s.조치필요목록.map((row) => (
                <Link key={row.id} href={`/tbm/${row.id}`}>
                  <div className="cursor-pointer rounded-lg bg-yellow-900/40 p-3 transition hover:bg-yellow-900/60">
                    <div className="text-sm font-medium text-white">{row.작업명}</div>
                    <div className="mt-0.5 text-xs text-yellow-300">
                      {row.날짜}
                      {row.실시자 ? ` · ${row.실시자}` : ""}
                    </div>
                  </div>
                </Link>
              ))}
              {s.조치필요 > 3 && (
                <Link href="/tbm">
                  <div className="pt-1 text-center text-xs text-yellow-400 hover:underline">
                    + {s.조치필요 - 3}건 더 보기
                  </div>
                </Link>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-500">조치 필요 없음 ✅</div>
          )}
        </div>

        <div
          className={`mb-3 rounded-2xl border p-4 ${
            s.에스컬레이션 ? "border-red-700 bg-red-950" : "border-gray-700 bg-gray-900"
          }`}
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚫</span>
              <span className="font-bold text-white">대표 확인 항목</span>
            </div>
            {s.최악건 && (
              <span className={`text-xl font-bold ${s.에스컬레이션 ? "text-red-400" : "text-gray-400"}`}>
                R={s.최악R}
              </span>
            )}
          </div>

          {s.최악건 ? (
            <Link href={`/tbm/${s.최악건.id}`}>
              <div
                className={`cursor-pointer rounded-lg p-3 transition hover:opacity-80 ${
                  s.에스컬레이션 ? "bg-red-900/50" : "bg-gray-800"
                }`}
              >
                {s.에스컬레이션 && (
                  <span className="mb-1 inline-block rounded-full bg-red-700 px-2 py-0.5 text-xs text-white">
                    대표 확인 권장
                  </span>
                )}
                <div className="text-sm font-medium text-white">{s.최악건.작업명}</div>
                <div className="mt-0.5 text-xs text-gray-400">
                  {s.최악건.날짜} · 위험요인: {s.최악건.위험요인} · S={s.최악건.S} L={s.최악건.L}
                </div>
              </div>
            </Link>
          ) : (
            <div className="text-sm text-gray-500">작업 태그 매핑 없음</div>
          )}
        </div>

        <div
          className={`mb-4 rounded-2xl border p-4 ${
            s.PTW위험 > 0
              ? "border-red-800 bg-red-950"
              : s.PTW미승인 > 0
                ? "border-yellow-800 bg-yellow-950"
                : "border-gray-700 bg-gray-900"
          }`}
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🧾</span>
              <span className="font-bold text-white">PTW 현황</span>
            </div>
            <div className="flex gap-2">
              {s.PTW위험 > 0 && <span className="text-xl font-bold text-red-400">{s.PTW위험}건 위험</span>}
              {s.PTW미승인 > 0 && <span className="text-xl font-bold text-yellow-400">{s.PTW미승인}건 대기</span>}
              {s.PTW위험 === 0 && s.PTW미승인 === 0 && <span className="text-sm text-gray-400">이상 없음 ✅</span>}
            </div>
          </div>

          {s.PTW위험목록.map((row) => (
            <Link key={row.id} href={`/ptw/${row.id}`}>
              <div className="mb-2 cursor-pointer rounded-lg bg-red-900/40 p-3 transition hover:bg-red-900/60">
                <div className="text-sm font-medium text-white">{row.제목 || "제목 없음"}</div>
                <div className="mt-0.5 text-xs text-red-300">
                  {row.작업일} · {row.작업유형} · {row.허용여부 === "금지" ? "🚫 금지" : "🔴 반려"}
                </div>
              </div>
            </Link>
          ))}

          {s.PTW미승인목록.map((row) => (
            <Link key={row.id} href={`/ptw/${row.id}`}>
              <div className="mb-2 cursor-pointer rounded-lg bg-yellow-900/40 p-3 transition hover:bg-yellow-900/60">
                <div className="text-sm font-medium text-white">{row.제목 || "제목 없음"}</div>
                <div className="mt-0.5 text-xs text-yellow-300">
                  {row.작업일} · {row.작업유형} · 승인 대기 중
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/tbm"
            className="rounded-xl border border-gray-700 bg-gray-900 p-4 text-center transition hover:border-blue-600"
          >
            <div className="mb-1 text-2xl">📋</div>
            <div className="text-sm font-medium text-white">TBM 목록</div>
          </Link>
          <Link
            href="/ebm"
            className="rounded-xl border border-gray-700 bg-gray-900 p-4 text-center transition hover:border-emerald-600"
          >
            <div className="mb-1 text-2xl">📚</div>
            <div className="text-sm font-medium text-white">EB 목록</div>
          </Link>
        </div>
      </div>
    </main>
  );
}