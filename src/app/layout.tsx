import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Marcelino Sandroni Dias | Senior Software Engineer",
  description:
    "Currículo vivo e interativo de Marcelino Sandroni Dias. Engenheiro de Software Sênior Full Stack especializado em sistemas distribuídos, arquitetura escalável e finanças corporativas.",
  keywords: [
    "Marcelino Sandroni Dias",
    "Engenheiro de Software",
    "Senior Software Engineer",
    "Full Stack",
    "TypeScript",
    "Node.js",
    "Next.js",
    "React",
    ".NET",
    "C#",
    "Java",
    "Spring Boot",
    "Python",
    "Go",
    "Kubernetes",
    "Docker",
    "Cloud",
    "Microservices",
    "DDD",
  ],
  authors: [{ name: "Marcelino Sandroni Dias", url: "https://marcelinosandroni.github.io" }],
  creator: "Marcelino Sandroni Dias",
  openGraph: {
    type: "profile",
    locale: "pt_BR",
    alternateLocale: ["en_US"],
    title: "Marcelino Sandroni Dias | Senior Software Engineer",
    description:
      "Currículo vivo de Marcelino Sandroni Dias, Engenheiro de Software Sênior Full Stack.",
    url: "https://marcelinosandroni.github.io",
    siteName: "Marcelino Sandroni Dias - Resume",
  },
  twitter: {
    card: "summary",
    title: "Marcelino Sandroni Dias | Senior Software Engineer",
    description:
      "Currículo vivo de Marcelino Sandroni Dias, Engenheiro de Software Sênior Full Stack.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Marcelino Sandroni Dias",
    jobTitle: "Senior Software Engineer",
    description:
      "Senior Full Stack Software Engineer combining cutting-edge engineering with 15 years of experience in business and accounting.",
    url: "https://marcelinosandroni.github.io",
    sameAs: ["https://linkedin.com/in/marcelinosandroni"],
    knowsAbout: [
      "Software Engineering",
      "Distributed Systems",
      "Cloud Computing",
      "DDD",
      "CQRS",
      "TypeScript",
      "C#",
      ".NET",
      "Java",
      "Go",
      "Python",
      "React",
      "Next.js",
    ],
    address: {
      "@type": "PostalAddress",
      addressLocality: "Fortaleza",
      addressRegion: "CE",
      addressCountry: "BR",
    },
  };

  return (
    <html lang="pt-BR">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
