import { createHash } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { buildRiskShareLangHref, getRiskShareLocale } from "@/lib/risk-share/riskShareI18n";
import { resolveActiveRiskSharePublicTenant } from "@/lib/risk-share/riskSharePublicTenantGuard";
import { formatSeoulCustomerDateTime } from "@/lib/risk-share/riskShareCustomerDateTime.mjs";
import { listManagerInboxAuditEvents, listManagerInboxItems, type ManagerInboxType } from "@/lib/risk-share/riskShareManagerInbox";
import { updateManagerInboxReview, type ManagerInboxReviewResultCode } from "@/lib/risk-share/riskShareManagerInboxReview";
import { requireTenantManagerAccessForCurrentSession } from "@/lib/tenant-auth/tenantAccessServerGuards";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const TYPES: { value: ManagerInboxType | "all"; label: string }[] = [
  { value: "all", label: "전체" }, { value: "monthly", label: "공유확인" },
  { value: "prework", label: "작업 전" }, { value: "anonymous", label: "익명 의견" },
  { value: "visitor", label: "외부인" }, { value: "representative", label: "근로자대표" },
];
const TYPE_LABEL: Record<ManagerInboxType, string> = {
  monthly: "위험성평가 공유확인", prework: "작업 전 안전확인", anonymous: "익명 의견",
  visitor: "외부인 확인", representative: "근로자대표 확인",
};
const STATUS_LABEL = { unreviewed: "확인 필요", in_review: "처리 중", completed: "처리 기록 완료" } as const;
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
function one(value?: string | string[]) { return Array.isArray(value) ? value[0] ?? "" : value ?? ""; }

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

