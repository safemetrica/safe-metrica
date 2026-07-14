import type { ReactNode } from "react";

type RiskShareStatusBannerVariant = "success" | "error" | "warning";

type RiskShareStatusBannerProps = {
  variant: RiskShareStatusBannerVariant;
  children: ReactNode;
  className?: string;
};

/**
 * Shared success/error/warning banner for the five public risk-share QR
 * screens, so status colors, radius, and placement stay identical across
 * routes. Content is always caller-supplied locale copy -- this component
 * never hardcodes a language.
 */
export default function RiskShareStatusBanner({ variant, children, className }: RiskShareStatusBannerProps) {
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={`rsx-pub-banner rsx-pub-banner--${variant} p-4 text-sm font-bold leading-6 ${className ?? ""}`}
    >
      {children}
    </div>
  );
}
