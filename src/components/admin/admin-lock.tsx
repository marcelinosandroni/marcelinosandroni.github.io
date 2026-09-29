import Link from "next/link";

import { adminPath } from "@/domain/site/routes";
import { Icon } from "@/components/ui/icon";
import type { Dictionary } from "@/i18n";

export interface AdminLockProps {
  t: Dictionary;
}

/**
 * Owner access affordance.
 *
 * Stealthy on purpose: a lock glyph with no visible label, at the far end of the
 * header rail. It is a real link with a real accessible name, not a hidden
 * control — anyone looking for it finds it, nobody browsing the site is
 * interrupted by it.
 *
 * Deliberately **stateless**. Reading the session here would make every page a
 * dynamic render to show one glyph, so the link points at `/admin`, which is
 * where the session is actually checked and where sign-out lives. The header
 * stays statically generated, which is the entire point of the site.
 */
export function AdminLock({ t }: AdminLockProps) {
  return (
    <Link
      href={adminPath()}
      aria-label={t.admin.accessLabel}
      title={t.admin.accessLabel}
      className="tap-target min-w-11 justify-center text-text-muted opacity-50 transition-opacity hover:opacity-100 focus:opacity-100"
    >
      {/* The local stroke icon, not a lock emoji: an emoji renders in colour
          from the OS font and broke the monochrome instrument-panel language. */}
      <Icon name="shield" size={16} />
    </Link>
  );
}
