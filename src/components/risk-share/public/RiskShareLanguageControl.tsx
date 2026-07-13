"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import {
  RISK_SHARE_LANGUAGE_OPTIONS,
  RISK_SHARE_LANGUAGES_SOON,
  buildRiskShareLangHref,
  type RiskShareLocale,
} from "@/lib/risk-share/riskShareI18n";

type RiskShareLanguageControlProps = {
  pathname: string;
  query: Record<string, string | undefined>;
  activeLocale: RiskShareLocale;
  label: string;
  soonBadgeLabel: string;
  className?: string;
};

/**
 * Shared language switcher for all five public risk-share QR screens.
 * Always exposes exactly the three supported locales (ko/en/vi) as real
 * links that preserve pathname/query (company, mode, ...), and lists
 * not-yet-translated languages as visibly disabled entries -- never as
 * clickable items -- so every screen uses one consistent language contract.
 */
export default function RiskShareLanguageControl({
  pathname,
  query,
  activeLocale,
  label,
  soonBadgeLabel,
  className,
}: RiskShareLanguageControlProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeLabel =
    RISK_SHARE_LANGUAGE_OPTIONS.find((language) => language.code === activeLocale)?.label ?? "한국어";

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className={`relative inline-block ${className ?? ""}`} ref={containerRef}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={label}
        onClick={() => setIsOpen((open) => !open)}
        className="rsx-pub-chip flex min-h-11 items-center gap-1.5 rounded-full px-3 text-[0.7rem] font-black"
      >
        <svg
          className="h-3.5 w-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20Z" />
        </svg>
        <span>{activeLabel}</span>
        <svg
          className="h-3.5 w-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {isOpen ? (
        <div
          role="listbox"
          aria-label={label}
          className="rsx-pub-lang__menu absolute right-0 z-20 mt-2 min-w-[170px] rounded-2xl p-1.5"
        >
          {RISK_SHARE_LANGUAGE_OPTIONS.map((language) => (
            <Link
              key={language.code}
              href={buildRiskShareLangHref(pathname, query, language.code)}
              role="option"
              aria-selected={language.code === activeLocale}
              className="rsx-pub-lang__item flex items-center justify-between gap-2 rounded-xl px-3 text-sm font-bold"
              onClick={() => setIsOpen(false)}
            >
              {language.label}
              {language.code === activeLocale ? (
                <svg
                  className="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m5 12 5 5 9-9" />
                </svg>
              ) : null}
            </Link>
          ))}
          {RISK_SHARE_LANGUAGES_SOON.map((language) => (
            <span
              key={language}
              aria-disabled="true"
              className="rsx-pub-lang__item rsx-pub-subtle flex items-center justify-between gap-2 rounded-xl px-3 text-sm font-bold"
            >
              {language}
              <span className="rsx-pub-chip rounded-full px-1.5 py-0.5 text-[0.55rem] font-black uppercase tracking-wide">
                {soonBadgeLabel}
              </span>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
