import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { resolveActiveRiskSharePublicTenant } from "@/lib/risk-share/riskSharePublicTenantGuard";
import { listManagerConfirmationReviews, updateManagerConfirmationReview, type ConfirmationReviewStatus } from "@/lib/risk-share/riskShareManagerConfirmationReview";
import { requireTenantAccessForCurrentSession } from "@/lib/tenant-auth/tenantAccessServerGuards";

export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REVIEW_STATUSES = new Set<ConfirmationReviewStatus>(["unreviewed", "in_review", "completed"]);
const NEXT_STATUSES = new Set(["in_review", "completed"]);

async function updateReview(formData: FormData) {
  "use server";
  const companyCode = String(formData.get("companyCode") ?? "").trim().toLowerCase();
  const submissionId = String(formData.get("submissionId") ?? "");
  const expectedStatus = String(formData.get("expectedStatus") ?? "") as ConfirmationReviewStatus;
  const nextStatus = String(formData.get("nextStatus") ?? "") as "in_review" | "completed";
  const actionNote = String(formData.get("actionNote") ?? "").trim().slice(0, 500);
  if (
    !companyCode
    || !UUID_PATTERN.test(submissionId)
    || !REVIEW_STATUSES.has(expectedStatus)
    || !NEXT_STATUSES.has(nextStatus)
  ) {
    redirect(`/risk-share/manager/confirmations?company=${encodeURIComponent(companyCode)}&result=validation_failed`);
  }
  const access = await requireTenantAccessForCurrentSession({ tenantCode: companyCode, allowedRoles: ["tenant_admin", "tenant_manager"] });
  if (!access.ok) redirect("/login");
  const result = await updateManagerConfirmationReview({
    companyCode,
    actorMembershipId: access.context.membership.membershipId,
    submissionId,
    expectedStatus,
    nextStatus,
    actionNote,
  });
  revalidatePath("/risk-share/manager/confirmations");
  revalidatePath("/risk-share/manager");
  revalidatePath("/risk-share/monthly");
  redirect(
    `/risk-share/manager/confirmations?company=${encodeURIComponent(companyCode)}&result=${result.ok ? "updated" : encodeURIComponent(result.code)}`,
  );
}

const LABEL: Record<ConfirmationReviewStatus, string> = {
  unreviewed: "미검토",
  in_review: "검토 중",
  completed: "검토 완료",
};

export default async function Page({ searchParams }: { searchParams?: Promise<{ company?: string; result?: string }> }) {
  const params = await searchParams;
  const company = String(params?.company ?? "").trim().toLowerCase();
  const tenant = await resolveActiveRiskSharePublicTenant(company);
  if (!tenant.ok) return <main className="p-8">등록된 고객사가 필요합니다.</main>;
  const access = await requireTenantAccessForCurrentSession({ tenantCode: tenant.tenant.code, allowedRoles: ["tenant_admin", "tenant_manager"] });
  if (!access.ok) redirect(`/login?callbackUrl=${encodeURIComponent(`/risk-share/manager/confirmations?company=${tenant.tenant.code}`)}`);
  const rows = await listManagerConfirmationReviews(tenant.tenant.code).catch(() => []);
  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-950">
      <section className="mx-auto max-w-4xl">
        <a className="text-sm font-bold text-blue-700" href={`/risk-share/manager?company=${tenant.tenant.code}`}>← 관리자 홈</a>
        <h1 className="mt-4 text-2xl font-black">근로자 공유확인 검토·조치</h1>
        <p className="mt-2 text-sm text-slate-600">Version에 연결된 확인 기록만 표시합니다.</p>
        {params?.result === "updated" ? <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">검토 상태를 저장했습니다.</p> : null}
        {params?.result && params.result !== "updated" ? <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-800">상태가 변경되었거나 요청을 처리하지 못했습니다. 최신 상태를 확인해 다시 시도해 주세요.</p> : null}
        <div className="mt-5 space-y-3">
          {rows.map((row) => (
            <article key={row.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div><h2 className="font-black">{row.title}</h2><p className="text-xs text-slate-500">{row.createdAt}</p></div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black">{LABEL[row.reviewStatus]}</span>
              </div>
              <form action={updateReview} className="mt-4 flex flex-wrap gap-2">
                <input type="hidden" name="companyCode" value={tenant.tenant.code} />
                <input type="hidden" name="submissionId" value={row.id} />
                <input type="hidden" name="expectedStatus" value={row.reviewStatus} />
                <input name="actionNote" defaultValue={row.actionNote} maxLength={500} placeholder="검토·조치 메모" className="min-w-64 flex-1 rounded-xl border px-3 py-2 text-sm" />
                {row.reviewStatus === "unreviewed" ? <button name="nextStatus" value="in_review" className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-black text-white">검토 시작</button> : null}
                {row.reviewStatus !== "completed" ? <button name="nextStatus" value="completed" className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white">검토 완료</button> : null}
              </form>
            </article>
          ))}
          {rows.length === 0 ? <div className="rounded-2xl border bg-white p-8 text-center text-slate-500">검토할 Version 확인 기록이 없습니다.</div> : null}
        </div>
      </section>
    </main>
  );
}
