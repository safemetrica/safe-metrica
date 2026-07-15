import type { ReactNode } from "react";
import Script from "next/script";

import "./riskSharePublicShell.css";

export const RISK_SHARE_PUBLIC_SHELL_ROOT_ID = "rsx-pub-root";
const THEME_STORAGE_KEY = "sm-risk-share-public-theme";

const THEME_INIT_SCRIPT = `(function(){try{var k=${JSON.stringify(
  THEME_STORAGE_KEY,
)};var s=localStorage.getItem(k);var t=(s==="light"||s==="dark")?s:((window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches)?"dark":"light");var r=document.getElementById(${JSON.stringify(
  RISK_SHARE_PUBLIC_SHELL_ROOT_ID,
)});if(r)r.setAttribute("data-theme",t);}catch(e){}})();`;

type RiskSharePublicShellProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Common wrapper for the five public risk-share QR screens. Applies the
 * shared design tokens (riskSharePublicShell.css) and seeds light/dark theme
 * from localStorage / prefers-color-scheme via an inline script that runs
 * before paint -- theme is applied by direct DOM attribute writes (this
 * script, and RiskSharePublicThemeToggle), never through React state, so
 * there is no server/client render mismatch to hydrate. Uses next/script's
 * `beforeInteractive` strategy (rather than a raw <script> in the React
 * tree) since App Router logs a console error for any bare <script> a
 * component renders -- `beforeInteractive` is the supported way to still run
 * code before hydration. The script looks up its target by a fixed element
 * id (RISK_SHARE_PUBLIC_SHELL_ROOT_ID) rather than DOM position, because
 * Next re-creates and executes beforeInteractive scripts from document.head,
 * detached from wherever they were declared in the tree.
 */
export default function RiskSharePublicShell({ children, className }: RiskSharePublicShellProps) {
  return (
    <div
      id={RISK_SHARE_PUBLIC_SHELL_ROOT_ID}
      className={`rsx-pub ${className ?? ""}`}
      suppressHydrationWarning
    >
      {/* eslint-disable-next-line @next/next/no-before-interactive-script-outside-document -- App Router only; see this component's doc comment above. */}
      <Script
        id="rsx-pub-theme-init"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
      />
      {children}
    </div>
  );
}
