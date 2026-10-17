"use client";

import { useState } from "react";

import type { Locale } from "@/domain/i18n";

export interface PdfButtonMessages {
  download: string;
  generating: string;
  failed: string;
  unknownError: string;
}

interface DownloadPDFButtonProps {
  locale: Locale;
  messages: PdfButtonMessages;
  /**
   * The stack profile the page is currently showing, or `null` for the general
   * résumé.
   *
   * Travels into the request so the PDF matches the page the reader is looking
   * at. Without it, a reader who narrows to Angular + Java and then downloads gets
   * the full document — a different document from the one they chose, produced by
   * the same button directly beneath it.
   *
   * A PDF route that does not support a stack ignores it, which is the safe
   * direction for this arriving before its consumer.
   */
  stack?: string | null;
}

/**
 * The download button.
 *
 * ## One button, because that is how many documents there are
 *
 * It used to carry a menu offering a template per download — a compact one and a
 * detailed one. That menu is gone, for two reasons that arrived separately.
 *
 * The stack is already chosen, on the same page, by
 * `StackProfileSelector` — and that choice is a URL, so it can be bookmarked and
 * sent to somebody. A second control that also picked something about the document
 * meant two controls for one decision, and the one that was not a link could not
 * be shared.
 *
 * And the template it was choosing between no longer existed on the served path.
 * The download renders a document that was built and committed in this repository;
 * there is no template to choose, so both menu entries fetched the same PDF and the
 * reader was offered a distinction that did not exist. A menu whose options are the
 * same file is worse than no menu.
 *
 * The route refuses a template that is not the default rather than ignoring it, so
 * a link from before this change fails loudly instead of quietly returning a
 * different document than the one it names.
 */
export function DownloadPDFButton({
  locale,
  messages,
  stack = null,
}: DownloadPDFButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setIsLoading(true);
    setError(null);

    try {
      /*
        Built with URLSearchParams rather than string concatenation, because the
        stack slug comes from a URL parameter and only two characters of escaping
        would be needed to let one into the query.
      */
      const query = new URLSearchParams();

      if (stack !== null && stack !== "") {
        query.set("stack", stack);
      }

      const suffix = query.toString();

      const response = await fetch(
        `/api/resume/${locale}/pdf${suffix === "" ? "" : `?${suffix}`}`,
      );

      if (!response.ok) {
        throw new Error(messages.failed);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download =
        `resume-marcelino-sandroni-${locale}` +
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
      </div>
      {error && (
        <small role="alert" style={{ color: "#d9534f" }}>
          {error}
        </small>
      )}
    </>
  );
}