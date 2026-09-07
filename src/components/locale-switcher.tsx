"use client";

import type { Locale } from "@/domain/resume/types";

interface LocaleSwitcherProps {
  currentLocale: Locale;
  onLocaleChange: (locale: Locale) => void;
}

export function LocaleSwitcher({ currentLocale, onLocaleChange }: LocaleSwitcherProps) {
  const targetLocale: Locale = currentLocale === "pt-BR" ? "en-US" : "pt-BR";
  const targetLabel = currentLocale === "pt-BR" ? "EN" : "PT";
  const targetAriaLabel =
    currentLocale === "pt-BR"
      ? "Alternar idioma para Inglês"
      : "Switch language to Portuguese";

  return (
    <button
      type="button"
      onClick={() => onLocaleChange(targetLocale)}
      className="language"
      aria-label={targetAriaLabel}
      style={{ cursor: "pointer", background: "transparent" }}
    >
      {targetLabel} <span>↗</span>
    </button>
  );
}
