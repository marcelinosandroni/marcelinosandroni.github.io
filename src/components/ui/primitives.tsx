import { ACCENT_CHIP, ACCENT_TEXT, Icon } from "@/components/ui/icon";
import type { AccentTone, IconName } from "@/domain/portfolio";

/* ---------------------------------------------------------------------------
 * StatusPill — DESIGN.md §8.8
 * The one place `rounded-full` is legitimate: a live state indicator.
 * ------------------------------------------------------------------------- */

export interface StatusPillProps {
  label: string;
  tone?: AccentTone;
  /** Pulsing is reserved for genuinely live states, never decoration. */
  pulse?: boolean;
}

export function StatusPill({ label, tone = "primary", pulse = true }: StatusPillProps) {
  const dotTone =
    tone === "primary"
      ? "bg-primary-container"
      : tone === "secondary"
        ? "bg-secondary"
        : "bg-tertiary";

  return (
    <span className="inline-flex items-center gap-space-xs self-start rounded-full bg-surface-overlay px-space-sm py-1 shadow-sm">
      <span className={`h-2 w-2 rounded-full ${dotTone} ${pulse ? "msd-pulse" : ""}`} />
      <span
        className={`font-label-mono text-label-mono uppercase tracking-widest ${ACCENT_TEXT[tone]}`}
      >
        {label}
      </span>
    </span>
  );
}

/* ---------------------------------------------------------------------------
 * SectionHeading — DESIGN.md §8.7
 * Every section opens with the same three-part header so the page scans as one
 * system rather than a stack of independently designed blocks.
 * ------------------------------------------------------------------------- */

export interface SectionHeadingProps {
  kicker: string;
  title: string;
  note?: string;
  /** Heading level, so the page outline stays correct at every depth. */
  level?: 2 | 3;
  id?: string;
}

export function SectionHeading({ kicker, title, note, level = 2, id }: SectionHeadingProps) {
  const Heading = level === 2 ? "h2" : "h3";

  return (
    <div className="flex flex-col gap-space-md md:flex-row md:items-end md:justify-between">
      <div>
        <span className="font-label-mono text-label-mono uppercase tracking-widest text-primary-container">
          {kicker}
        </span>
        <Heading id={id} className="mt-space-xs font-headline-lg text-headline-lg text-text-primary">
          {title}
        </Heading>
      </div>
      {note ? (
        <p className="max-w-md font-body-sm text-body-sm text-text-muted">{note}</p>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Chip — DESIGN.md §8.4
 * A taxonomy label, never a button. If it needs to navigate, use a link.
 * ------------------------------------------------------------------------- */

export interface ChipProps {
  label: string;
  tone?: AccentTone;
  size?: "sm" | "md";
}

export function Chip({ label, tone = "tertiary", size = "md" }: ChipProps) {
  const toneClasses = ACCENT_CHIP[tone];

  return (
    <span
      className={`inline-flex items-center rounded border font-label-mono text-label-mono uppercase ${toneClasses} ${
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1"
      }`}
    >
      {label}
    </span>
  );
}

/* ---------------------------------------------------------------------------
 * ChannelLink — the shared treatment for every external/contact link.
 * ------------------------------------------------------------------------- */

export interface ChannelLinkProps {
  label: string;
  value: string;
  href: string;
  icon: IconName;
  external: boolean;
  /** Screen-reader hint, translated. */
  opensInNewTabLabel: string;
  className?: string;
}

export function ChannelLink({
  label,
  value,
  href,
  icon,
  external,
  opensInNewTabLabel,
  className = "",
}: ChannelLinkProps) {
  return (
    <a
      href={href}
      className={`group flex items-center gap-space-sm transition-colors ${ACCENT_TEXT.tertiary} hover:text-primary-container ${className}`}
      {...(external ? { target: "_blank", rel: "noreferrer noopener" } : {})}
      title={value}
    >
      <Icon name={icon} size={16} />
      <span className="font-label-mono text-label-mono font-bold">{label}</span>
      {external ? <span className="sr-only">{opensInNewTabLabel}</span> : null}
    </a>
  );
}

/* ---------------------------------------------------------------------------
 * Section shell — one wrapper so every band on the page shares the container,
 * the gutters and the vertical rhythm.
 * ------------------------------------------------------------------------- */

export interface SectionProps {
  id: string;
  /** `base` is the page canvas; `raised`/`overlay` create the tier rhythm. */
  surface?: "base" | "raised" | "overlay";
  children: React.ReactNode;
  className?: string;
}

const SURFACE_CLASSES = {
  base: "bg-surface-base",
  raised: "bg-surface-raised/40",
  overlay: "bg-surface-raised/60",
} as const;

export function Section({ id, surface = "base", children, className = "" }: SectionProps) {
  return (
    <section
      id={id}
      className={`w-full ${SURFACE_CLASSES[surface]} ${className}`}
      aria-labelledby={`${id}-heading`}
    >
      <div className="mx-auto w-full max-w-[1320px] px-margin py-space-2xl md:px-margin-tablet lg:px-margin-desktop lg:py-space-3xl">
        {children}
      </div>
    </section>
  );
}
