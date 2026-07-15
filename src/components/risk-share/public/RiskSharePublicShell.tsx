import type { ReactNode } from "react";

import { RISK_SHARE_PUBLIC_SHELL_ROOT_ID } from "@/lib/risk-share/riskSharePublicTheme";

import "./riskSharePublicShell.css";

export { RISK_SHARE_PUBLIC_SHELL_ROOT_ID };

type RiskSharePublicShellProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Common wrapper for the five public risk-share QR screens. Applies the
 * shared design tokens (riskSharePublicShell.css); light/dark theme is
 * seeded pre-paint by the root layout's single next/script(beforeInteractive)
 * tag (see src/app/layout.tsx and src/lib/risk-share/riskSharePublicTheme.ts)
 * -- Next.js only supports that strategy in the root layout, so no script
 * lives in this component. Theme is applied by direct DOM attribute writes
 * (that root script, and RiskSharePublicThemeToggle) on
 * document.documentElement, never through React state, so there is no
 * server/client render mismatch to hydrate.
 */
export default function RiskSharePublicShell({ children, className }: RiskSharePublicShellProps) {
  return (
    <div
      id={RISK_SHARE_PUBLIC_SHELL_ROOT_ID}
      className={`rsx-pub ${className ?? ""}`}
      suppressHydrationWarning
    >
      {children}
    </div>
  );
}
