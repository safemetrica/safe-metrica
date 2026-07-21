import { redirect } from "next/navigation";

import { buildRiskShareLangHref, getRiskShareLocale } from "@/lib/risk-share/riskShareI18n";
import { resolveActiveRiskSharePublicTenant } from "@/lib/risk-share/riskSharePublicTenantGuard";
import { formatSeoulCustomerDateTime } from "@/lib/risk-share/riskShareCustomerDateTime.mjs";
import { listManagerInboxItems, type ManagerInboxType } from "@/lib/risk-share/riskShareManagerInbox";
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
const STATUS_LABEL = { unreviewed: "확인 필요", in_review: "확인 중", completed: "처리 완료" } as const;
function one(value?: string | string[]) { return Array.isArray(value) ? value[0] ?? "" : value ?? ""; }

export default async function ManagerInboxPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = (await searchParams) ?? {};
  const company = one(params.company).trim().toLowerCase();
  const lang = getRiskShareLocale(one(params.lang));
  const selectedType = TYPES.some((entry) => entry.value === one(params.type)) ? one(params.type) as ManagerInboxType | "all" : "all";
  const queryText = one(params.q).trim().toLocaleLowerCase("ko-KR").slice(0, 80);
  const selectedId = one(params.id);
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
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
        <section className="overflow-hidden rounded-2xl bg-white">
          {items.length ? items.map((item) => <a key={item.id} href={`${base}&type=${selectedType}&q=${encodeURIComponent(queryText)}&id=${item.id}`} className={`block border-b p-4 hover:bg-slate-50 ${detail?.id === item.id ? "bg-emerald-50" : ""}`}>
            <div className="flex justify-between gap-3"><span className="text-xs font-black text-emerald-700">{TYPE_LABEL[item.type]}</span><span className="text-xs font-bold text-slate-500">{STATUS_LABEL[item.status]}</span></div>
            <p className="mt-2 font-black">{item.title}</p><p className="mt-1 text-xs text-slate-500">{formatSeoulCustomerDateTime(item.createdAt)}</p>
          </a>) : <p className="p-8 text-center text-sm text-slate-500">조건에 맞는 접수가 없습니다.</p>}
        </section>
        <aside className="rounded-2xl bg-white p-5">
          {detail ? <><span className="text-xs font-black text-emerald-700">{TYPE_LABEL[detail.type]}</span><h2 className="mt-2 text-xl font-black">{detail.title}</h2><dl className="mt-5 space-y-3 text-sm"><div><dt className="font-bold text-slate-500">접수 일시</dt><dd>{formatSeoulCustomerDateTime(detail.createdAt)}</dd></div><div><dt className="font-bold text-slate-500">제출자</dt><dd>{detail.submitterLabel}</dd></div>{detail.location ? <div><dt className="font-bold text-slate-500">장소</dt><dd>{detail.location}</dd></div> : null}<div><dt className="font-bold text-slate-500">내용</dt><dd className="whitespace-pre-wrap">{detail.content || "작성된 내용이 없습니다."}</dd></div><div><dt className="font-bold text-slate-500">처리 상태</dt><dd>{STATUS_LABEL[detail.status]}</dd></div>{detail.actionNote ? <div><dt className="font-bold text-slate-500">조치 메모</dt><dd className="whitespace-pre-wrap">{detail.actionNote}</dd></div> : null}</dl>{detail.canTransition ? <a href={`${managerHref}#confirmation-review`} className="mt-5 block rounded-xl bg-slate-950 px-4 py-3 text-center text-sm font-black text-white">검토·처리 계속</a> : <p className="mt-5 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">이 유형은 현재 상세 확인만 제공합니다. 상태 변경은 검증된 업무별 계약이 연결된 뒤 제공됩니다.</p>}</> : <p className="text-sm text-slate-500">목록에서 접수를 선택해 주세요.</p>}
        </aside>
      </div>
    </section>
  </main>;
}
