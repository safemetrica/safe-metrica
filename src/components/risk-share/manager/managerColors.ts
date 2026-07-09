/**
 * Exact hex tokens ported from docs/design/risk-share-ui-reference-2026-07-09/CSS_TOKENS.md
 * (light-mode --c1..--c5 / semantic tokens). Kept centralized so every card/badge/chart
 * uses the same designer palette instead of approximate default Tailwind colors.
 */

export type AccentKey = "info" | "success" | "warning" | "purple" | "danger" | "neutral";

export const ACCENT_HEX: Record<AccentKey, { fg: string; bg: string }> = {
  info: { fg: "#2f6bff", bg: "#eaf1ff" }, // --c1 / --info
  success: { fg: "#14a56c", bg: "#e4f7ee" }, // --c2 / --success
  warning: { fg: "#e8892b", bg: "#fcefe0" }, // --c3 / --warning
  purple: { fg: "#7c5cff", bg: "#f3f0ff" }, // --c4
  danger: { fg: "#e2453c", bg: "#fdeae9" }, // --c5 / --danger
  neutral: { fg: "#5a6579", bg: "#eef2f8" }, // --text-2 / --surface-2
};

export const BORDER_STRONG = "#d5dbe6";
export const SURFACE = "#ffffff";
export const SURFACE_2 = "#f8fafc";
export const BORDER = "#e6eaf1";
export const TEXT = "#1a2233";
export const TEXT_2 = "#5a6579";
export const TEXT_3 = "#7e899c";
export const BG = "#f4f6fb";
