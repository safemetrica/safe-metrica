"use client";

import { useCallback, useEffect, useState } from "react";

type Theme = "light" | "dark";

const MOBILE_DRAWER_BREAKPOINT_PX = 900;

/**
 * Restores the designer reference's assets/js/app.js shell interactions
 * (sidebar mobile drawer / desktop mini-collapse, dropdown open/close,
 * theme toggle) as plain React state, so /risk-share/manager and
 * /risk-share/monthly both drive the exact same designer.css selectors
 * the original script did (.sidebar.open, .overlay.show, .dd.open,
 * .rsx-shell.sb-mini, .rsx-shell[data-theme]) without an imperative DOM
 * script. No class names or CSS were changed to make this work.
 *
 * Theme is seeded from prefers-color-scheme only, matching the
 * LoginThemeProvider precedent already in this codebase (see
 * src/app/login/LoginThemeProvider.tsx) — there is no app-wide theme
 * persistence layer to reuse, so this keeps that same already-reviewed
 * scope rather than introducing a new localStorage key.
 */
export function useDashboardShellInteractions() {
  const [theme, setTheme] = useState<Theme>("light");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarMini, setIsSidebarMini] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
    }
  }, []);

  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);

  const handleSidebarToggleClick = useCallback(() => {
    if (window.innerWidth <= MOBILE_DRAWER_BREAKPOINT_PX) {
      setIsSidebarOpen((open) => !open);
    } else {
      setIsSidebarMini((mini) => !mini);
    }
  }, []);

  const toggleDropdown = useCallback((id: string) => {
    setOpenDropdownId((current) => (current === id ? null : id));
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }, []);

  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      const target = event.target as Element | null;
      if (!target?.closest(".dd")) {
        setOpenDropdownId(null);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenDropdownId(null);
        setIsSidebarOpen(false);
      }
    }

    document.addEventListener("click", handleDocumentClick);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("click", handleDocumentClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return {
    theme,
    toggleTheme,
    isSidebarOpen,
    isSidebarMini,
    handleSidebarToggleClick,
    closeSidebar,
    openDropdownId,
    toggleDropdown,
  };
}
