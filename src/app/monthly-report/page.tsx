import Link from "next/link";
import PrintReportButton from "@/components/PrintReportButton";
import { getCompanyConfig } from "@/lib/company";
import { getRiskIntelligenceData } from "@/lib/risk";
import { hasTbmSpecialIssue, needsTbmEvidenceBook, hasLinkedEvidenceBook as hasLinkedEvidenceBookByProps } from "@/lib/tbmStatus";
import {
  fetchContractorSubmissionRecords,
  getContractorSubmissionRecordSummary,
} from "@/lib/contractorSubmissionRecords";

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

function hasSpecialIssue(row: NotionPage): boolean {
  const props = row.properties ?? {};

  const raw =
    getTextPropPlainText(props["특이사항"]) ||
    getTextPropPlainText(props["특이사항내용"]) ||
    getTextPropPlainText(props["특이사항 내용"]);

  const value = String(raw ?? "").trim();

  if (!value) return false;

  return !/없음|무|false|no|n\/a|해당 없음/i.test(value);
}

function getActionStatus(row: NotionPage): string {
  const props = row.properties ?? {};
  return String(
    getTextPropPlainText(props["조치상태"]) ||
      getTextPropPlainText(props["조치 상태"]) ||
      ""
  ).trim();
}

function hasLinkedEvidenceBook(row: NotionPage): boolean {
  const props = row.properties ?? {};
  return getRelationCount(props["연결EB"]) > 0 || getRelationCount(props["관련 EB"]) > 0;
}

function needsEvidenceBook(row: NotionPage): boolean {
  const actionStatus = getActionStatus(row);

  return ["조치 필요", "보완 필요", "미조치", "미완료"].includes(actionStatus);
}

