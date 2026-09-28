import { Section, SectionHeading } from "@/components/ui";
import { ACCENT_TEXT, Icon } from "@/components/ui/icon";
import type { AccentTone, HomeKpi, HomeKpiSection } from "@/domain/portfolio";
export interface KpiMatrixSectionProps {
  section: HomeKpiSection;
}

/**
 * Static hover-accent map.
 *
 * Written out rather than interpolated because Tailwind extracts class names
 * statically: a `group-hover:${...}` template would compile to nothing and the
 * hover state would silently never apply.
 */
const HOVER_ACCENT = {
  primary: "group-hover:text-primary-container",
  secondary: "group-hover:text-secondary",
  tertiary: "group-hover:text-tertiary",
} as const satisfies Record<AccentTone, string>;

/**
 * Executive KPI matrix (DESIGN.md §8.2).
 *
 * Each card is a claim plus its proof: the monumental statistic is the claim and
 * the footer strip is the measurement. Stat scale is a data decision
 * (`scale: "monumental" | "headline"`) so a numeric metric reads at 48px and a
 * qualitative one at 32px — the eye finds the number that matters instead of
 * scanning four equally loud values.
 */
export function KpiMatrixSection({ section }: KpiMatrixSectionProps) {
  return (
    <Section id={section.id} surface="raised">
      <div className="space-y-space-xl">
        <SectionHeading
          id={`${section.id}-heading`}
          kicker={section.kicker}
          title={section.title}
          note={section.note}
        />

        <div className="grid grid-cols-1 gap-space-lg md:grid-cols-2 lg:grid-cols-4">
          {section.items.map((kpi) => (
            <KpiCard key={kpi.id} kpi={kpi} />
          ))}
        </div>
      </div>
    </Section>
  );
}

function KpiCard({ kpi }: { kpi: HomeKpi }) {
  const accent = ACCENT_TEXT[kpi.accent];
  const isMonumental = kpi.scale === "monumental";

  return (
    <article
      className="group flex flex-col justify-between rounded-xl border border-border-subtle bg-surface-raised p-space-lg shadow-lg transition-shadow duration-300 hover:shadow-primary-container/5"
    >
      <div className="space-y-space-md">
        <div className="flex items-center justify-between gap-space-sm">
          <span className="font-label-mono text-label-mono uppercase text-text-muted">
            {kpi.label}
          </span>
          <Icon name={kpi.icon} size={20} className={`shrink-0 ${accent}`} />
        </div>

        <p
          className={`font-extrabold tracking-tight text-text-primary transition-colors duration-300 ${HOVER_ACCENT[kpi.accent]} ${
            isMonumental
              ? "font-metric-stat text-metric-stat-mobile md:text-metric-stat"
              : "font-headline-lg text-headline-lg"
          }`}
        >
          {kpi.value}
        </p>

        <p className="font-body-sm text-body-sm text-text-secondary">{kpi.description}</p>
      </div>

      <div className="mt-space-md flex items-center justify-between gap-space-sm rounded bg-surface-overlay/50 p-space-xs font-label-mono text-label-mono text-text-muted">
        <span className="truncate">{kpi.footnote.label}</span>
        <span className={`shrink-0 text-[10px] font-bold ${accent}`}>{kpi.footnote.value}</span>
      </div>
    </article>
  );
}
