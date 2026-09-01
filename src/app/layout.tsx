import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Marcelino Sandroni Dias | Engenheiro de Software Sênior",
  description: "Currículo vivo de Marcelino Sandroni Dias, Engenheiro de Software Sênior Full Stack.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
