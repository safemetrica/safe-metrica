"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import {
  RISK_SHARE_LANGUAGE_OPTIONS,
  RISK_SHARE_LANGUAGES_SOON,
  buildRiskShareLangHref,
  type RiskShareLocale,
} from "@/lib/risk-share/riskShareI18n";

type FieldLangSwitcherProps = {
  companyCode: string;
  activeLocale: RiskShareLocale;
};

/**
 * Language switching is a required, load-bearing feature on this public QR
 * entry screen (unlike the decorative theme-toggle), so unlike the manager/
 * monthly dropdowns it needs a real open/close implementation — written
 * from scratch here, not copied from the designer's app.js.
 */
export default function FieldLangSwitcher({ companyCode, activeLocale }: FieldLangSwitcherProps) {
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
    <div className={isOpen ? "dd open" : "dd"} ref={containerRef}>
      <button
        type="button"
        className="field__lang dd__btn"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <iconify-icon icon="lucide:globe"></iconify-icon> <span>{activeLabel}</span>{" "}
        <iconify-icon icon="lucide:chevron-down" style={{ fontSize: "14px" }}></iconify-icon>
      </button>
      <div className="dd__menu" role="listbox" style={{ minWidth: "170px" }}>
        {RISK_SHARE_LANGUAGE_OPTIONS.map((language) => (
          <Link
            key={language.code}
            href={buildRiskShareLangHref("/risk-share/field", { company: companyCode }, language.code)}
            role="option"
            aria-selected={language.code === activeLocale}
            className={language.code === activeLocale ? "dd__item is-current" : "dd__item"}
            onClick={() => setIsOpen(false)}
          >
            {language.label}
            {language.code === activeLocale ? (
              <iconify-icon className="dd__check" icon="lucide:check"></iconify-icon>
            ) : null}
          </Link>
        ))}
        {RISK_SHARE_LANGUAGES_SOON.map((language) => (
          <span
            key={language}
            className="dd__item"
            aria-disabled="true"
            style={{ opacity: 0.45, pointerEvents: "none" }}
          >
            {language}
          </span>
        ))}
      </div>
    </div>
  );
}
