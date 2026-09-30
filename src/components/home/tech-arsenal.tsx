import { Chip } from "@/components/ui";
import { SectionShell } from "@/components/home/section-shell";
import { ACCENT_TEXT, Icon } from "@/components/ui/icon";
import type { HomeStackSection } from "@/domain/portfolio";

export interface TechArsenalSectionProps {
  section: HomeStackSection;
}

/**
 * Technical arsenal (DESIGN.md §8.4).
 *
 * Four high-contrast category matrices. The chips are taxonomy labels rendered
 * as `<span>`, not links: nothing here is clickable, and presenting a
 * non-interactive label as a control is the most common way a dense grid starts
 * lying to the reader.
 *
 * Accent alternates by column so a wall of chips still has a scannable rhythm.
 */
export function TechArsenalSection({ section }: TechArsenalSectionProps) {
  return (
    <SectionShell id={section.id} artwork={{ section: "arsenal", placement: "corner-top-right" }}>
      <div className="space-y-space-xl">
        <div className="max-w-2xl space-y-space-xs">
          <span className="font-label-mono text-label-mono uppercase tracking-widest text-primary-container">
            {section.kicker}
          </span>
          <h2
            id={`${section.id}-heading`}
            className="font-headline-lg text-headline-lg text-text-primary"
          >
            {section.title}
          </h2>
          <p className="font-body-md text-body-md text-text-secondary">{section.note}</p>
        </div>

        <div className="grid grid-cols-1 gap-space-lg md:grid-cols-2">
          {section.clusters.map((cluster) => (
            <article
              key={cluster.id}
              className="space-y-space-md rounded-xl bg-surface-raised p-space-xl shadow-md transition-colors duration-300 hover:bg-surface-raised/80"
            >
              <div className="flex items-center gap-space-sm">
                <Icon
                  name={cluster.icon}
                  size={22}
                  className={`shrink-0 ${ACCENT_TEXT[cluster.accent]}`}
                />
                <h3 className="font-headline-sm text-headline-sm text-text-primary">
                  {cluster.title}
                </h3>
              </div>

              <p className="font-body-sm text-body-sm text-text-secondary">
                {cluster.description}
              </p>

              <div className="flex flex-wrap gap-2 pt-space-xs">
                {cluster.items.map((item) => (
                  <Chip key={item} label={item} tone={cluster.accent} />
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}
