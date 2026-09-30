import type { Metadata } from "next";

import { DocumentShell } from "@/components/layout/document-shell";
import "../rain.css";
import "../globals.css";

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
 * reversed a decision made on purpose. `DocumentShell` is where that decision is
 * now written down once, for this layout and the `/loading` preview alike.
 */
export const metadata: Metadata = {
  title: "Owner",
  // Belt and braces alongside the page's own metadata: this is a private surface
  // and should never be indexed even if the page metadata is ever changed.
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <DocumentShell>{children}</DocumentShell>;
}
