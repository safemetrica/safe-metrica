import type { ReactNode } from "react";

import type { RiskShareLocale } from "@/lib/risk-share/riskShareI18n";
import RiskShareLanguageControl from "./RiskShareLanguageControl";
import RiskSharePublicThemeToggle from "./RiskSharePublicThemeToggle";

export type RiskSharePublicHeaderVariant = "brand" | "monthly" | "prework" | "anonymous" | "minimal";

const VARIANT_CLASS: Record<RiskSharePublicHeaderVariant, string> = {
  brand: "bg-gradient-to-br from-[#083A6B] via-[#0B5EA8] to-[#19B7A4] text-white",
  monthly: "bg-gradient-to-br from-blue-600 to-blue-500 text-white",
  prework: "bg-gradient-to-br from-emerald-600 to-emerald-500 text-white",
  anonymous: "bg-gradient-to-br from-orange-600 to-amber-500 text-white",
  minimal: "rsx-pub-card border-b text-[color:var(--pub-text)]",
};

const VARIANT_MARK_CLASS: Record<RiskSharePublicHeaderVariant, string> = {
  brand: "bg-white text-[#0B5EA8]",
  monthly: "bg-white text-blue-600",
  prework: "bg-white text-emerald-600",
  anonymous: "bg-white text-orange-600",
  minimal: "bg-[#0B2742] text-white",
};

type RiskSharePublicHeaderProps = {
  variant: RiskSharePublicHeaderVariant;
  companyLabel: string;
  pathname: string;
  query: Record<string, string | undefined>;
  activeLocale: RiskShareLocale;
  languageLabel: string;
  languageSoonBadgeLabel: string;
  themeToggleLabel: string;
  title: ReactNode;
  description?: ReactNode;
  badge?: ReactNode;
  className?: string;
};

/**
 * Shared top section for the five public risk-share QR screens: SafeMetrica
 * mark + company badge, language control, theme toggle, and a title/
 * description slot. Only body content below this header differs per screen
 * (form fields, checklist, entry cards, ...).
 */
export default function RiskSharePublicHeader({
  variant,
  companyLabel,
  pathname,
  query,
  activeLocale,
  languageLabel,
  languageSoonBadgeLabel,
  themeToggleLabel,
  title,
  description,
  badge,
  className,
}: RiskSharePublicHeaderProps) {
  const companyMark = companyLabel.trim().charAt(0) || "현";

  return (
    <div
      className={`rsx-pub-hero rsx-pub-hero--${variant} ${VARIANT_CLASS[variant]} p-5 sm:p-6 ${className ?? ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="rsx-pub-chip rsx-pub-title-lb inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.68rem] font-black tracking-tight">
          <span
            className={`grid h-4 w-4 shrink-0 place-items-center rounded-full text-[0.6rem] font-black ${VARIANT_MARK_CLASS[variant]}`}
          >
            {companyMark}
          </span>
          {companyLabel}
        </span>
        <span className="text-[0.68rem] font-black tracking-tight opacity-80">SafeMetrica</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <RiskShareLanguageControl
          pathname={pathname}
          query={query}
          activeLocale={activeLocale}
          label={languageLabel}
          soonBadgeLabel={languageSoonBadgeLabel}
        />
        <RiskSharePublicThemeToggle label={themeToggleLabel} />
      </div>

      {badge ? <div className="mt-3">{badge}</div> : null}

      <h1 className="rsx-pub-hero__title rsx-pub-title-lb mt-3 text-2xl font-black leading-tight tracking-tight">
        {title}
      </h1>
      {description ? (
        <p className="rsx-pub-hero__description mt-2 text-sm font-semibold leading-6 opacity-90">{description}</p>
      ) : null}
    </div>
  );
}
