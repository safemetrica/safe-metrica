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

/**
 * All in-use header variants (brand/monthly/prework/anonymous) render as a
 * solid color gradient with white text, so the field entry's light-on-dark
 * logo mark reads correctly on every one of them. "minimal" is the only
 * variant with a theme-dependent (light/dark) surface and currently has no
 * callers; it keeps the plain text wordmark instead of the light logo image.
 */
const LOGO_SRC = "/risk-share-assets/logo_darkmode.png";

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
 * Shared top section for the five public risk-share QR screens, restructured
 * to follow the approved /risk-share/field entry's header hierarchy: brand
 * row (logo + language/theme controls), then company, title, description,
 * and status/badge in that order. Only body content below this header
 * differs per screen (form fields, checklist, entry cards, ...).
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
  return (
    <div
      className={`rsx-pub-hero rsx-pub-hero--${variant} ${VARIANT_CLASS[variant]} p-5 sm:p-6 ${className ?? ""}`}
    >
      <div className="rsx-pub-hero__bar flex items-center justify-between gap-2">
        {variant === "minimal" ? (
          <span className="text-[0.68rem] font-black tracking-tight opacity-80">SafeMetrica</span>
        ) : (
          <img src={LOGO_SRC} alt="SafeMetrica" className="rsx-pub-hero__logo h-6 w-auto" />
        )}
        <div className="flex shrink-0 items-center gap-2">
          <RiskShareLanguageControl
            pathname={pathname}
            query={query}
            activeLocale={activeLocale}
            label={languageLabel}
            soonBadgeLabel={languageSoonBadgeLabel}
          />
          <RiskSharePublicThemeToggle label={themeToggleLabel} />
        </div>
      </div>

      <p className="rsx-pub-hero__company rsx-pub-title-lb mt-3 text-sm font-semibold opacity-90">
        {companyLabel}
      </p>

      <h1 className="rsx-pub-hero__title rsx-pub-title-lb mt-1 text-2xl font-black leading-tight tracking-tight">
        {title}
      </h1>
      {description ? (
        <p className="rsx-pub-hero__description mt-2 text-sm font-semibold leading-6 opacity-90">{description}</p>
      ) : null}
      {badge ? <div className="rsx-pub-hero__badge mt-3">{badge}</div> : null}
    </div>
  );
}
