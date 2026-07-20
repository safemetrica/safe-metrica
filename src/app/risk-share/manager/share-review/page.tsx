import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { listRiskShareItemsForManagerReview } from "@/lib/risk-share/riskShareManagerReview";
import { resolveActiveRiskSharePublicTenant } from "@/lib/risk-share/riskSharePublicTenantGuard";
import { requireTenantAccessForCurrentSession } from "@/lib/tenant-auth/tenantAccessServerGuards";
import { buildRiskShareLangHref, getRiskShareLocale } from "@/lib/risk-share/riskShareI18n";
import SiteProfileShell from "@/app/risk-share/manager/settings/site-profile/SiteProfileShell";
import ShareReviewClient, { type ShareReviewClientItem } from "./ShareReviewClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "공유할 내용 확인 | SafeMetrica",
  robots: {
    index: false,
    follow: false,
  },
};

type PageSearchParams = Record<string, string | string[] | undefined>;

function readSearchParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
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

export default async function RiskShareManagerShareReviewPage({
  searchParams,
}: {
  searchParams?: Promise<PageSearchParams>;
}) {
  const params = (await searchParams) ?? {};
  const rawCompanyCode = readSearchParam(params.company);
  const lang = getRiskShareLocale(readSearchParam(params.lang));

  const shareReviewHref = buildRiskShareLangHref(
    "/risk-share/manager/share-review",
    { company: rawCompanyCode },
    lang,
  );

  const tenantResolution = await resolveActiveRiskSharePublicTenant(rawCompanyCode);

  if (!tenantResolution.ok) {
    return (
      <ErrorShell
        title="공유할 내용 확인 화면을 열 수 없습니다."
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
      redirect(`/login?callbackUrl=${encodeURIComponent(shareReviewHref)}`);
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

  const managerHref = buildRiskShareLangHref(
    "/risk-share/manager",
    { company: selectedTenantCode },
    lang,
  );
  const publishHref = buildRiskShareLangHref(
    "/risk-share/manager/share-review/publish",
    { company: selectedTenantCode },
    lang,
  );
  const listResult = await listRiskShareItemsForManagerReview(selectedTenantCode);

  const clientItems: ShareReviewClientItem[] =
    listResult.status === "ok"
      ? listResult.entries.map((entry) =>
          entry.kind === "valid"
            ? {
                kind: "valid" as const,
                id: entry.item.id,
                siteName: entry.item.siteName,
                sourceTitle: entry.item.sourceTitle,
                taskName: entry.item.taskName,
                hazard: entry.item.hazard,
                riskLevel: entry.item.riskLevel,
                currentControls: entry.item.currentControls,
                improvementPlan: entry.item.improvementPlan,
                workerShareSummary: entry.item.workerShareSummary,
                shareStatus: entry.item.shareStatus,
                workerVisible: entry.item.workerVisible,
                isLocked: entry.item.shareStatus === "locked" || entry.item.versionLockId !== null,
                sourcePage: entry.item.sourcePage,
                sourceRow: entry.item.sourceRow,
                reviewRevision: entry.item.reviewRevision,
              }
            : { kind: "invalid" as const, id: entry.id },
        )
      : [];

  return (
    <SiteProfileShell>
      <div className="content" style={{ padding: "20px 24px 0", overflowX: "hidden" }}>
        <div
          className="card card--pad"
          style={{
            maxWidth: "860px",
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <p style={{ fontWeight: 900 }}>검토가 끝났다면 공유본 게시로 이동하세요.</p>
            <p className="muted" style={{ marginTop: "4px", fontSize: "13px" }}>
              게시할 항목은 다음 화면에서 다시 직접 선택합니다.
            </p>
          </div>
          <a className="btn btn--primary" href={publishHref}>
            공유본 게시 준비
          </a>
        </div>
      </div>
      <ShareReviewClient
        companyCode={selectedTenantCode}
        lang={lang}
        managerHref={managerHref}
        listStatus={listResult.status}
        items={clientItems}
        overflow={listResult.status === "ok" ? listResult.overflow : false}
      />
    </SiteProfileShell>
  );
}
