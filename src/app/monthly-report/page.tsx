import Link from "next/link";
import PrintReportButton from "@/components/PrintReportButton";
import { getCompanyConfig } from "@/lib/company";
import { getRiskIntelligenceData } from "@/lib/risk";

export const dynamic = "force-dynamic";

type NotionPage = {
  id: string;
  properties: Record<string, any>;
  url?: string;
};

function getTextPropPlainText(prop: any): string {
  if (!prop) return "";

  if (prop.type === "title") {
    return prop.title?.map((t: any) => t.plain_text).join("") ?? "";
  }

  if (prop.type === "rich_text") {
    return prop.rich_text?.map((t: any) => t.plain_text).join("") ?? "";
  }

  if (prop.type === "select") {
    return prop.select?.name ?? "";
  }

  if (prop.type === "status") {
    return prop.status?.name ?? "";
  }

  if (prop.type === "date") {
    return prop.date?.start ?? "";
  }

  if (prop.type === "checkbox") {
    return prop.checkbox ? "Y" : "";
  }

  if (prop.type === "number") {
    return String(prop.number ?? "");
  }

  return "";
}

function getRelationCount(prop: any): number {
  if (!prop) return 0;
  if (prop.type === "relation") return prop.relation?.length ?? 0;
  return 0;
}

function getFilesCount(prop: any): number {
  if (!prop) return 0;
  if (prop.type === "files") return prop.files?.length ?? 0;
  return 0;
}

function getDateFromPage(page: NotionPage): string {
  const props = page.properties ?? {};
  return (
    getTextPropPlainText(props["날짜"]) ||
    getTextPropPlainText(props["일자"]) ||
    getTextPropPlainText(props["작성일"]) ||
    getTextPropPlainText(props["Date"]) ||
    ""
  );
}

function getTitleFromPage(page: NotionPage): string {
  const props = page.properties ?? {};
  return (
    getTextPropPlainText(props["작업명"]) ||
    getTextPropPlainText(props["Name"]) ||
    getTextPropPlainText(props["이름"]) ||
    getTextPropPlainText(props["제목"]) ||
    "기록"
  );
}

function inMonth(dateValue: string, monthKey: string): boolean {
  if (!dateValue || !monthKey) return false;
  return dateValue.startsWith(monthKey);
}

async function queryNotionDatabase(
  databaseId: string | undefined,
  notionApiKey: string,
  body: Record<string, any> = {},
): Promise<NotionPage[]> {
  if (!databaseId) return [];

  const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${notionApiKey}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) {
    console.error("[monthly-report] notion query failed", databaseId, res.status, await res.text());
    return [];
  }

  const data = await res.json();
  return data.results ?? [];
}

function countByStatus(rows: NotionPage[], names: string[]) {
  return rows.filter((row) => {
    const props = row.properties ?? {};
    const text = names
      .map((name) => getTextPropPlainText(props[name]))
      .filter(Boolean)
      .join(" ");
    return text;
  });
}

function getCurrentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function StatCard(props: { label: string; value: string | number; hint?: string; tone?: string }) {
  return (
    <div className={`rounded-2xl border bg-slate-900 p-4 shadow-sm ${props.tone ?? "border-slate-700"}`}>
      <div className="text-sm font-semibold text-slate-400">{props.label}</div>
      <div className="mt-2 text-3xl font-black text-white">{props.value}</div>
      {props.hint && <div className="mt-1 text-xs leading-relaxed text-slate-400">{props.hint}</div>}
    </div>
  );
}

function Section(props: { title: string; children: React.ReactNode; desc?: string }) {
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-950 p-5 shadow-sm print:border-slate-300 print:bg-white">
      <div className="mb-4">
        <h2 className="text-lg font-black text-white print:text-slate-950">{props.title}</h2>
        {props.desc && <p className="mt-1 text-sm text-slate-400 print:text-slate-600">{props.desc}</p>}
      </div>
      {props.children}
    </section>
  );
}

