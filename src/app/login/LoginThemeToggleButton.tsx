"use client";

import { useLoginTheme } from "./LoginThemeProvider";

export default function LoginThemeToggleButton() {
  const { theme, toggleTheme } = useLoginTheme();

  return (
    <button
      type="button"
      className="iconbtn theme-toggle login-theme"
      aria-label="테마 전환"
      aria-pressed={theme === "dark"}
      onClick={toggleTheme}
    >
      <iconify-icon icon="lucide:sun" className="sun"></iconify-icon>
      <iconify-icon icon="lucide:moon" className="moon"></iconify-icon>
    </button>
  );
}
