"use client";

import { useState } from "react";
import {
  DEFAULT_RESUME_TEMPLATE,
  RESUME_TEMPLATES,
  type ResumeTemplateId,
} from "@/infrastructure/pdf/resume-template-registry";

interface DownloadPDFButtonProps {
  locale: "pt-BR" | "en-US";
  label?: string;
}

export function DownloadPDFButton({ locale, label }: DownloadPDFButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const defaultLabel = label ?? (locale === "en-US" ? "Download PDF" : "Baixar PDF");
  const loadingLabel = locale === "en-US" ? "Generating..." : "Gerando...";

  const handleDownload = async (templateId: ResumeTemplateId = DEFAULT_RESUME_TEMPLATE) => {
    setIsLoading(true);
    setError(null);
    setIsMenuOpen(false);

    try {
      const response = await fetch(`/api/resume/${locale}/pdf?template=${templateId}`);
      if (!response.ok) {
        throw new Error(locale === "en-US" ? "Failed to download PDF" : "Falha ao baixar PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `resume-marcelino-sandroni-${locale}-${templateId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="download-menu">
        <div className="download-action">
          <button
            onClick={() => handleDownload()}
            disabled={isLoading}
            className="button button-quiet download-main"
            aria-busy={isLoading}
            type="button"
          >
            {isLoading ? loadingLabel : defaultLabel}
          </button>
          <button
            onClick={() => setIsMenuOpen((open) => !open)}
            disabled={isLoading}
            className="button button-quiet download-toggle"
            aria-expanded={isMenuOpen}
            aria-haspopup="menu"
            aria-label={locale === "en-US" ? "Choose PDF template" : "Escolher modelo de PDF"}
            type="button"
          >
            <span aria-hidden="true">⌄</span>
          </button>
        </div>
        {isMenuOpen && (
          <div className="download-options" role="menu">
            {RESUME_TEMPLATES.map((template) => (
              <button
                key={template.id}
                className="download-option"
                onClick={() => handleDownload(template.id)}
                role="menuitem"
                type="button"
              >
                <strong>{template.label[locale]}</strong>
                <small>{template.description[locale]}</small>
              </button>
            ))}
          </div>
        )}
      </div>
      {error && <small style={{ color: "#d9534f" }}>{error}</small>}
    </>
  );
}
