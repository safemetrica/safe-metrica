import { createHash } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import ManagerInboxCustomerWorkspace, {
  type InboxWorkspaceAttention,
  type InboxWorkspaceItem,
  type InboxWorkspaceStatus,
  type InboxWorkspaceType,
} from "@/components/risk-share/manager/ManagerInboxCustomerWorkspace";
import { buildRiskShareLangHref, getRiskShareLocale } from "@/lib/risk-share/riskShareI18n";
import { resolveActiveRiskSharePublicTenant } from "@/lib/risk-share/riskSharePublicTenantGuard";
import { formatSeoulCustomerDateTime } from "@/lib/risk-share/riskShareCustomerDateTime.mjs";
import { listManagerInboxAuditEvents, listManagerInboxItems, type ManagerInboxType } from "@/lib/risk-share/riskShareManagerInbox";
import { getDefaultTenantSiteConfigByTenantCode } from "@/lib/supabaseServer";
import { updateManagerInboxReview, type ManagerInboxReviewResultCode } from "@/lib/risk-share/riskShareManagerInboxReview";
import { requireTenantManagerAccessForCurrentSession } from "@/lib/tenant-auth/tenantAccessServerGuards";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const TYPES = new Set<ManagerInboxType>(["monthly", "prework", "anonymous", "visitor", "representative"]);
const STATUSES = new Set<InboxWorkspaceStatus>(["unreviewed", "in_review", "completed"]);
const PERIODS = new Set(["today", "week", "month"] as const);
const RESULT_MESSAGE: Partial<Record<ManagerInboxReviewResultCode, string>> = {
  updated: "처리 상태와 관리자 기록을 저장했습니다.",
  replayed: "이미 저장된 동일 요청을 확인했습니다. 중복 기록은 만들지 않았습니다.",
  validation_failed: "입력 내용을 확인해 주세요. 처리 기록 완료에는 관리자 메모가 필요합니다.",
  forbidden: "이 고객사의 접수 업무를 처리할 권한을 확인할 수 없습니다.",
  not_found: "접수 업무를 찾을 수 없습니다. 목록을 새로 확인해 주세요.",
  unsupported_type: "현재 처리할 수 없는 접수유형입니다.",
  idempotency_conflict: "동일 요청 식별자가 다른 처리에 사용됐습니다. 목록을 새로 확인해 주세요.",
  status_conflict: "다른 화면에서 상태가 먼저 변경됐습니다. 최신 상태를 다시 확인해 주세요.",
  request_failed: "처리 요청을 완료하지 못했습니다. 잠시 후 같은 화면에서 다시 시도해 주세요.",
  invalid_response: "처리 결과를 확인할 수 없습니다. 상태를 새로 확인한 뒤 다시 시도해 주세요.",
};
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function one(value?: string | string[]) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function normalizeCompanyCode(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 64);
}

function inboxResultHref(companyCode: string, submissionId: string, result: string) {
  const query = new URLSearchParams({ company: companyCode, id: submissionId, reviewResult: result });
  return `/risk-share/manager/inbox?${query.toString()}`;
}

