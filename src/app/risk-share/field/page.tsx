import Link from "next/link";
import {
  buildRiskShareLangHref,
  getRiskShareCopy,
  getRiskShareLocale,
  type RiskShareLocale,
} from "@/lib/risk-share/riskShareI18n";
import { resolveActiveRiskSharePublicTenant } from "@/lib/risk-share/riskSharePublicTenantGuard";
import FieldLangSwitcher from "./FieldLangSwitcher";
import FieldThemeToggle from "./FieldThemeToggle";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const FIELD_THEME_STORAGE_KEY = "sm-risk-share-public-theme";

/**
 * Seeds this page's nearest .rsx-shell with the same theme preference the
 * #889 shared .rsx-pub shell reads/writes (sm-risk-share-public-theme), so a
 * choice made on one public QR screen is respected here too, before paint --
 * mirrors RiskSharePublicShell's inline init script, scoped to this page's
 * own script tag via document.currentScript instead of a shared root id.
 */
const FIELD_THEME_INIT_SCRIPT = `(function(){try{var k=${JSON.stringify(
  FIELD_THEME_STORAGE_KEY,
)};var s=localStorage.getItem(k);var t=(s==="light"||s==="dark")?s:((window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches)?"dark":"light");var r=document.currentScript&&document.currentScript.closest(".rsx-shell");if(r)r.setAttribute("data-theme",t);}catch(e){}})();`;

type PageProps = {
  searchParams?: Promise<{
    company?: string;
    lang?: string;
  }>;
};

function normalizeCompanyCode(value?: string | null) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 64);
}

function buildHref(path: string, companyCode: string, lang: RiskShareLocale) {
  return buildRiskShareLangHref(path, { company: companyCode }, lang);
}

function getCurrentMonthKst() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.getUTCMonth() + 1;
}

function NoticeShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rsx-shell">
      <div className="field-body">
        <div className="field">
          <div className="field__top">
            <div className="field__bar">
              <div className="field__brand">
                <img src="/risk-share-assets/logo_darkmode.png" alt="SafeMetrica" />
              </div>
            </div>
            <h1 className="field__title">{title}</h1>
          </div>
          <div className="field__body">
            <div className="field__note">
              <iconify-icon icon="lucide:info"></iconify-icon>
              <span>{children}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Designer field.html's step trail merges "공유" + "확인·지금 단계" into a
 * single active step; kept locally (not in riskShareI18n.ts — this was
 * already a page-local constant, not a shared i18n key) so the 4-segment
 * Trail semantics survive as 3 dot-steps matching the designer structure.
 */
const FIELD_TRAIL_STEPS: Record<RiskShareLocale, [string, string][]> = {
  ko: [
    ["공유확인", "지금 단계"],
    ["관리자", "검토"],
    ["월간 안전", "운영 요약"],
  ],
  en: [
    ["Confirm", "you are here"],
    ["Manager", "review"],
    ["Monthly safety", "summary"],
  ],
  vi: [
    ["Xác nhận", "bước hiện tại"],
    ["Quản lý", "xem xét"],
    ["Hồ sơ an toàn", "hằng tháng"],
  ],
};

