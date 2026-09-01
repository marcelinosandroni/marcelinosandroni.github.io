"use client";

import { useState } from "react";

interface DownloadPDFButtonProps {
  locale: "pt-BR" | "en-US";
  label?: string;
}

export function DownloadPDFButton({ locale, label = "Baixar PDF" }: DownloadPDFButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/resume/${locale}/pdf`);
      if (!response.ok) {
        throw new Error("Failed to download PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `resume-marcelino-sandroni-${locale}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleDownload}
        disabled={isLoading}
        className="button button-quiet"
        aria-busy={isLoading}
      >
        {isLoading ? "Gerando..." : label} <span>↓</span>
      </button>
      {error && <small style={{ color: "var(--color-error)" }}>{error}</small>}
    </>
  );
}