async function updateInboxReview(formData: FormData) {
  "use server";
  const companyCode = normalizeCompanyCode(String(formData.get("companyCode") ?? ""));
  const submissionId = String(formData.get("submissionId") ?? "");
  const expectedStatus = String(formData.get("expectedStatus") ?? "");
  const nextStatus = String(formData.get("nextStatus") ?? "");
  const actionNote = String(formData.get("actionNote") ?? "").trim();
  const validTransition =
    (expectedStatus === "unreviewed" && nextStatus === "in_review")
    || (expectedStatus === "in_review" && nextStatus === "completed");

  if (
    !companyCode
    || !UUID_PATTERN.test(submissionId)
    || !validTransition
    || actionNote.length > 500
    || (nextStatus === "completed" && !actionNote)
  ) {
    redirect(inboxResultHref(companyCode, submissionId, "validation_failed"));
  }

  const access = await requireTenantManagerAccessForCurrentSession({ tenantCode: companyCode });
  if (!access.ok) {
    if (access.reason === "unauthenticated") {
      redirect(`/login?callbackUrl=${encodeURIComponent(inboxResultHref(companyCode, submissionId, "unauthenticated"))}`);
    }
    redirect(inboxResultHref(companyCode, submissionId, "forbidden"));
  }

  const idempotencyKey = `manager-inbox:v1:${createHash("sha256").update(JSON.stringify([
    companyCode,
    access.context.membership.membershipId,
    submissionId,
    expectedStatus,
    nextStatus,
    actionNote || null,
  ])).digest("hex")}`;

  const result = await updateManagerInboxReview({
    companyCode,
    actorMembershipId: access.context.membership.membershipId,
    submissionId,
    expectedStatus: expectedStatus as "unreviewed" | "in_review",
    nextStatus: nextStatus as "in_review" | "completed",
    actionNote,
    idempotencyKey,
  });
  revalidatePath("/risk-share/manager/inbox");
  revalidatePath("/risk-share/manager");
  redirect(inboxResultHref(companyCode, submissionId, result.code));
}

