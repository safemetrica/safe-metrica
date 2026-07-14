import type { ReactNode } from "react";

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
 * there is no server/client render mismatch to hydrate.
 */
export default function RiskSharePublicShell({ children, className }: RiskSharePublicShellProps) {
  return (
    <div
      id={RISK_SHARE_PUBLIC_SHELL_ROOT_ID}
      className={`rsx-pub ${className ?? ""}`}
      suppressHydrationWarning
    >
      <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      {children}
    </div>
  );
}
