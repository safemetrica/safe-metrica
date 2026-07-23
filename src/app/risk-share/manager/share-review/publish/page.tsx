import type { Metadata } from "next";
import { redirect } from "next/navigation";

import SiteProfileShell from "@/app/risk-share/manager/settings/site-profile/SiteProfileShell";
import { buildRiskShareLangHref, getRiskShareLocale } from "@/lib/risk-share/riskShareI18n";
import { resolveRiskShareCanonicalSiteScopeForTenant } from "@/lib/risk-share/riskShareCanonicalSiteScopeServer";
import { listRiskShareManagerPublishState } from "@/lib/risk-share/riskShareManagerPublishReadModel";
import { resolveActiveRiskSharePublicTenant } from "@/lib/risk-share/riskSharePublicTenantGuard";
import { requireTenantAccessForCurrentSession } from "@/lib/tenant-auth/tenantAccessServerGuards";
import PublishClient, {
  type PublishClientActiveVersion,
  type PublishClientEntry,
} from "./PublishClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "공유본 게시 | SafeMetrica",
  robots: {
    index: false,
    follow: false,
  },
};

type PageSearchParams = Record<string, string | string[] | undefined>;

function readSearchParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function getCurrentKstMonth(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;

  if (!year || !month) {
    throw new Error("Unable to resolve the current KST month");
  }

  return `${year}-${month}`;
}

function buildDefaultLockTitle(lockMonth: string): string {
  const [year, month] = lockMonth.split("-");
  return `${year}년 ${Number(month)}월 위험성평가 공유`;
}

function ErrorShell({ title, message }: { title: string; message: string }) {
  return (
    <SiteProfileShell>
      <div className="content" style={{ padding: "24px", overflowX: "hidden" }}>
        <section className="card card--pad" style={{ maxWidth: "720px", margin: "40px auto" }}>
          <p className="eyebrow">SafeMetrica · 안전운영</p>
          <h1>{title}</h1>
          <p className="muted" style={{ marginTop: "10px" }}>
            {message}
          </p>
        </section>
      </div>
    </SiteProfileShell>
  );
}

export default async function RiskShareManagerPublishPage({
  searchParams,
}: {
  searchParams?: Promise<PageSearchParams>;
}) {
  const params = (await searchParams) ?? {};
  const rawCompanyCode = readSearchParam(params.company);
  const lang = getRiskShareLocale(readSearchParam(params.lang));
  const publishHref = buildRiskShareLangHref(
    "/risk-share/manager/share-review/publish",
    { company: rawCompanyCode },
    lang,
  );

  const tenantResolution = await resolveActiveRiskSharePublicTenant(rawCompanyCode);

  if (!tenantResolution.ok) {
    return (
      <ErrorShell
        title="공유본 게시 화면을 열 수 없습니다."
        message="등록된 고객사 코드가 필요합니다. 관리자 홈에서 다시 접속해 주세요."
      />
    );
  }

  const tenantCode = tenantResolution.tenant.code;
  const tenantAccessResult = await requireTenantAccessForCurrentSession({
    tenantCode,
    allowedRoles: ["tenant_admin", "tenant_manager"],
  });

  if (!tenantAccessResult.ok) {
    if (tenantAccessResult.reason === "unauthenticated") {
      redirect(`/login?callbackUrl=${encodeURIComponent(publishHref)}`);
    }

    return (
      <ErrorShell
        title="이 화면에 접근할 권한이 확인되지 않았습니다."
        message="운영 담당자에게 문의해 주세요."
      />
    );
  }

  const selectedTenantCode = tenantAccessResult.context.selectedTenantCode;
  const role = tenantAccessResult.context.role;

  if (
    selectedTenantCode !== tenantCode ||
    (role !== "tenant_admin" && role !== "tenant_manager")
  ) {
    return (
      <ErrorShell
        title="이 화면에 접근할 권한이 확인되지 않았습니다."
        message="운영 담당자에게 문의해 주세요."
      />
    );
  }

  const siteScope = await resolveRiskShareCanonicalSiteScopeForTenant(
    selectedTenantCode,
    tenantResolution.tenant.defaultSiteId,
  ).catch(() => ({ ok: false as const }));

  if (!siteScope.ok) {
    return (
      <ErrorShell
        title="공유본 게시 화면을 열 수 없습니다."
        message="기본사업장 설정을 확인한 뒤 다시 시도해 주세요."
      />
    );
  }

  const lockMonth = getCurrentKstMonth();
  const readResult = await listRiskShareManagerPublishState(
    selectedTenantCode,
    lockMonth,
    siteScope.siteId,
  );
  const managerHref = buildRiskShareLangHref(
    "/risk-share/manager",
    { company: selectedTenantCode },
    lang,
  );
  const reviewHref = buildRiskShareLangHref(
    "/risk-share/manager/share-review",
    { company: selectedTenantCode },
    lang,
  );

  const entries: PublishClientEntry[] =
    readResult.status === "ok"
      ? readResult.entries.map((entry) =>
          entry.kind === "valid"
            ? {
                kind: "valid" as const,
                id: entry.id,
                siteName: entry.siteName,
                sourceTitle: entry.sourceTitle,
                taskName: entry.taskName,
                hazard: entry.hazard,
                riskLevel: entry.riskLevel,
                currentControls: entry.currentControls,
                improvementPlan: entry.improvementPlan,
                workerShareSummary: entry.workerShareSummary,
                workerVisible: entry.workerVisible,
                reviewRevision: entry.reviewRevision,
                state: entry.state,
                reviewReasons: entry.reviewReasons,
              }
            : { kind: "invalid" as const, id: entry.id },
        )
      : [];

  const activeVersion: PublishClientActiveVersion | null =
    readResult.status === "ok" ? readResult.activeVersion : null;

  return (
    <SiteProfileShell>
      <PublishClient
        companyCode={selectedTenantCode}
        lockMonth={lockMonth}
        defaultLockTitle={buildDefaultLockTitle(lockMonth)}
        managerHref={managerHref}
        reviewHref={reviewHref}
        readStatus={readResult.status}
        entries={entries}
        activeVersion={activeVersion}
        overflow={readResult.status === "ok" ? readResult.overflow : false}
        counts={
          readResult.status === "ok"
            ? readResult.counts
            : {
                readyToPublish: 0,
                alreadyLocked: 0,
                reviewRequired: 0,
                invalid: 0,
              }
        }
      />
    </SiteProfileShell>
  );
}