function seoulDateKey(value: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function getCurrentTimestamp() {
  return Date.now();
}

function isSameSeoulDate(createdAt: string, now: number) {
  const createdAtMs = Date.parse(createdAt);
  return Number.isFinite(createdAtMs)
    && seoulDateKey(new Date(createdAtMs)) === seoulDateKey(new Date(now));
}

function resolveAttention(status: InboxWorkspaceStatus, createdAt: string, now: number): InboxWorkspaceAttention {
  if (status === "completed") return "complete";
  if (status === "in_review") return "action";
  const createdAtMs = Date.parse(createdAt);
  return Number.isFinite(createdAtMs) && now - createdAtMs >= 24 * 60 * 60 * 1000 ? "overdue" : "normal";
}

function ageLabel(attention: InboxWorkspaceAttention) {
  if (attention === "overdue") return "장기 미확인";
  if (attention === "action") return "처리 중";
  if (attention === "complete") return "처리 기록 완료";
  return "확인 필요";
}

function withinPeriod(createdAt: string, period: "today" | "week" | "month", now: number) {
  const createdAtMs = Date.parse(createdAt);
  if (!Number.isFinite(createdAtMs)) return false;
  if (period === "today") return seoulDateKey(new Date(createdAtMs)) === seoulDateKey(new Date(now));
  const days = period === "week" ? 7 : 30;
  return createdAtMs >= now - days * 24 * 60 * 60 * 1000;
}

function priorityRank(item: InboxWorkspaceItem) {
  return { overdue: 0, action: 1, normal: 2, complete: 3 }[item.attention];
}

export default async function ManagerInboxPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = (await searchParams) ?? {};
  const company = one(params.company).trim().toLowerCase();
  const lang = getRiskShareLocale(one(params.lang));
  const selectedType = TYPES.has(one(params.type) as ManagerInboxType) ? one(params.type) as ManagerInboxType : "all";
  const selectedStatus = STATUSES.has(one(params.status) as InboxWorkspaceStatus) ? one(params.status) as InboxWorkspaceStatus : "all";
  const selectedPeriod = PERIODS.has(one(params.period) as "today" | "week" | "month") ? one(params.period) as "today" | "week" | "month" : "month";
  const queryText = one(params.q).trim().toLocaleLowerCase("ko-KR").slice(0, 80);
  const selectedId = one(params.id);
  const reviewResult = one(params.reviewResult) as ManagerInboxReviewResultCode;
  const tenant = await resolveActiveRiskSharePublicTenant(company);
  if (!tenant.ok) redirect(buildRiskShareLangHref("/risk-share/manager", { company }, lang));
  const access = await requireTenantManagerAccessForCurrentSession({ tenantCode: tenant.tenant.code });
  if (!access.ok) {
    if (access.reason === "unauthenticated") {
      redirect(`/login?callbackUrl=${encodeURIComponent(buildRiskShareLangHref("/risk-share/manager/inbox", { company }, lang))}`);
    }
    redirect(buildRiskShareLangHref("/risk-share/manager", { company: tenant.tenant.code }, lang));
  }

  const now = getCurrentTimestamp();
  const defaultSite = await getDefaultTenantSiteConfigByTenantCode(tenant.tenant.code).catch(() => null);
  const allItems = await listManagerInboxItems(tenant.tenant.code, defaultSite?.id ?? null);
  const workspaceItems: InboxWorkspaceItem[] = allItems.map((item) => {
    const attention = resolveAttention(item.status, item.createdAt, now);
    return {
      id: item.id,
      type: item.type as InboxWorkspaceType,
      title: item.title,
      content: item.content,
      location: item.location,
      submitterLabel: item.submitterLabel,
      createdAtLabel: formatSeoulCustomerDateTime(item.createdAt),
      status: item.status,
      actionNote: item.actionNote,
      canTransition: item.canTransition,
      attention,
      ageLabel: ageLabel(attention),
    };
  });

  const items = workspaceItems
    .filter((item, index) => {
      const source = allItems[index];
      return (selectedType === "all" || item.type === selectedType)
        && (selectedStatus === "all" || item.status === selectedStatus)
        && withinPeriod(source.createdAt, selectedPeriod, now)
        && (!queryText || `${item.title} ${item.content} ${item.location}`.toLocaleLowerCase("ko-KR").includes(queryText));
    })
    .sort((left, right) => priorityRank(left) - priorityRank(right));

  const detail = items.find((item) => item.id === selectedId) ?? items[0] ?? null;
  let auditEvents: Awaited<ReturnType<typeof listManagerInboxAuditEvents>> = [];
  let auditEventsFailed = false;
  if (detail) {
    try {
      auditEvents = await listManagerInboxAuditEvents(tenant.tenant.code, detail.id, detail.type);
    } catch {
      auditEventsFailed = true;
    }
  }

  const summaryCounts = {
    today: allItems.filter((item) => isSameSeoulDate(item.createdAt, now)).length,
    unreviewed: workspaceItems.filter((item) => item.status === "unreviewed").length,
    inReview: workspaceItems.filter((item) => item.status === "in_review").length,
    overdue: workspaceItems.filter((item) => item.attention === "overdue").length,
    completed: workspaceItems.filter((item) => item.status === "completed").length,
  };
  const baseHref = buildRiskShareLangHref("/risk-share/manager/inbox", { company: tenant.tenant.code }, lang);
  const managerHref = buildRiskShareLangHref("/risk-share/manager", { company: tenant.tenant.code }, lang);
  const monthlyHref = buildRiskShareLangHref("/risk-share/monthly", { company: tenant.tenant.code }, lang);

  return (
    <ManagerInboxCustomerWorkspace
      companyLabel={tenant.tenant.name}
      companyCode={tenant.tenant.code}
      managerHref={managerHref}
      monthlyHref={monthlyHref}
      baseHref={baseHref}
      items={items}
      selectedItem={detail}
      auditEvents={auditEvents.map((event) => ({ ...event, createdAtLabel: formatSeoulCustomerDateTime(event.createdAt) }))}
      auditEventsFailed={auditEventsFailed}
      summaryCounts={summaryCounts}
      selectedType={selectedType}
      selectedStatus={selectedStatus}
      selectedPeriod={selectedPeriod}
      queryText={queryText}
      mobileDetailInitiallyOpen={Boolean(selectedId)}
      resultMessage={RESULT_MESSAGE[reviewResult]}
      resultTone={reviewResult === "updated" || reviewResult === "replayed" ? "success" : "warning"}
      updateReviewAction={updateInboxReview}
    />
  );
}
