import { DocumentShell } from "@/components/layout/document-shell";
import "../../rain.css";
import "../../globals.css";

/**
 * Root layout for `/eastereggs`.
 *
 * A third localized-surface root layout, and the reason `DocumentShell` earns
 * its keep again. `/eastereggs` sits *inside* `[locale]` — the eggs are
 * localized — but it must not inherit the public header and footer: the header
 * would scroll away over the top of a full-viewport effect, and the footer
 * carries a theme picker, which is exactly the control the page is demonstrating.
 *
 * Keeping it in the locale tree and giving it its own shell is the reason it can
 * be translated without becoming a fourth root layout with no locale at all.
 */
export default function EasterEggsLayout({ children }: { children: React.ReactNode }) {
  return <DocumentShell className="p-0">{children}</DocumentShell>;
}
