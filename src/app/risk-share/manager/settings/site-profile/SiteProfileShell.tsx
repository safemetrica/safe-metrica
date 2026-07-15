"use client";

import type { ReactNode } from "react";

import { useDashboardShellInteractions } from "@/components/risk-share/manager/useDashboardShellInteractions";

export default function SiteProfileShell({ children }: { children: ReactNode }) {
  const { theme, toggleTheme } = useDashboardShellInteractions();

  return (
    <main className="rsx-shell" data-theme={theme}>
      <div className="app app--plain">
        <div className="main">
          <header className="header">
            <div className="header__spacer" />
            <button
              className="iconbtn theme-toggle"
              type="button"
              aria-label="테마 전환"
              onClick={toggleTheme}
            >
              <iconify-icon icon="lucide:sun" className="sun"></iconify-icon>
              <iconify-icon icon="lucide:moon" className="moon"></iconify-icon>
            </button>
          </header>
          {children}
        </div>
      </div>
    </main>
  );
}