export default async function ManagerInboxPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = (await searchParams) ?? {};
  const company = one(params.company).trim().toLowerCase();
  const lang = getRiskShareLocale(one(params.lang));
  const selectedType = TYPES.some((entry) => entry.value === one(params.type)) ? one(params.type) as ManagerInboxType | "all" : "all";
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

  const allItems = await listManagerInboxItems(tenant.tenant.code);
  const items = allItems.filter((item) => (selectedType === "all" || item.type === selectedType)
    && (!queryText || `${item.title} ${item.content} ${item.location}`.toLocaleLowerCase("ko-KR").includes(queryText)));
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
  const base = buildRiskShareLangHref("/risk-share/manager/inbox", { company: tenant.tenant.code }, lang);
  const managerHref = buildRiskShareLangHref("/risk-share/manager", { company: tenant.tenant.code }, lang);
  const monthlyHref = buildRiskShareLangHref("/risk-share/monthly", { company: tenant.tenant.code }, lang);

  return <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950">
    <section className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-black text-emerald-700">{tenant.tenant.name}</p><h1 className="mt-1 text-3xl font-black">관리자 접수함</h1><p className="mt-2 text-sm text-slate-600">현장 접수를 한곳에서 찾고 상세 내용을 확인합니다.</p></div>
        <div className="flex gap-2"><a className="rounded-xl border bg-white px-4 py-2 text-sm font-bold" href={monthlyHref}>월간 요약</a><a className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white" href={managerHref}>관리자 홈</a></div>
      </div>
      <form className="mt-6 flex flex-wrap gap-2 rounded-2xl bg-white p-4" method="get">
        <input type="hidden" name="company" value={tenant.tenant.code}/><input type="hidden" name="lang" value={lang}/>
        <select name="type" defaultValue={selectedType} className="rounded-xl border px-3 py-2 text-sm">{TYPES.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}</select>
        <input name="q" defaultValue={queryText} placeholder="제목·내용·장소 검색" maxLength={80} className="min-w-64 flex-1 rounded-xl border px-3 py-2 text-sm"/>
        <button className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-black text-white">조회</button>
      </form>
      {RESULT_MESSAGE[reviewResult] ? <p className={`mt-4 rounded-xl p-3 text-sm font-bold ${reviewResult === "updated" || reviewResult === "replayed" ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}>{RESULT_MESSAGE[reviewResult]}</p> : null}
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
        <section className="overflow-hidden rounded-2xl bg-white">
          {items.length ? items.map((item) => <a key={item.id} href={`${base}&type=${selectedType}&q=${encodeURIComponent(queryText)}&id=${item.id}`} className={`block border-b p-4 hover:bg-slate-50 ${detail?.id === item.id ? "bg-emerald-50" : ""}`}>
            <div className="flex justify-between gap-3"><span className="text-xs font-black text-emerald-700">{TYPE_LABEL[item.type]}</span><span className="text-xs font-bold text-slate-500">{STATUS_LABEL[item.status]}</span></div>
            <p className="mt-2 font-black">{item.title}</p><p className="mt-1 text-xs text-slate-500">{formatSeoulCustomerDateTime(item.createdAt)}</p>
          </a>) : <p className="p-8 text-center text-sm text-slate-500">조건에 맞는 접수가 없습니다.</p>}
        </section>
        <aside className="rounded-2xl bg-white p-5">
          {detail ? <><span className="text-xs font-black text-emerald-700">{TYPE_LABEL[detail.type]}</span><h2 className="mt-2 text-xl font-black">{detail.title}</h2><dl className="mt-5 space-y-3 text-sm"><div><dt className="font-bold text-slate-500">접수 일시</dt><dd>{formatSeoulCustomerDateTime(detail.createdAt)}</dd></div><div><dt className="font-bold text-slate-500">제출자</dt><dd>{detail.submitterLabel}</dd></div>{detail.location ? <div><dt className="font-bold text-slate-500">장소</dt><dd>{detail.location}</dd></div> : null}<div><dt className="font-bold text-slate-500">내용</dt><dd className="whitespace-pre-wrap">{detail.content || "작성된 내용이 없습니다."}</dd></div><div><dt className="font-bold text-slate-500">처리 상태</dt><dd>{STATUS_LABEL[detail.status]}</dd></div>{detail.actionNote ? <div><dt className="font-bold text-slate-500">관리자 메모</dt><dd className="whitespace-pre-wrap">{detail.actionNote}</dd></div> : null}</dl><section className="mt-5 border-t pt-5"><h3 className="text-sm font-black">처리 이력</h3>{auditEventsFailed ? <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">처리 이력을 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.</p> : auditEvents.length ? <ol className="mt-3 space-y-3">{auditEvents.map((event) => <li key={event.id} className="rounded-xl bg-slate-50 p-3 text-xs"><div className="flex flex-wrap items-center justify-between gap-2"><strong>{STATUS_LABEL[event.fromStatus]} → {STATUS_LABEL[event.toStatus]}</strong><span className="text-slate-500">{formatSeoulCustomerDateTime(event.createdAt)}</span></div>{event.actionNote ? <p className="mt-2 whitespace-pre-wrap text-slate-700">{event.actionNote}</p> : null}</li>)}</ol> : <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">아직 기록된 상태 변경이 없습니다.</p>}</section>{detail.type === "monthly" ? (detail.canTransition ? <a href={`${managerHref}#confirmation-review`} className="mt-5 block rounded-xl bg-slate-950 px-4 py-3 text-center text-sm font-black text-white">검토·처리 계속</a> : <p className="mt-5 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">이 공유확인 기록은 현재 상태 변경 대상이 아닙니다.</p>) : detail.status !== "completed" ? <form action={updateInboxReview} className="mt-5 space-y-3 border-t pt-5"><input type="hidden" name="companyCode" value={tenant.tenant.code}/><input type="hidden" name="submissionId" value={detail.id}/><input type="hidden" name="expectedStatus" value={detail.status}/><input type="hidden" name="nextStatus" value={detail.status === "unreviewed" ? "in_review" : "completed"}/><label className="block text-sm font-black" htmlFor={`action-note-${detail.id}`}>관리자 메모{detail.status === "in_review" ? " (필수)" : " (선택)"}</label><textarea id={`action-note-${detail.id}`} name="actionNote" defaultValue={detail.actionNote} maxLength={500} required={detail.status === "in_review"} rows={4} className="w-full rounded-xl border p-3 text-sm" placeholder={detail.status === "in_review" ? "확인한 내용과 전달·조치 기록을 입력해 주세요." : "확인을 시작하며 남길 메모가 있으면 입력해 주세요."}/><button type="submit" className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white">{detail.status === "unreviewed" ? "확인 시작" : "처리 기록 완료"}</button><p className="text-xs leading-5 text-slate-500">접수함 처리 기록을 남기는 기능이며, 안전조치의 적정성이나 법적 종결을 확정하지 않습니다.</p></form> : <p className="mt-5 rounded-xl bg-emerald-50 p-3 text-xs leading-5 text-emerald-900">처리 기록이 완료됐습니다. 위 처리 이력에서 기록 내용을 확인할 수 있습니다.</p>}</> : <p className="text-sm text-slate-500">목록에서 접수를 선택해 주세요.</p>}
        </aside>
      </div>
    </section>
  </main>;
}
