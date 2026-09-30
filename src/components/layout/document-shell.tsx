import { JetBrains_Mono, Manrope, Playfair_Display } from "next/font/google";

import { ThemeBootstrapScript } from "@/components/theme/theme-script";
import { DEFAULT_LOCALE } from "@/domain/i18n";
import { DEFAULT_THEME_ID, themeColorFor } from "@/domain/theme/theme";

/*
 * Three families, one job each. Loaded through `next/font`, so the files are
 * self-hosted at build time: no request to Google at runtime, no FOUT, and a
 * size-adjusted fallback that keeps the metric bars stable enough that swapping
 * the webfont causes no layout shift.
 *
 * Declared here rather than in the locale layout because the site has more than
 * one root layout, and `next/font` is a build-time transform scoped to the module
 * it is called in. Two layouts calling it separately produced two identical
 * bundles and a third file explaining why that was acceptable. It was not.
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
 * `<html>` and `<body>` for a root layout.
 *
 * The site has three: `app/[locale]` for the public pages, `app/admin` for the
 * owner area and `app/loading` for the rain preview. Next.js allows a root layout
 * under a dynamic segment and allows several of them as long as there is no
 * `app/layout.tsx`, so the two non-localized ones each need their own document —
 * and they should not each be a near-copy of the third.
 *
 * Analytics and the telemetry bar are not in here, and that is deliberate rather
 * than an oversight: they are page views, and the owner area and the preview route
 * are not part of the public signal.
 */
export function DocumentShell({
  children,
  className = "pb-10",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <html
      lang={DEFAULT_LOCALE}
      data-scroll-behavior="smooth"
      className={`${manrope.variable} ${jetBrainsMono.variable} ${playfairDisplay.variable}`}
    >
      <body className={className}>
        {/*
          Same reasoning as the locale layout, which discovered it the hard way:
          an explicit `<head>` here broke hydration intermittently, because the
          PDF download button stopped being interactive on roughly half of runs
          and the failure surfaced as "element not found" rather than a parse
          error. React 19 hoists `<script>` and `<meta>` out of `<body>` on its
          own, which keeps the theme bootstrap early without owning the element.
        */}
        <ThemeBootstrapScript />
        <meta name="theme-color" content={themeColorFor(DEFAULT_THEME_ID)} />
        {children}
      </body>
    </html>
  );
}