export default async function RiskSharePublicFieldEntryPage({
  searchParams,
}: PageProps) {
  const params = (await searchParams) ?? {};
  const companyCode = normalizeCompanyCode(params.company);
  const locale = getRiskShareLocale(params.lang);
  const copy = getRiskShareCopy(locale).field;
  const common = getRiskShareCopy(locale).common;
  const tenantResolution = await resolveActiveRiskSharePublicTenant(params.company ?? "");
  const companyLabel = (tenantResolution.ok ? tenantResolution.tenant.name : "") || companyCode || "현장";

  if (!companyCode) {
    return <NoticeShell title={copy.qrCheckingTitle}>{copy.noCodeBody}</NoticeShell>;
  }

  if (!tenantResolution.ok) {
    return <NoticeShell title={copy.qrCheckingTitle}>{copy.notRegisteredBody}</NoticeShell>;
  }

  const currentMonth = getCurrentMonthKst();
  const trailSteps = FIELD_TRAIL_STEPS[locale] ?? FIELD_TRAIL_STEPS.ko;

  const activities = [
    {
      kind: "share",
      icon: "lucide:share-2",
      iconClass: "i-blue",
      badgeClass: "b-blue",
      title: copy.shareTitle,
      badge: copy.shareBadge,
      description: copy.shareDescription,
      followUp: copy.shareFollowUp,
      href: `${buildHref("/risk-share/participation", companyCode, locale)}&mode=monthly`,
      cta: copy.shareCta,
    },
    {
      kind: "prework",
      icon: "lucide:clipboard-check",
      iconClass: "i-green",
      badgeClass: "b-green",
      title: copy.preworkTitle,
      badge: copy.preworkBadge,
      description: copy.preworkDescription,
      followUp: copy.preworkFollowUp,
      href: `${buildHref("/risk-share/participation", companyCode, locale)}&mode=prework`,
      cta: copy.preworkCta,
    },
    {
      kind: "anonymous",
      icon: "lucide:message-circle-question",
      iconClass: "i-orange",
      badgeClass: "b-orange",
      title: copy.anonTitle,
      badge: copy.anonBadge,
      description: copy.anonDescription,
      followUp: copy.anonFollowUp,
      href: buildHref("/risk-share/anonymous", companyCode, locale),
      cta: copy.anonCta,
    },
  ];

  return (
    <div className="rsx-shell" suppressHydrationWarning>
      <script dangerouslySetInnerHTML={{ __html: FIELD_THEME_INIT_SCRIPT }} />
      <div className="field-body">
        <div className="field">
          <div className="field__top">
            <div className="field__bar">
              <div className="field__brand">
                <img src="/risk-share-assets/logo_darkmode.png" alt="SafeMetrica" />
              </div>
              <div className="field__tools">
                <FieldLangSwitcher companyCode={companyCode} activeLocale={locale} />
                <FieldThemeToggle label={common.themeToggleLabel} />
              </div>
            </div>
            <div className="field__company">{companyLabel}</div>
            <h1 className="field__title">{copy.heroTitle}</h1>
            <p className="field__sub">{copy.heroSub}</p>
            <div className="field__chip">
              <span className="live"></span> {copy.periodLabel(currentMonth)}
            </div>
          </div>

          <div className="field__body">
            <div className="field__steps">
              {trailSteps.map((step, index) => (
                <div className={index === 0 ? "fstep active" : "fstep"} key={step.join("-")}>
                  <div className="fstep__dot">{index + 1}</div>
                  <div className="fstep__t">
                    {step[0]}
                    <br />
                    {step[1]}
                  </div>
                  {index < trailSteps.length - 1 ? <div className="fstep__line"></div> : null}
                </div>
              ))}
            </div>

            {activities.map((activity) => (
              <Link key={activity.kind} href={activity.href} className="qcard">
                <div className="qcard__row">
                  <div className={`qcard__ic ${activity.iconClass}`}>
                    <iconify-icon icon={activity.icon}></iconify-icon>
                  </div>
                  <div className="qcard__main">
                    <b>{activity.title}</b>
                    <p>{activity.description}</p>
                    <p style={{ color: "var(--text-3)", fontSize: "13px", marginTop: "1px" }}>
                      {activity.followUp}
                    </p>
                  </div>
                </div>
                <div className="qcard__foot">
                  <span className={`badge ${activity.badgeClass}`}>{activity.badge}</span>
                  <span className="qcard__cta">
                    {activity.cta} <iconify-icon icon="lucide:arrow-right"></iconify-icon>
                  </span>
                </div>
              </Link>
            ))}

            <div className="field__note">
              <iconify-icon icon="lucide:info"></iconify-icon>
              <span>
                <b>{copy.recordNoteLabel}</b> · {copy.recordNoteBody}
              </span>
            </div>

            <p style={{ textAlign: "center", fontSize: "14px", color: "var(--text-3)" }}>
              {copy.helpline}
            </p>
          </div>

          <div className="field__foot">{copy.fieldWorkerDisclaimer}</div>
        </div>
      </div>
    </div>
  );
}
