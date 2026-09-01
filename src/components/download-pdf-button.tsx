"use client";

import { useState } from "react";

interface DownloadPDFButtonProps {
  locale: "pt-BR" | "en-US";
  label?: string;
}

export function DownloadPDFButton({ locale, label }: DownloadPDFButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultLabel = label ?? (locale === "en-US" ? "Download PDF" : "Baixar PDF");
  const loadingLabel = locale === "en-US" ? "Generating..." : "Gerando...";

  const handleDownload = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/resume/${locale}/pdf`);
      if (!response.ok) {
        throw new Error(locale === "en-US" ? "Failed to download PDF" : "Falha ao baixar PDF");
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
      setError(err instanceof Error ? err.message : "Erro desconhecido");
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
        type="button"
      >
        {isLoading ? loadingLabel : defaultLabel} <span>↓</span>
      </button>
      {error && <small style={{ color: "#d9534f" }}>{error}</small>}
    </>
  );
}
