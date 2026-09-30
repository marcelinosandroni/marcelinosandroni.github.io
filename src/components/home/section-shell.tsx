import { SectionArtwork } from "@/components/artwork/section-artwork";
import { Section } from "@/components/ui";
import {
  DEFAULT_SECTION_ARTWORK,
  hasSectionArtwork,
  resolveSectionArtwork,
  type SectionArtworkDescriptor,
} from "@/domain/artwork/section-artwork";

/*
   The layer's own stylesheet, imported here and not from the island.

   That placement is load-bearing rather than cosmetic. `SectionShell` is not
   rendered by any route yet, so its whole module graph — this island and this
   stylesheet — is outside the build's entry graph and contributes **zero bytes**
   to every route. The moment a section adopts the shell, the rules arrive with
   it; until then the artwork layer costs nothing at all, which is the promise
   `DEFAULT_SECTION_ARTWORK` being empty is making.
*/
import "../../app/artwork.css";

export interface SectionShellProps {
  /** The section's anchor id, which is also its artwork slot id. */
  id: string;
  surface?: "base" | "raised" | "overlay";
  /**
   * Configuration for this section's art. `undefined` asks the shipped registry;
   * `null` asks for none, which is what a section that should never carry art
   * passes.
   */
  artwork?: SectionArtworkDescriptor | null;
  /** Translated attribution template. Only used when a licensed still is set. */
  artworkCredit?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * A home section that can carry artwork.
 *
 * ## Why this is optional
 *
 * Every existing home section renders `Section` directly and keeps doing so. This
 * is a wrapper, not a migration: adopting it is one line per section, and a
 * section that never adopts it is indistinguishable from one that has no artwork
 * configured. That is the property that makes the "costs nothing when unused"
 * claim true rather than aspirational — there is no state in which the shell is
 * present and the cost has been paid for nothing.
 *
 * ## The three jobs it does that `Section` alone cannot
 *
 *  1. **It establishes the positioning context.** `Section` renders a `<section>`
 *     with no `position`, because nothing in the site needed one. The artwork
 *     layer is absolutely positioned against its own section, so the shell adds
 *     `relative` here rather than relying on a parent further up the tree.
 *  2. **It stacks the layer below the content.** The layer is `z-index: 0` and
 *     the children go in a `relative z-10` wrapper. Without the wrapper the
 *     section's own text would paint into the layer's stacking context and the
 *     layer would sit on top of the copy it exists to sit beside.
 *  3. **It resolves the artwork from configuration, not from markup.** The shell
 *     is handed a section id and an optional descriptor; every refusal — a
 *     section that may not carry art, no descriptor, an unknown placement — is
 *     decided in `@/domain/artwork/section-artwork` and arrives here already
 *     resolved. This component contains no policy, which is why the policy is
 *     testable without a browser.
 *
 * ## Why the credit template is a prop and not an import
 *
 * The island is a client component, and a client component cannot pull the
 * message catalog into the browser bundle without dragging `next/root-params`
 * and every catalog behind it. So the server resolves the translated template and
 * hands it down, exactly as `home-view.tsx` does for `StatusPill` and the boot
 * diagnostics. With no image configured the string is never rendered.
 */
export function SectionShell({
  id,
  surface = "base",
  artwork,
  artworkCredit = "",
  children,
  className = "",
}: SectionShellProps) {
  const resolved = resolveSectionArtwork(
    id,
    artwork === undefined ? DEFAULT_SECTION_ARTWORK : artwork === null ? [] : [artwork],
  );
  const drawable = hasSectionArtwork(resolved);

  return (
    <Section id={id} surface={surface} className={`relative ${className}`}>
      {drawable ? (
        <SectionArtwork artwork={resolved} creditTemplate={artworkCredit} />
      ) : null}

      <div className="relative z-10">{children}</div>
    </Section>
  );
}