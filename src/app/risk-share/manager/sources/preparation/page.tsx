import type { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  listRiskSharePreparationStateForSource,
  type RiskSharePreparationEntry,
} from "@/lib/risk-share/riskSharePreparationReadModel";
import { resolveRiskShareCanonicalSiteScopeForTenant } from "@/lib/risk-share/riskShareCanonicalSiteScopeServer";
import { resolveActiveRiskSharePublicTenant } from "@/lib/risk-share/riskSharePublicTenantGuard";
import { requireTenantAccessForCurrentSession } from "@/lib/tenant-auth/tenantAccessServerGuards";
import { buildRiskShareLangHref, getRiskShareLocale } from "@/lib/risk-share/riskShareI18n";
import PreparationClient, {
  type PreparationClientEntry,
} from "./PreparationClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "위험성평가 항목 준비 상태 | SafeMetrica",
  robots: {
    index: false,
    follow: false,
  },
};

type PageSearchParams = Record<string, string | string[] | undefined>;

function readSearchParam(value?: string | string[]) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function AccessDeniedScreen() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950">
      <section className="mx-auto max-w-3xl rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
        <p className="text-xs font-black text-amber-700">SafeMetrica · 안전운영</p>
        <h1 className="mt-2 text-2xl font-black text-slate-950">
          이 회사의 원본 관리 권한이 확인되지 않았습니다.
        </h1>
        <p className="mt-3 text-sm leading-6 text-amber-900">운영 담당자에게 문의해 주세요.</p>
      </section>
    </main>
  );
}

/** Presentation-only ranking, derived purely from fields the Read Model
 * already produced (kind/category/mappingMismatch/missingRequiredField) --
 * this never computes eligibility, auto-preparability, or a final
 * decision. Array.prototype.sort is a stable sort (guaranteed since
 * ES2019), so entries sharing a rank keep the Read Model's own id.asc
 * order. Exact required order:
 *   1. invalid entries
 *   2. recorded_exception entries
 *   3. awaiting_preparation_request entries carrying mappingMismatch or
 *      missingRequiredField
 *   4. other awaiting_preparation_request entries
 *   5. already_prepared entries
 *   6. not_applicable entries
 */
function rankForEntry(entry: RiskSharePreparationEntry): number {
  if (entry.kind === "invalid") {
    return 0;
  }

  switch (entry.category) {
    case "recorded_exception":
      return 1;
    case "awaiting_preparation_request":
      return entry.mappingMismatch || entry.missingRequiredField ? 2 : 3;
    case "already_prepared":
      return 4;
    case "not_applicable":
    default:
      return 5;
  }
}

/** sourceId is intentionally omitted from the per-entry client shape --
 * every entry shares the same sourceId (the page-level prop), so repeating
 * it per row would be redundant, not a safety concern either way (the
 * Read Model already treats sourceId as safe for browser exposure). */
function toClientEntry(entry: RiskSharePreparationEntry): PreparationClientEntry {
  if (entry.kind === "invalid") {
    return { kind: "invalid", candidateId: entry.candidateId };
  }

  return {
    kind: "valid",
    candidateId: entry.candidateId,
    taskName: entry.taskName,
    hazard: entry.hazard,
    reviewerStatus: entry.reviewerStatus,
    category: entry.category,
    hasItem: entry.hasItem,
    latestDecision: entry.latestDecision,
    latestReasonCode: entry.latestReasonCode,
    mappingMismatch: entry.mappingMismatch,
    missingRequiredField: entry.missingRequiredField,
  };
}

export default async function RiskShareManagerSourcePreparationPage({
  searchParams,
}: {
  searchParams?: Promise<PageSearchParams>;
}) {
  const params = (await searchParams) ?? {};
  const rawCompanyCode = readSearchParam(params.company);
  const rawSourceId = readSearchParam(params.sourceId);
  const lang = getRiskShareLocale(readSearchParam(params.lang));

  const tenantResolution = await resolveActiveRiskSharePublicTenant(rawCompanyCode);

  if (!tenantResolution.ok) {
    return <AccessDeniedScreen />;
  }

  const tenantCode = tenantResolution.tenant.code;
  const sourcesHref = buildRiskShareLangHref("/risk-share/manager/sources", { company: tenantCode }, lang);

  const preparationHref = buildRiskShareLangHref(
    "/risk-share/manager/sources/preparation",
    { company: tenantCode, sourceId: rawSourceId },
    lang,
  );

  const tenantAccessResult = await requireTenantAccessForCurrentSession({
    tenantCode,
    allowedRoles: ["tenant_admin", "tenant_manager"],
  });

  if (!tenantAccessResult.ok) {
    if (tenantAccessResult.reason === "unauthenticated") {
      redirect(`/login?callbackUrl=${encodeURIComponent(preparationHref)}`);
    }

    return <AccessDeniedScreen />;
  }

  const selectedTenantCode = tenantAccessResult.context.selectedTenantCode;
  const role = tenantAccessResult.context.role;

  // Defensive re-check, matching every other manager route in this module:
  // allowedRoles above already excludes owner_internal/tenant_representative/
  // tenant_viewer, but a future allowedRoles edit must not be able to widen
  // this route's access without also touching this line.
  if (
    selectedTenantCode !== tenantCode ||
    (role !== "tenant_admin" && role !== "tenant_manager")
  ) {
    return <AccessDeniedScreen />;
  }

  const siteScope = await resolveRiskShareCanonicalSiteScopeForTenant(
    selectedTenantCode,
    tenantResolution.tenant.defaultSiteId,
  ).catch(() => ({ ok: false as const }));

  if (!siteScope.ok) {
    return <AccessDeniedScreen />;
  }

  // Only the server-confirmed selectedTenantCode and canonical site are
  // passed to the Read Model -- never rawCompanyCode or tenantCode from the
  // unauthenticated resolution step above.
  const listResult = await listRiskSharePreparationStateForSource(
    selectedTenantCode,
    rawSourceId,
    siteScope.siteId,
  );

  const companyLabel = tenantResolution.tenant.name || tenantCode;

  const sortedClientEntries: PreparationClientEntry[] =
    listResult.status === "ok"
      ? [...listResult.entries].sort((a, b) => rankForEntry(a) - rankForEntry(b)).map(toClientEntry)
      : [];

  return (
    <PreparationClient
      companyCode={selectedTenantCode}
      sourceId={rawSourceId}
      lang={lang}
      companyLabel={companyLabel}
      sourcesHref={sourcesHref}
      listStatus={listResult.status}
      sourceTitle={listResult.status === "ok" ? listResult.source.sourceTitle : null}
      siteName={listResult.status === "ok" ? listResult.source.siteName : null}
      entries={sortedClientEntries}
      summary={listResult.status === "ok" ? listResult.summary : null}
      overflow={listResult.status === "ok" ? listResult.overflow : false}
    />
  );
}
