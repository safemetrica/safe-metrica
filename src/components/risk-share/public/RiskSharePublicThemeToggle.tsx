"use client";

import { RISK_SHARE_PUBLIC_SHELL_ROOT_ID } from "./RiskSharePublicShell";
import { persistRiskSharePublicTheme, readRiskSharePublicTheme } from "@/lib/risk-share/riskSharePublicTheme";

type RiskSharePublicThemeToggleProps = {
  label: string;
  className?: string;
};

/**
 * Flips the shell's data-theme attribute directly on the DOM (mirroring the
 * root layout's pre-paint init script, see riskSharePublicTheme.ts) instead
 * of React state, so the sun/moon icon swap stays purely CSS-driven and
 * there is nothing to hydrate. Theme is never sent to the server or stored
 * on any submission.
 */
export default function RiskSharePublicThemeToggle({ label, className }: RiskSharePublicThemeToggleProps) {
  function handleClick() {
    try {
      const root = document.getElementById(RISK_SHARE_PUBLIC_SHELL_ROOT_ID);
      if (!root) return;

      const next = readRiskSharePublicTheme() === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      persistRiskSharePublicTheme(next);
    } catch {
      // Theme preference is best-effort only.
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      className={`rsx-pub-theme-toggle rsx-pub-chip flex items-center justify-center rounded-full ${className ?? ""}`}
    >
      <svg
        className="rsx-pub-theme-toggle__sun h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
      <svg
        className="rsx-pub-theme-toggle__moon h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
      </svg>
    </button>
  );
}
