"use client";

import { useState } from "react";

import type { Locale } from "@/domain/i18n";
import {
  DEFAULT_RESUME_TEMPLATE,
  type ResumeTemplateId,
} from "@/infrastructure/pdf/resume-template-registry";

export interface PdfButtonMessages {
  download: string;
  generating: string;
  failed: string;
  unknownError: string;
  chooseTemplate: string;
}

export interface PdfTemplateOption {
  id: ResumeTemplateId;
  label: string;
  description: string;
}

interface DownloadPDFButtonProps {
  locale: Locale;
  messages: PdfButtonMessages;
  templates: ReadonlyArray<PdfTemplateOption>;
  /**
   * The stack profile the page is currently showing, or `null` for the generic
   * résumé.
   *
   * Travels into the request so the PDF matches the page the reader is looking
   * at. Without it, a reader who narrows to React + Node and then downloads gets
   * the full document — a different document from the one they chose, produced by
   * the same button directly beneath it.
   *
   * A PDF route that does not support focus ignores it, which is the safe
   * direction for this arriving before its consumer.
   */
  stack?: string | null;
}

/**
 * The only interactive island on the page.
 *
 * Every string and every template description arrives already translated as
 * props from the parent Server Component, so this Client Component carries no
 * dictionary and no locale data of its own.
 */
export function DownloadPDFButton({
  locale,
  messages,
  templates,
  stack = null,
}: DownloadPDFButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleDownload = async (templateId: ResumeTemplateId = DEFAULT_RESUME_TEMPLATE) => {
    setIsLoading(true);
    setError(null);
    setIsMenuOpen(false);

    try {
      /*
        Built with URLSearchParams rather than string concatenation, because the
        stack slug comes from a URL parameter and only two characters of escaping
        would be needed to let one into the query.
      */
      const query = new URLSearchParams({ template: templateId });

      if (stack !== null && stack !== "") {
        query.set("stack", stack);
      }

      const response = await fetch(`/api/resume/${locale}/pdf?${query.toString()}`);
      if (!response.ok) {
        throw new Error(messages.failed);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download =
        `resume-marcelino-sandroni-${locale}-${templateId}` +
        (stack === null || stack === "" ? "" : `-${stack}`) +
        ".pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : messages.unknownError);
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
            data-click="download-pdf"
            aria-busy={isLoading}
            type="button"
          >
            {isLoading ? messages.generating : messages.download}
          </button>
          <button
            onClick={() => setIsMenuOpen((open) => !open)}
            disabled={isLoading}
            className="button button-quiet download-toggle"
            data-click="download-pdf-template-menu"
            aria-expanded={isMenuOpen}
            aria-haspopup="menu"
            aria-label={messages.chooseTemplate}
            type="button"
          >
            <span aria-hidden="true">⌄</span>
          </button>
        </div>
        {isMenuOpen && (
          <div className="download-options" role="menu">
            {templates.map((template) => (
              <button
                key={template.id}
                className="download-option"
                onClick={() => handleDownload(template.id)}
                role="menuitem"
                type="button"
              >
                <strong>{template.label}</strong>
                <small>{template.description}</small>
              </button>
            ))}
          </div>
        )}
      </div>
      {error && (
        <small role="alert" style={{ color: "#d9534f" }}>
          {error}
        </small>
      )}
    </>
  );
}