function isValidPtwRow(row: NotionPage): boolean {
  const title = getTitleFromPage(row);
  const date = getDateFromPage(row);
  const props = row.properties ?? {};

  const approvalStatus =
    getTextPropPlainText(props["승인상태"]) ||
    getTextPropPlainText(props["승인 상태"]) ||
    getTextPropPlainText(props["상태"]);

  const workType =
    getTextPropPlainText(props["작업유형"]) ||
    getTextPropPlainText(props["작업 유형"]) ||
    getTextPropPlainText(props["작업종류"]) ||
    getTextPropPlainText(props["작업 종류"]);

  const hasTitle = Boolean(title && title !== "제목 없음");
  const hasDate = Boolean(date);
  const hasMeaningfulData = Boolean(approvalStatus || workType);

  return hasTitle && hasDate && hasMeaningfulData;
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

function compactLabel(value: string) {
  return value.replace(/\s+/g, "").trim();
}

function normalizeFieldVoiceType(value: string) {
  const compact = compactLabel(value);

  if (compact.includes("공유확인") || compact.includes("주지확인")) return "공유확인";
  if (compact.includes("위험제보") || compact.includes("위험요인제보") || compact.includes("위험신고")) return "위험제보";
  if (compact.includes("아차사고")) return "아차사고";
  if (compact.includes("개선제안") || compact.includes("개선의견")) return "개선제안";
  if (compact.includes("기타")) return "기타";

  return value || "유형 미지정";
}

function normalizeFieldVoiceStatus(value: string) {
  const compact = compactLabel(value);
  const lower = value.trim().toLowerCase();

  if (lower === "to do") return "접수";
  if (lower === "in progress") return "검토중";
  if (lower === "done") return "조치완료";

  if (compact.includes("반려")) return "반려";
  if (compact.includes("조치완료") || compact === "완료" || compact.includes("처리완료")) return "조치완료";
  if (compact.includes("조치필요") || compact.includes("미조치") || compact.includes("보완필요") || compact.includes("미완료")) return "조치필요";
  if (compact.includes("검토중") || compact.includes("검토")) return "검토중";
  if (compact.includes("접수")) return "접수";

  return value || "상태 미지정";
}

function getFieldVoiceDateFromPage(row: NotionPage): string {
  const props = row.properties ?? {};
  return (
    getTextPropPlainText(props["등록일"]) ||
    getTextPropPlainText(props["등록일시"]) ||
    getTextPropPlainText(props["일시"]) ||
    getTextPropPlainText(props["발생/확인일"]) ||
    getTextPropPlainText(props["작성일"]) ||
    getTextPropPlainText(props["날짜"]) ||
    ""
  );
}

function getFieldVoiceTitle(row: NotionPage): string {
  const props = row.properties ?? {};
  return (
    getTextPropPlainText(props["의견 제목"]) ||
    getTextPropPlainText(props["제보 제목"]) ||
    getTextPropPlainText(props["의견제목"]) ||
    getTextPropPlainText(props["제목"]) ||
    getTextPropPlainText(props["Name"]) ||
    getTextPropPlainText(props["이름"]) ||
    "현장참여 기록"
  );
}

function getFieldVoiceType(row: NotionPage): string {
  const props = row.properties ?? {};
  return normalizeFieldVoiceType(
    getTextPropPlainText(props["의견 유형"]) ||
      getTextPropPlainText(props["의견유형"]) ||
      getTextPropPlainText(props["제보유형"]) ||
      getTextPropPlainText(props["제보 유형"]) ||
      getTextPropPlainText(props["유형"]) ||
      getTextPropPlainText(props["분류"]) ||
      ""
  );
}

function getFieldVoiceStatus(row: NotionPage): string {
  const props = row.properties ?? {};
  return normalizeFieldVoiceStatus(
    getTextPropPlainText(props["처리상태"]) ||
      getTextPropPlainText(props["처리상태_기존"]) ||
      getTextPropPlainText(props["처리 상태"]) ||
      getTextPropPlainText(props["상태"]) ||
      ""
  );
}

function getFieldVoiceLocation(row: NotionPage): string {
  const props = row.properties ?? {};
  return (
    getTextPropPlainText(props["위치/구역"]) ||
    getTextPropPlainText(props["작업/위치"]) ||
    getTextPropPlainText(props["위치"]) ||
    getTextPropPlainText(props["구역"]) ||
    "위치 미입력"
  );
}

function getFieldVoiceMemo(row: NotionPage): string {
  const props = row.properties ?? {};
  return (
    getTextPropPlainText(props["조치 메모"]) ||
    getTextPropPlainText(props["처리 메모"]) ||
    getTextPropPlainText(props["관리자 메모"]) ||
    getTextPropPlainText(props["검토 메모"]) ||
    getTextPropPlainText(props["조치내용"]) ||
    getTextPropPlainText(props["조치 내용"]) ||
    ""
  );
}

function isFieldVoiceAcknowledgement(row: NotionPage) {
  return getFieldVoiceType(row) === "공유확인";
}

function getFieldVoiceStatusTone(status: string) {
  if (status === "조치완료") return "border-emerald-400/40 text-emerald-200 print:text-emerald-800";
  if (status === "검토중") return "border-blue-400/40 text-blue-200 print:text-blue-800";
  if (status === "조치필요") return "border-amber-400/40 text-amber-200 print:text-amber-800";
  if (status === "반려") return "border-rose-400/40 text-rose-200 print:text-rose-800";
  return "border-slate-500/40 text-slate-200 print:text-slate-700";
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

function Section(props: {
  title: string;
  children: React.ReactNode;
  desc?: string;
  defaultOpen?: boolean;
}) {
  const defaultOpen = props.defaultOpen ?? true;

  return (
    <details
      open={defaultOpen}
      className="group rounded-3xl border border-slate-800 bg-slate-950 p-5 shadow-sm print:border-slate-300 print:bg-white"
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 rounded-2xl focus:outline-none focus:ring-0 print:hidden">
        <div>
          <h2 className="text-lg font-black text-white print:text-slate-950">{props.title}</h2>
          {props.desc && <p className="mt-1 text-sm text-slate-400 print:text-slate-600">{props.desc}</p>}
        </div>
        <span className="mt-1 text-slate-500 transition group-open:rotate-180">⌄</span>
      </summary>

      <div className="mt-4 print:mt-0 print:block">
        <div className="hidden print:mb-4 print:block">
          <h2 className="text-lg font-black text-slate-950">{props.title}</h2>
          {props.desc && <p className="mt-1 text-sm text-slate-600">{props.desc}</p>}
        </div>
        {props.children}
      </div>
    </details>
  );
}

function buildExpertOpinion(input: {
  tbmCount: number;
  specialCount: number;
  ebLinkedCount: number;
  ebRequiredCount: number;
  ebMissingCount: number;
  ptwCount: number;
  ptwApproved: number;
  ptwPending: number;
  riskTotal: number;
  highRiskCount: number;
  actionNeededCount: number;
  actionPhotoCount: number;
}) {
  const good: string[] = [];
  const improvements: string[] = [];
  const nextMonth: string[] = [];
  const legalChecks: { label: string; done: boolean; note: string }[] = [];

  if (input.tbmCount >= 15) {
    good.push(`이번 달 TBM은 ${input.tbmCount}건 작성되어 현장 안전활동 기록이 확인됩니다.`);
  } else if (input.tbmCount > 0) {
    improvements.push(`이번 달 TBM 작성은 ${input.tbmCount}건으로 확인됩니다. 월 20건 이상을 목표로 작업 전 TBM 작성 습관을 더 강화할 필요가 있습니다.`);
  } else {
    improvements.push("이번 달 TBM 작성 기록이 확인되지 않습니다. 작업 전 TBM 작성 체계부터 우선 정착시켜야 합니다.");
  }

  if (input.specialCount > 0) {
    good.push(`특이사항 또는 보완 필요 항목이 ${input.specialCount}건 기록되어 특이사항 기록이 확인됩니다.`);
  }

  if (input.actionPhotoCount > 0) {
    good.push(`조치사진이 ${input.actionPhotoCount}건 확인되어 조치사진 등록이 확인됩니다.`);
  }

  if (input.ebMissingCount > 0) {
    improvements.push(`EB 연결 필요 항목 ${input.ebRequiredCount}건 중 ${input.ebLinkedCount}건이 연결되어 있으며, 보완 필요 항목은 ${input.ebMissingCount}건입니다.`);
    nextMonth.push("조치 필요 또는 보완 필요 항목의 EB 연결 여부를 확인하고, 필요한 경우 사진·파일 증빙을 연결합니다.");
  } else if (input.tbmCount > 0) {
    good.push(`EB 연결 필요 항목 ${input.ebRequiredCount}건 중 보완 필요 항목은 확인되지 않았습니다.`);
  }

  if (input.ptwCount === 0) {
    good.push("이번 달 PTW 유효 운영 건은 확인되지 않았습니다. 고위험작업이 발생하지 않은 경우 정상 운영으로 볼 수 있습니다.");
    nextMonth.push("고위험작업 발생 시 PTW 대상 여부와 승인 기록을 확인합니다.");
  } else if (input.ptwApproved === 0) {
    improvements.push("PTW 운영 건은 있으나 승인 완료 건이 확인되지 않습니다. 승인상태 또는 작업허가 기록을 확인해야 합니다.");
    nextMonth.push("PTW 대상 작업과 승인 기록 여부를 확인합니다.");
  } else {
    good.push(`PTW가 ${input.ptwCount}건 운영되었고, 승인 완료 ${input.ptwApproved}건이 확인됩니다.`);
  }

  if (input.highRiskCount > 0) {
    input.tbmCount >= 15 && input.ebMissingCount === 0
      ? `이번 달 TBM 기록은 ${input.tbmCount}건이며, EB 연결 필요 항목의 보완 필요 건은 확인되지 않습니다.`
      : input.tbmCount >= 15
        ? `이번 달 TBM 기록은 ${input.tbmCount}건이며, EB 연결 보완 필요 ${input.ebMissingCount}건, 위험성평가표상 고위험 관리항목 ${input.highRiskCount}건이 확인됩니다.`
        : `이번 달 TBM 기록은 ${input.tbmCount}건입니다. 월간 기록 수와 증빙 연결 상태를 추가 확인해야 합니다.`;
  }

  legalChecks.push({
    label: "TBM 운영 기록",
    done: input.tbmCount > 0,
    note: input.tbmCount > 0 ? `${input.tbmCount}건 확인` : "기록 없음",
  });

  legalChecks.push({
    label: "증빙자료 EB 연결",
    done: input.ebMissingCount === 0 && input.tbmCount > 0,
    note: input.ebMissingCount > 0 ? `보완 필요 ${input.ebMissingCount}건` : "보완 필요 없음",
  });

  legalChecks.push({
    label: "PTW 승인 운영",
    done: input.ptwCount === 0 || input.ptwApproved > 0,
    note:
      input.ptwCount === 0
        ? "PTW 대상 작업 없음"
        : input.ptwApproved > 0
          ? `승인 ${input.ptwApproved}건`
          : "승인 완료 기록 없음",
  });

  legalChecks.push({
    label: "위험성평가 개선대책 관리",
    done: input.actionNeededCount === 0,
    note: input.actionNeededCount > 0 ? `관리 필요 ${input.actionNeededCount}건` : "관리 필요 항목 없음",
  });

  legalChecks.push({
    label: "교육·참여 증빙 관리",
    done: input.tbmCount > 0,
    note: input.tbmCount > 0 ? `TBM 교육·공유 기록 ${input.tbmCount}건 기준` : "교육·참여 기록 확인 필요",
  });

  nextMonth.push("교육 이수현황 및 수료증 누락 여부를 확인합니다.");
  nextMonth.push("위험성평가 결과 공유교육 기록과 근로자 참여 증빙을 확인합니다.");
  nextMonth.push("TBM 교육기록과 서명·사진 증빙의 정합성을 확인합니다.");

  if (nextMonth.length === 0) {
    nextMonth.push("현재 운영 상태를 유지하면서 월간 TBM, EB, PTW, 위험성평가 기록의 정합성을 주기적으로 확인합니다.");
  }

  const summary =
    input.tbmCount >= 15 && input.ebMissingCount === 0
      ? `이번 달 TBM 기록은 ${input.tbmCount}건이며, EB 연결 필요 항목의 보완 필요 건은 확인되지 않습니다.`
      : input.tbmCount >= 15
        ? `이번 달 TBM 기록은 ${input.tbmCount}건이며, EB 연결 보완 필요 ${input.ebMissingCount}건, 위험성평가표상 고위험 관리항목 ${input.highRiskCount}건이 확인됩니다.`
        : `이번 달 TBM 기록은 ${input.tbmCount}건입니다. 월간 기록 수와 증빙 연결 상태를 추가 확인해야 합니다.`;

  return {
    summary,
    good,
    improvements,
    nextMonth,
    legalChecks,
  };
}

export default async function MonthlySafetyReportPage({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string; view?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const monthKey = params.month || getCurrentMonthKey();
  const viewMode = params.view === "detail" ? "detail" : "summary";
  const isDetailView = viewMode === "detail";
  const summaryHref = params.month ? `/monthly-report?month=${encodeURIComponent(monthKey)}` : "/monthly-report";
  const detailHref = params.month
    ? `/monthly-report?month=${encodeURIComponent(monthKey)}&view=detail`
    : "/monthly-report?view=detail";

  const company = await getCompanyConfig();
  const headers = { Authorization: `Bearer ${company.notionApiKey}` };

  const [tbmRowsRaw, ebRowsRaw, ptwRowsRaw, fieldVoiceRowsRaw, risk] = await Promise.all([
    queryNotionDatabase(company.tbmDbId, company.notionApiKey),
    queryNotionDatabase(company.ebmDbId, company.notionApiKey),
    queryNotionDatabase(company.ptwDbId, company.notionApiKey),
    queryNotionDatabase(company.fieldVoiceDbId, company.notionApiKey),
    getRiskIntelligenceData(company.riskAssessmentDbId, company.notionApiKey).catch(() => null),
  ]);

  // 원청·협력사 제출자료 월간 섹션은 향후 건설/건물관리/용역대행 등
  // 실제 협력사 운영 모듈을 사용하는 테넌트에서 다시 활성화한다.
  // 현재 버블몬·몬스는 독립 테넌트 구조이므로 월간보고서에서 협력사 섹션을 숨긴다.
  const showContractorSubmissionSection = false;

  const partnerSubmissionStore =
    showContractorSubmissionSection
      ? await fetchContractorSubmissionRecords()
      : { configured: false, records: [], errorMessage: "" };

  const tbmRows = tbmRowsRaw.filter((row) => inMonth(getDateFromPage(row), monthKey));
  const ebRows = ebRowsRaw.filter((row) => {
    const date = getDateFromPage(row);
    return date ? inMonth(date, monthKey) : true;
  });
  const ptwRows = ptwRowsRaw.filter((row) => {
    const date = getDateFromPage(row);
    return date ? inMonth(date, monthKey) : true;
  });
  const fieldVoiceRows = fieldVoiceRowsRaw.filter((row) => {
    const date = getFieldVoiceDateFromPage(row);
    return date ? inMonth(date, monthKey) : true;
  });

  const fieldVoiceAcknowledgementRows = fieldVoiceRows.filter(isFieldVoiceAcknowledgement);
  const fieldVoiceReviewRows = fieldVoiceRows.filter((row) => !isFieldVoiceAcknowledgement(row));
  const fieldVoiceDoneRows = fieldVoiceReviewRows.filter((row) => getFieldVoiceStatus(row) === "조치완료");
  const fieldVoiceFollowUpRows = fieldVoiceReviewRows.filter((row) =>
    ["접수", "검토중", "조치필요", "상태 미지정"].includes(getFieldVoiceStatus(row))
  );
  const fieldVoiceMemoCount = fieldVoiceRows.filter((row) => Boolean(getFieldVoiceMemo(row))).length;

  const validPtwRows = ptwRows.filter(isValidPtwRow);

  const tbmSpecialCount = tbmRows.filter((row) => hasTbmSpecialIssue(row.properties ?? {})).length;

  const tbmEvidenceRequiredRows = tbmRows.filter((row) => needsTbmEvidenceBook(row.properties ?? {}));
  const tbmEbLinkedCount = tbmEvidenceRequiredRows.filter((row) => hasLinkedEvidenceBookByProps(row.properties ?? {})).length;
  const tbmEbMissingCount = Math.max(0, tbmEvidenceRequiredRows.length - tbmEbLinkedCount);

  const actionPhotoCount = tbmRows.reduce((sum, row) => {
    const props = row.properties ?? {};
    return (
      sum +
      getFilesCount(props["조치사진"]) +
      getFilesCount(props["조치 사진"]) +
      getFilesCount(props["개선사진"])
    );
  }, 0);

  const ptwApproved = validPtwRows.filter((row) => {
    const props = row.properties ?? {};
    const status = `${getTextPropPlainText(props["상태"])} ${getTextPropPlainText(props["승인상태"])} ${getTextPropPlainText(props["approvalStatus"])}`;
    return /승인|완료|approved/i.test(status);
  }).length;

  const ptwPending = validPtwRows.filter((row) => {
    const props = row.properties ?? {};
    const status = `${getTextPropPlainText(props["상태"])} ${getTextPropPlainText(props["승인상태"])} ${getTextPropPlainText(props["approvalStatus"])}`;
    return /대기|검토|pending|요청/i.test(status);
  }).length;

  const riskAny = risk as any;
  const riskTotal = riskAny?.total ?? riskAny?.items?.length ?? 0;
  const highRiskCount = riskAny?.highRiskCount ?? 0;
  const actionNeededCount = riskAny?.actionNeededCount ?? 0;

  const partnerRecordsThisMonth = partnerSubmissionStore.records.filter((record) =>
    record.workDate ? record.workDate.startsWith(monthKey) : true
  );
  const partnerSummary = getContractorSubmissionRecordSummary(partnerRecordsThisMonth);
  const partnerHasFollowUp = partnerSummary.followUpCount > 0;
  const partnerHasPending = partnerSummary.principalPendingCount > 0;
  const partnerFollowUpRecords = partnerRecordsThisMonth.filter(
    (record) => record.principalReviewStatus === "보완요청"
  );
  const partnerPendingRecords = partnerRecordsThisMonth.filter(
    (record) =>
      record.principalReviewStatus === "미검토" ||
      record.principalReviewStatus === "검토중" ||
      !record.principalReviewStatus
  );
  const partnerReportStatus = partnerHasFollowUp
    ? "보완 필요"
    : partnerHasPending
      ? "검토 필요"
      : partnerSummary.total > 0
        ? "확인 완료"
        : "제출 없음";
  const partnerReportBannerClass = partnerHasFollowUp
    ? "border-rose-500/40 bg-rose-950/30 text-rose-100 print:border-rose-300 print:bg-rose-50 print:text-rose-900"
    : partnerHasPending
      ? "border-amber-500/40 bg-amber-950/30 text-amber-100 print:border-amber-300 print:bg-amber-50 print:text-amber-900"
      : "border-emerald-500/40 bg-emerald-950/30 text-emerald-100 print:border-emerald-300 print:bg-emerald-50 print:text-emerald-900";

  const recentTbm = tbmRows.slice(0, 8);
  const ebMissingRows = tbmEvidenceRequiredRows.filter((row) => !hasLinkedEvidenceBook(row));

  const expertOpinion = buildExpertOpinion({
    tbmCount: tbmRows.length,
    specialCount: tbmSpecialCount,
    ebLinkedCount: tbmEbLinkedCount,
    ebRequiredCount: tbmEvidenceRequiredRows.length,
    ebMissingCount: tbmEbMissingCount,
    ptwCount: validPtwRows.length,
    ptwApproved,
    ptwPending,
    riskTotal,
    highRiskCount,
    actionNeededCount,
    actionPhotoCount,
  });

  const monthlyComplementItems = [
    {
      label: "EB 연결 보완",
      count: tbmEbMissingCount,
      note: "조치상태 기준 EB 연결 필요 항목",
    },
    {
      label: "현장참여 확인",
      count: fieldVoiceFollowUpRows.length,
      note: "접수·검토중·조치필요 현장참여",
    },
    {
      label: "위험성평가 개선대책",
      count: actionNeededCount,
      note: "위험성평가표상 개선대책 관리항목",
    },
    {
      label: "PTW 승인대기",
      count: ptwPending,
      note: "승인 또는 검토가 필요한 PTW",
    },
  ].filter((item) => item.count > 0);

  const monthlyComplementTotal = monthlyComplementItems.reduce(
    (sum, item) => sum + item.count,
    0
  );


  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 print:bg-white print:text-slate-950">
      <style>{`
        @media print {
          details:not([open]) > div {
            display: block !important;
          }
          details > summary {
            display: none !important;
          }
          details {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          table {
            break-inside: auto;
          }
          tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          thead {
            display: table-header-group;
          }
        }
      `}</style>
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
              <Link
                href={summaryHref}
                className={`rounded-xl border px-4 py-2 text-sm font-bold ${
                  viewMode === "summary"
                    ? "border-blue-500 bg-blue-600 text-white"
                    : "border-slate-700 text-slate-200 hover:bg-slate-800"
                }`}
              >
                요약 보기
              </Link>
              <Link
                href={detailHref}
                className={`rounded-xl border px-4 py-2 text-sm font-bold ${
                  viewMode === "detail"
                    ? "border-blue-500 bg-blue-600 text-white"
                    : "border-slate-700 text-slate-200 hover:bg-slate-800"
                }`}
              >
                상세 보기
              </Link>
              <Link href="/home" className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-800">
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

        {showContractorSubmissionSection ? (
          <Section
            title="협력사 이행현황"
            desc="㈜몬스 제출자료의 원청 확인, 보완요청, 미검토 상태를 월간 기준으로 확인합니다."
          >
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              <StatCard
                label="최근 접수"
                value={partnerSummary.total}
                hint="월간 협력사 제출자료"
                tone="border-cyan-500/40"
              />
              <StatCard
                label="원청 확인"
                value={partnerSummary.principalConfirmedCount}
                hint="확인 완료"
                tone="border-emerald-500/40"
              />
              <StatCard
                label="미검토"
                value={partnerSummary.principalPendingCount}
                hint="원청 검토 필요"
                tone="border-amber-500/40"
              />
              <StatCard
                label="보완요청"
                value={partnerSummary.followUpCount}
                hint="협력사 보완 필요"
                tone="border-rose-500/40"
              />
              <StatCard
                label="보고 상태"
                value={partnerReportStatus}
                hint="월간 대표자 확인 기준"
                tone={partnerHasFollowUp ? "border-rose-500/40" : partnerHasPending ? "border-amber-500/40" : "border-emerald-500/40"}
              />
            </div>

            <div className={`mt-4 rounded-2xl border p-4 text-sm font-bold leading-6 ${partnerReportBannerClass}`}>
              {partnerHasFollowUp
                ? "협력사 제출자료 중 보완요청 항목이 남아 있습니다. ㈜버블몬코리아 현장관리감독자의 보완 확인이 필요합니다."
                : partnerHasPending
                  ? "협력사 제출자료 중 아직 원청 미검토 항목이 있습니다. 원청 확인 또는 보완요청으로 처리해야 합니다."
                  : partnerSummary.total > 0
                    ? "이번 달 협력사 제출자료는 원청 확인 상태로 관리되고 있습니다."
                    : "이번 달 협력사 제출자료가 아직 확인되지 않습니다."}
            </div>

            {partnerSubmissionStore.errorMessage ? (
              <div className="mt-4 rounded-2xl border border-amber-500/40 bg-amber-950/30 p-4 text-sm leading-6 text-amber-100 print:border-amber-300 print:bg-amber-50 print:text-amber-900">
                협력사 제출자료 조회 확인이 필요합니다.
              </div>
            ) : null}

            {partnerRecordsThisMonth.length > 0 ? (
              <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-4 print:border-slate-300 print:bg-white">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-black text-white print:text-slate-950">최근 협력사 제출자료</h3>
                  <Link
                    href="/contractor-status"
                    className="rounded-full bg-cyan-500 px-3 py-1 text-xs font-black text-slate-950 print:hidden"
                  >
                    상세 보기
                  </Link>
                </div>

                <div className="mt-3 space-y-2">
                  {partnerRecordsThisMonth.slice(0, 5).map((record) => (
                    <div
                      key={record.id}
                      className="rounded-xl border border-slate-800 bg-slate-950 p-3 print:border-slate-300 print:bg-white"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-bold text-white print:text-slate-950">{record.title}</p>
                          <p className="mt-1 text-xs leading-5 text-slate-400 print:text-slate-600">
                            {record.workDate || "작업일 미입력"} · {record.siteArea || "구역 미입력"} · {record.submitterName || "제출자 미입력"}
                          </p>
                        </div>
                        <span
                          className={`w-fit rounded-full border px-2 py-1 text-xs font-black ${
                            record.principalReviewStatus === "보완요청"
                              ? "border-rose-400/40 text-rose-200 print:text-rose-800"
                              : record.principalReviewStatus === "확인"
                                ? "border-emerald-400/40 text-emerald-200 print:text-emerald-800"
                                : "border-amber-400/40 text-amber-200 print:text-amber-800"
                          }`}
                        >
                          원청 검토: {record.principalReviewStatus || "미검토"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {(partnerFollowUpRecords.length > 0 || partnerPendingRecords.length > 0) ? (
              <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-4 print:border-slate-300 print:bg-white">
                <h3 className="text-sm font-black text-white print:text-slate-950">대표자 확인 필요 항목</h3>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300 print:text-slate-700">
                  {partnerFollowUpRecords.length > 0 ? (
                    <li>• 협력사 보완요청 {partnerFollowUpRecords.length}건은 다음 월간 보고 전 조치 확인이 필요합니다.</li>
                  ) : null}
                  {partnerPendingRecords.length > 0 ? (
                    <li>• 원청 미검토 제출자료 {partnerPendingRecords.length}건은 현장관리감독자 검토가 필요합니다.</li>
                  ) : null}
                  <li>• 협력사 제출자료는 Notion이 아니라 SafeMetrica 앱에서 확인·검토합니다.</li>
                </ul>
              </div>
            ) : null}
          </Section>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="월간 TBM" value={`${tbmRows.length}건`} hint="해당 월 작성된 TBM 기록" tone="border-blue-800" />
          <StatCard label="특이사항" value={`${tbmSpecialCount}건`} hint="특이사항 또는 보완 내용 포함" tone="border-amber-800" />
          <StatCard label="EB 필요/연결" value={`${tbmEbLinkedCount}/${tbmEvidenceRequiredRows.length}건`} hint={`보완 필요 ${tbmEbMissingCount}건`} tone="border-emerald-800" />
          <StatCard label="PTW" value={`${validPtwRows.length}건`} hint={`승인 ${ptwApproved} · 대기 ${ptwPending}`} tone="border-orange-800" />
        </div>

        <section
          className={`rounded-3xl border p-5 shadow-sm ${
            monthlyComplementTotal > 0
              ? "border-amber-500/50 bg-amber-950/30 print:border-amber-300 print:bg-amber-50"
              : "border-emerald-500/40 bg-emerald-950/20 print:border-emerald-300 print:bg-emerald-50"
          }`}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p
                className={`text-sm font-black ${
                  monthlyComplementTotal > 0
                    ? "text-amber-200 print:text-amber-900"
                    : "text-emerald-200 print:text-emerald-900"
                }`}
              >
                {monthlyComplementTotal > 0 ? "보완 필요 항목 요약" : "월간 핵심 신호"}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300 print:text-slate-700">
                {monthlyComplementTotal > 0
                  ? `이번 달 관리자 확인이 필요한 항목은 총 ${monthlyComplementTotal}건입니다.`
                  : "이번 달 주요 보완 필요 항목은 확인되지 않았습니다."}
              </p>
            </div>
            <span
              className={`w-fit rounded-full px-3 py-1 text-xs font-black ${
                monthlyComplementTotal > 0
                  ? "bg-amber-400 text-slate-950"
                  : "bg-emerald-400 text-slate-950"
              }`}
            >
              총 {monthlyComplementTotal}건
            </span>
          </div>

          {monthlyComplementItems.length > 0 ? (
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {monthlyComplementItems.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3 print:border-slate-300 print:bg-white"
                >
                  <p className="text-xs font-black text-slate-400 print:text-slate-600">{item.label}</p>
                  <p className="mt-1 text-2xl font-black text-white print:text-slate-950">{item.count}건</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500 print:text-slate-600">{item.note}</p>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <Section title="운영 데이터 점검" desc="월간 운영 DB 수치를 기준으로 확인된 항목입니다." defaultOpen={isDetailView}>
          <div className="space-y-5">
            <div className="rounded-2xl border border-blue-900/70 bg-blue-950/30 p-4 print:border-blue-200 print:bg-blue-50">
              <p className="text-sm font-bold text-blue-200 print:text-blue-900">데이터 기반 종합 확인</p>
              <p className="mt-2 text-base font-black leading-relaxed text-white print:text-slate-950">
                {expertOpinion.summary}
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-emerald-900/70 bg-emerald-950/20 p-4 print:border-emerald-200 print:bg-white">
                <h3 className="text-base font-black text-emerald-200 print:text-emerald-900">데이터상 확인된 사항</h3>
                {expertOpinion.good.length > 0 ? (
                  <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-300 print:text-slate-700">
                    {expertOpinion.good.map((item, index) => (
                      <li key={index}>• {item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-slate-400 print:text-slate-600">이번 달에는 우선 개선이 필요한 항목이 더 크게 확인됩니다.</p>
                )}
              </div>

              <div className="rounded-2xl border border-rose-900/70 bg-rose-950/20 p-4 print:border-rose-200 print:bg-white">
                <h3 className="text-base font-black text-rose-200 print:text-rose-900">데이터상 보완 필요 항목</h3>
                <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-300 print:text-slate-700">
                  {expertOpinion.improvements.length > 0 ? (
                    expertOpinion.improvements.map((item, index) => <li key={index}>• {item}</li>)
                  ) : (
                    <li>• 주요 데이터상 보완 필요 항목은 확인되지 않았습니다. 현재 운영 수준을 유지하면서 월간 점검을 지속합니다.</li>
                  )}
                </ul>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-900/70 bg-amber-950/20 p-4 print:border-amber-200 print:bg-white">
              <h3 className="text-base font-black text-amber-200 print:text-amber-900">다음 달 운영계획</h3>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-300 print:text-slate-700">
                {expertOpinion.nextMonth.map((item, index) => (
                  <li key={index}>• {item}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 print:border-slate-300 print:bg-white">
              <h3 className="text-base font-black text-white print:text-slate-950">운영 체크리스트</h3>
              <div className="mt-3 overflow-hidden rounded-xl border border-slate-800 print:border-slate-300">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="bg-slate-950 text-slate-300 print:bg-slate-100 print:text-slate-800">
                    <tr>
                      <th className="px-3 py-2">항목</th>
                      <th className="px-3 py-2">상태</th>
                      <th className="px-3 py-2">비고</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expertOpinion.legalChecks.map((item, index) => (
                      <tr key={index} className="border-t border-slate-800 print:border-slate-200">
                        <td className="px-3 py-2 font-bold text-white print:text-slate-950">{item.label}</td>
                        <td className="px-3 py-2">
                          <span className={item.done ? "font-black text-emerald-300 print:text-emerald-700" : "font-black text-rose-300 print:text-rose-700"}>
                            {item.done ? "확인" : "보완 필요"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-300 print:text-slate-700">{item.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-slate-500 print:text-slate-600">
                본 체크리스트는 세메앱 운영 DB 기준의 데이터 확인표입니다. 최종 법적 판단 및 조치 책임은 사업장 관리 기준과 관계 법령에 따라 별도로 확인해야 합니다.
              </p>
            </div>
          </div>
        </Section>

        <Section
          title="현장참여 및 위험성평가 공유확인"
          desc="근로자 현장참여 QR을 통해 접수된 위험성평가 공유확인, 위험제보, 아차사고, 개선제안 기록입니다."
          defaultOpen={isDetailView || fieldVoiceFollowUpRows.length > 0}
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard
              label="총 접수"
              value={`${fieldVoiceRows.length}건`}
              hint="월간 현장참여 전체 기록"
              tone="border-cyan-800"
            />
            <StatCard
              label="공유확인"
              value={`${fieldVoiceAcknowledgementRows.length}건`}
              hint="위험성평가 주지확인 기록"
              tone="border-emerald-800"
            />
            <StatCard
              label="검토 대상"
              value={`${fieldVoiceReviewRows.length}건`}
              hint="위험제보·아차사고·개선제안"
              tone="border-blue-800"
            />
            <StatCard
              label="조치완료"
              value={`${fieldVoiceDoneRows.length}건`}
              hint="관리자 처리 완료"
              tone="border-emerald-800"
            />
            <StatCard
              label="다음 달 확인"
              value={`${fieldVoiceFollowUpRows.length}건`}
              hint="접수·검토중·조치필요"
              tone="border-amber-800"
            />
          </div>

          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-4 print:border-slate-300 print:bg-white">
            <h3 className="text-base font-black text-white print:text-slate-950">월간 현장참여 확인</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300 print:text-slate-700">
              이번 달 현장참여 접수는 총 {fieldVoiceRows.length}건입니다.
              공유확인 {fieldVoiceAcknowledgementRows.length}건, 위험제보·아차사고·개선제안 {fieldVoiceReviewRows.length}건,
              조치완료 {fieldVoiceDoneRows.length}건으로 확인됩니다.
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-500 print:text-slate-600">
              근로자 참여 기록은 위험성평가 공유 여부와 현장 위험 신호를 확인하기 위한 운영기록입니다.
              조치완료 여부는 관리자 확인 기준이며, 법적 판단 또는 면책을 보장하지 않습니다.
            </p>
          </div>

          {fieldVoiceRows.length > 0 ? (
            <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-4 print:border-slate-300 print:bg-white">
              <h3 className="text-sm font-black text-white print:text-slate-950">최근 현장참여 기록</h3>
              <div className="mt-3 space-y-2">
                {fieldVoiceRows.slice(0, 5).map((row) => {
                  const status = getFieldVoiceStatus(row);
                  const memo = getFieldVoiceMemo(row);

                  return (
                    <div
                      key={row.id}
                      className="rounded-xl border border-slate-800 bg-slate-950 p-3 print:border-slate-300 print:bg-white"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-bold text-white print:text-slate-950">{getFieldVoiceTitle(row)}</p>
                          <p className="mt-1 text-xs leading-5 text-slate-400 print:text-slate-600">
                            {getFieldVoiceDateFromPage(row) || "일자 미입력"} · {getFieldVoiceLocation(row)} · {getFieldVoiceType(row)}
                          </p>
                          {memo ? (
                            <p className="mt-2 text-xs leading-5 text-blue-200 print:text-blue-800">
                              조치 메모: {memo}
                            </p>
                          ) : null}
                        </div>
                        <span className={`w-fit rounded-full border px-2 py-1 text-xs font-black ${getFieldVoiceStatusTone(status)}`}>
                          {status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-400 print:border-slate-300 print:bg-white print:text-slate-600">
              이번 달 현장참여 접수 기록이 없습니다.
            </div>
          )}

          {fieldVoiceFollowUpRows.length > 0 ? (
            <div className="mt-4 rounded-2xl border border-amber-900/70 bg-amber-950/20 p-4 print:border-amber-200 print:bg-amber-50">
              <h3 className="text-base font-black text-amber-200 print:text-amber-900">다음 달 확인 필요</h3>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-300 print:text-slate-700">
                <li>• 접수·검토중·조치필요 상태의 현장참여 {fieldVoiceFollowUpRows.length}건은 관리자 검토가 필요합니다.</li>
                <li>• 조치 메모가 필요한 경우 현장참여 접수함에서 처리 경과를 남깁니다.</li>
                <li>• 반복 제보는 위험성평가 개선대책 반영 후보로 검토합니다.</li>
              </ul>
            </div>
          ) : null}

          {fieldVoiceMemoCount > 0 ? (
            <div className="mt-4 rounded-2xl border border-blue-900/70 bg-blue-950/20 p-4 text-sm leading-6 text-blue-100 print:border-blue-200 print:bg-blue-50 print:text-blue-900">
              이번 달 현장참여 기록 중 관리자 조치 메모가 입력된 항목은 {fieldVoiceMemoCount}건입니다.
            </div>
          ) : null}
        </Section>

        <Section
          title="위험성평가 및 근로자 참여·교육 이행 현황"
          desc="위험성평가 결과가 근로자에게 공유되고, 교육·TBM·증빙으로 관리되는지 확인하는 운영 섹션입니다."
          defaultOpen={isDetailView}
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="교육 이수현황" value="준비 중" hint="교육명·교육일·참석자·수료증 확인" tone="border-cyan-800" />
            <StatCard label="위험성평가 공유교육" value="예정" hint="위험성평가 결과 공유 여부 확인" tone="border-blue-800" />
            <StatCard label="TBM 교육기록" value={`${tbmRows.length}건`} hint="월간 TBM 공유·교육 기록 기준" tone="border-indigo-800" />
            <StatCard label="증빙 보완" value="확인 필요" hint="출석부·서명·사진 누락 확인" tone="border-amber-800" />
          </div>

          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-4 print:border-slate-300 print:bg-white">
            <h3 className="text-base font-black text-white print:text-slate-950">운영 확인 기준</h3>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-300 print:text-slate-700">
              <li>• 법정교육은 교육기관 또는 사업장 교육기록의 이수현황과 증빙 누락 여부를 구분하여 관리합니다.</li>
              <li>• 위험성평가 결과 공유는 근로자 참여, TBM 교육기록, 서명·사진 증빙과 연결하여 확인합니다.</li>
              <li>• TBM 교육기록은 개선대책 완료 증빙이 아니라 위험요인 공유·교육 이행 기록으로 관리합니다.</li>
              <li>• 수료증, 출석부, 서명, 사진 등 증빙자료가 부족한 경우 월간 보완사항으로 관리합니다.</li>
            </ul>
          </div>
        </Section>

        <Section title="EB 연결 보완 필요 항목" desc="조치상태 기준으로 EB 연결이 필요하지만 연결EB relation이 비어 있는 TBM입니다." defaultOpen={isDetailView || tbmEbMissingCount > 0}>
          <div className="overflow-hidden rounded-2xl border border-slate-800 print:border-slate-300">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-slate-900 text-slate-300 print:bg-slate-100 print:text-slate-800">
                <tr>
                  <th className="px-3 py-3">날짜</th>
                  <th className="px-3 py-3">작업명</th>
                  <th className="px-3 py-3">조치상태</th>
                  <th className="px-3 py-3">특이사항</th>
                  <th className="px-3 py-3">EB</th>
                </tr>
              </thead>
              <tbody>
                {ebMissingRows.length > 0 ? (
                  ebMissingRows.map((row) => {
                    const props = row.properties ?? {};
                    const ebCount = getRelationCount(props["연결EB"]) + getRelationCount(props["관련 EB"]);
                    const specialValue =
                      getTextPropPlainText(props["특이사항"]) ||
                      getTextPropPlainText(props["특이사항내용"]) ||
                      getTextPropPlainText(props["특이사항 내용"]) ||
                      "-";

                    return (
                      <tr key={row.id} className="border-t border-slate-800 print:border-slate-200">
                        <td className="px-3 py-3 text-slate-300 print:text-slate-700">{getDateFromPage(row) || "-"}</td>
                        <td className="px-3 py-3 font-bold text-white print:text-slate-950">{getTitleFromPage(row)}</td>
                        <td className="px-3 py-3 text-slate-300 print:text-slate-700">{getActionStatus(row) || "-"}</td>
                        <td className="px-3 py-3 text-slate-300 print:text-slate-700">{specialValue}</td>
                        <td className="px-3 py-3 text-slate-300 print:text-slate-700">{ebCount}건</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
                      EB 연결 보완 필요 항목이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Section>

        <div className="grid gap-5 lg:grid-cols-2">
          <Section title="TBM 운영 현황" desc="월간 TBM 작성, 특이사항, 증빙 연결 상태입니다." defaultOpen={isDetailView}>
            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard label="작성" value={tbmRows.length} />
              <StatCard label="특이사항" value={tbmSpecialCount} />
              <StatCard label="조치사진" value={actionPhotoCount} />
            </div>
          </Section>

          <Section title="위험성평가 관리 현황" desc="위험성평가표 DB 기준의 상시 관리 항목입니다." defaultOpen={isDetailView}>
            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard label="전체 위험항목" value={riskTotal} />
              <StatCard label="고위험" value={highRiskCount} />
              <StatCard label="개선대책 필요" value={actionNeededCount} />
            </div>
          </Section>
        </div>

        <Section title="최근 TBM 기록" desc="해당 월 TBM 중 최근 일부를 표시합니다." defaultOpen={isDetailView}>
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

        <Section title="운영 참고사항" defaultOpen={isDetailView}>
          <ul className="space-y-2 text-sm leading-relaxed text-slate-300 print:text-slate-700">
            <li>• EB 연결 누락 TBM은 증빙 연결 여부를 확인합니다.</li>
            <li>• 위험성평가표상 고위험 관리항목은 월간 TBM 공유 여부와 관련 조치 기록을 확인합니다.</li>
            <li>• 위험성평가표상 개선대책 관리항목은 담당자, 기한, 증빙자료를 확인합니다.</li>
            <li>• 본 보고서는 운영 참고자료이며 최종 조치 판단은 사업장 관리 기준에 따릅니다.</li>
          </ul>
        </Section>
      </div>
    </main>
  );
}
