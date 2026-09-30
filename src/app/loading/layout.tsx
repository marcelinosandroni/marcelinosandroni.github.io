import { DocumentShell } from "@/components/layout/document-shell";
import "../rain.css";
import "../globals.css";

/**
 * Root layout for `/loading`.
 *
 * A third root layout, and the reason `DocumentShell` exists. The preview route is
 * outside `app/[locale]` for the same reason `/admin` is: it is not a localized
 * page, and putting it in the locale tree would mean it inherits the public
 * header, footer, analytics and telemetry — a full page of site chrome wrapped
 * around the one screen whose whole job is to show an effect on its own.
 */
export default function LoadingLayout({ children }: { children: React.ReactNode }) {
  return <DocumentShell className="p-0">{children}</DocumentShell>;
}