export default async function MonthlySafetyReportPage({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const monthKey = params.month || getCurrentMonthKey();

  const company = await getCompanyConfig();
  const headers = { Authorization: `Bearer ${company.notionApiKey}` };

  const [tbmRowsRaw, ebRowsRaw, ptwRowsRaw, risk] = await Promise.all([
    queryNotionDatabase(company.tbmDbId, company.notionApiKey),
    queryNotionDatabase(company.ebmDbId, company.notionApiKey),
    queryNotionDatabase(company.ptwDbId, company.notionApiKey),
    getRiskIntelligenceData(company.riskAssessmentDbId, company.notionApiKey).catch(() => null),
  ]);

  const tbmRows = tbmRowsRaw.filter((row) => inMonth(getDateFromPage(row), monthKey));
  const ebRows = ebRowsRaw.filter((row) => {
    const date = getDateFromPage(row);
    return date ? inMonth(date, monthKey) : true;
  });
  const ptwRows = ptwRowsRaw.filter((row) => {
    const date = getDateFromPage(row);
    return date ? inMonth(date, monthKey) : true;
  });

  const tbmSpecialCount = tbmRows.filter((row) => {
    const props = row.properties ?? {};
    return (
      getTextPropPlainText(props["특이사항"]) ||
      getTextPropPlainText(props["특이사항내용"]) ||
      getTextPropPlainText(props["특이사항 내용"])
    );
  }).length;

  const tbmEbLinkedCount = tbmRows.filter((row) => {
    const props = row.properties ?? {};
    return getRelationCount(props["연결EB"]) > 0 || getRelationCount(props["관련 EB"]) > 0;
  }).length;

  const tbmEbMissingCount = Math.max(0, tbmRows.length - tbmEbLinkedCount);

  const actionPhotoCount = tbmRows.reduce((sum, row) => {
    const props = row.properties ?? {};
    return (
      sum +
      getFilesCount(props["조치사진"]) +
      getFilesCount(props["조치 사진"]) +
      getFilesCount(props["개선사진"])
    );
  }, 0);

  const ptwApproved = ptwRows.filter((row) => {
    const props = row.properties ?? {};
    const status = `${getTextPropPlainText(props["상태"])} ${getTextPropPlainText(props["승인상태"])} ${getTextPropPlainText(props["approvalStatus"])}`;
    return /승인|완료|approved/i.test(status);
  }).length;

  const ptwPending = ptwRows.filter((row) => {
    const props = row.properties ?? {};
    const status = `${getTextPropPlainText(props["상태"])} ${getTextPropPlainText(props["승인상태"])} ${getTextPropPlainText(props["approvalStatus"])}`;
    return /대기|검토|pending|요청/i.test(status);
  }).length;

  const riskAny = risk as any;
  const riskTotal = riskAny?.total ?? riskAny?.items?.length ?? 0;
  const highRiskCount = riskAny?.highRiskCount ?? 0;
  const actionNeededCount = riskAny?.actionNeededCount ?? 0;

  const recentTbm = tbmRows.slice(0, 8);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 print:bg-white print:text-slate-950">
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="flex flex-col gap-3 rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-sm print:border-slate-300 print:bg-white">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-bold text-blue-300 print:text-blue-700">Monthly Safety Report</p>
              <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl print:text-slate-950">
                월간 안전운영 보고서
              </h1>
              <p className="mt-2 text-sm text-slate-400 print:text-slate-600">
                {company.name} · {monthKey} 기준 · TBM, EB, PTW, 위험성평가 운영 현황
              </p>
            </div>

            <div className="flex flex-wrap gap-2 print:hidden">
              <Link href="/" className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-800">
                홈
              </Link>
              <PrintReportButton />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 print:border-slate-200 print:bg-slate-50">
            <p className="text-sm leading-relaxed text-slate-300 print:text-slate-700">
              이 보고서는 세메앱에 연결된 업체별 Notion 운영 DB를 기준으로 월간 TBM, 증빙, PTW, 위험성평가 관리 신호를 요약합니다.
              수치는 운영 관리를 위한 참고자료이며, 최종 검토와 조치는 사업장 관리 기준에 따라 확인합니다.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="월간 TBM" value={`${tbmRows.length}건`} hint="해당 월 작성된 TBM 기록" tone="border-blue-800" />
          <StatCard label="특이사항" value={`${tbmSpecialCount}건`} hint="특이사항 또는 보완 내용 포함" tone="border-amber-800" />
          <StatCard label="EB 연결" value={`${tbmEbLinkedCount}건`} hint={`누락 추정 ${tbmEbMissingCount}건`} tone="border-emerald-800" />
          <StatCard label="PTW" value={`${ptwRows.length}건`} hint={`승인 ${ptwApproved} · 대기 ${ptwPending}`} tone="border-orange-800" />
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <Section title="TBM 운영 현황" desc="월간 TBM 작성, 특이사항, 증빙 연결 상태입니다.">
            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard label="작성" value={tbmRows.length} />
              <StatCard label="특이사항" value={tbmSpecialCount} />
              <StatCard label="조치사진" value={actionPhotoCount} />
            </div>
          </Section>

          <Section title="위험성평가 관리 현황" desc="Risk Intelligence 기준 관리 신호입니다.">
            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard label="전체 위험항목" value={riskTotal} />
              <StatCard label="고위험" value={highRiskCount} />
              <StatCard label="개선대책 필요" value={actionNeededCount} />
            </div>
          </Section>
        </div>

        <Section title="최근 TBM 기록" desc="해당 월 TBM 중 최근 일부를 표시합니다.">
          <div className="overflow-hidden rounded-2xl border border-slate-800 print:border-slate-300">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-slate-900 text-slate-300 print:bg-slate-100 print:text-slate-800">
                <tr>
                  <th className="px-3 py-3">날짜</th>
                  <th className="px-3 py-3">작업명</th>
                  <th className="px-3 py-3">EB</th>
                  <th className="px-3 py-3">조치사진</th>
                </tr>
              </thead>
              <tbody>
                {recentTbm.length > 0 ? (
                  recentTbm.map((row) => {
                    const props = row.properties ?? {};
                    const ebCount = getRelationCount(props["연결EB"]) + getRelationCount(props["관련 EB"]);
                    const photos =
                      getFilesCount(props["조치사진"]) +
                      getFilesCount(props["조치 사진"]) +
                      getFilesCount(props["개선사진"]);
                    return (
                      <tr key={row.id} className="border-t border-slate-800 print:border-slate-200">
                        <td className="px-3 py-3 text-slate-300 print:text-slate-700">{getDateFromPage(row) || "-"}</td>
                        <td className="px-3 py-3 font-bold text-white print:text-slate-950">{getTitleFromPage(row)}</td>
                        <td className="px-3 py-3 text-slate-300 print:text-slate-700">{ebCount}건</td>
                        <td className="px-3 py-3 text-slate-300 print:text-slate-700">{photos}건</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-slate-400">
                      해당 월 TBM 기록이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="다음 달 확인사항">
          <ul className="space-y-2 text-sm leading-relaxed text-slate-300 print:text-slate-700">
            <li>• EB 연결 누락 TBM은 증빙 연결 여부를 확인합니다.</li>
            <li>• 고위험 관리 항목은 TBM에서 반복 공유하고, 필요한 경우 PTW 또는 조치사진을 연결합니다.</li>
            <li>• 개선대책 관리 필요 항목은 담당자, 기한, 증빙자료를 확인합니다.</li>
            <li>• 본 보고서는 운영 참고자료이며 최종 조치 판단은 사업장 관리 기준에 따릅니다.</li>
          </ul>
        </Section>
      </div>
    </main>
  );
}
