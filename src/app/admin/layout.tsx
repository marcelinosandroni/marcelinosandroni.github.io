import type { Metadata } from "next";
import { JetBrains_Mono, Manrope, Playfair_Display } from "next/font/google";

import { ThemeBootstrapScript } from "@/components/theme/theme-script";
import { DEFAULT_LOCALE } from "@/domain/i18n";
import { DEFAULT_THEME_ID, themeColorFor } from "@/domain/theme/theme";
import "../transitions.css";
import "../globals.css";

/*
 * The same three families as the public layout, with the same CSS variable names.
 * They are declared again rather than imported because a root layout is the top of
 * its own tree, and a shared module would have to be a fourth file to hold three
 * identical calls. Same variable names means `globals.css` styles the admin area
 * with no extra wiring.
 */
const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--msd-font-manrope",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--msd-font-jetbrains",
});

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600"],
  style: ["normal", "italic"],
  variable: "--msd-font-playfair",
});

/**
 * The root layout for `/admin`.
 *
 * ## Why this file has to exist
 *
 * `app/[locale]/layout.tsx` is the root layout for the public site — Next.js
 * allows a root layout under a dynamic segment, and that is how this project does
 * i18n, with no `app/layout.tsx` at all. But that layout is a sibling of `admin`,
 * not an ancestor of it, so `/admin` had no root layout of its own and rendered
 * with no `<html>` or `<body>` of its own.
 *
 * The server happened to answer 200, which is what made this survive so long. The
 * error only appeared once the page hydrated in a browser:
 *
 *     Runtime Error: Missing <html> and <body> tags in the root layout
 *
 * So it looked like a sign-in bug — the page the owner uses to sign in is exactly
 * where a broken layout is least expected and most alarming. Nothing about the
 * owner session was wrong.
 *
 * ## What is deliberately absent
 *
 * `<Analytics />` and `<TelemetryBar />` are not here, and that is the point of a
 * separate root. The locale layout documents why: owner traffic is not part of the
 * public signal. Adding them here would have been a one-line copy that quietly
 * reversed a decision made on purpose.
 *
 * The language is fixed to the default locale rather than negotiated, because the
 * admin surface is locale-independent by design — its tests assert a stable path —
 * and because there is no `[locale]` segment here to negotiate from.
 */
export const metadata: Metadata = {
  title: "Owner",
  // Belt and braces alongside the page's own metadata: this is a private surface
  // and should never be indexed even if the page metadata is ever changed.
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang={DEFAULT_LOCALE}
      data-scroll-behavior="smooth"
      className={`${manrope.variable} ${jetBrainsMono.variable} ${playfairDisplay.variable}`}
    >
      <body className="pb-10">
        {/*
          Same reasoning as the locale layout: no explicit `<head>`. React 19
          hoists `<script>` and `<meta>` out of `<body>` on its own, and an
          explicit head here broke hydration intermittently.
        */}
        <ThemeBootstrapScript />
        <meta name="theme-color" content={themeColorFor(DEFAULT_THEME_ID)} />
        {children}
      </body>
    </html>
  );
}
