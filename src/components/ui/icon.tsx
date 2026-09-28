import type { AccentTone, IconName } from "@/domain/portfolio";

/**
 * Local icon set.
 *
 * The reference prototype pulled Material Symbols from a Google Fonts CDN. That
 * costs a third-party request, a render-blocking stylesheet, a FOUT and a layout
 * shift on every page — for glyphs that are decorative. These are hand-authored
 * 24px stroke paths instead: same visual language, zero network, tree-shaken to
 * only the icons the content actually references.
 *
 * All paths share one viewBox and are drawn with round caps/joins at 1.75 stroke,
 * which is what gives the reference its instrument-panel feel.
 */
const PATHS: Readonly<Record<IconName, string>> = {
  account: "M3 20h18M4 10h16M6.5 10v8M10.5 10v8M13.5 10v8M17.5 10v8M12 3l9 5.5H3z",
  bolt: "M13 2.5 4.5 14H10l-1 7.5L18 10h-5.5z",
  brush: "M14.5 3.5 20.5 9.5 11 19a5 5 0 0 1-7-7zM8 16l-4 4M4 20h5",
  cpu: "M9 3v2.5M15 3v2.5M9 18.5V21M15 18.5V21M3 9h2.5M3 15h2.5M18.5 9H21M18.5 15H21M6 6h12v12H6zM10 10h4v4h-4z",
  devices: "M3.5 5h12v9h-12zM2 18.5h15M17 10.5h3.5V19H17z",
  server: "M4 4h16v6H4zM4 14h16v6H4zM7.5 7h.01M7.5 17h.01",
  cloud: "M7.5 18.5a4.25 4.25 0 0 1 .6-8.46 6 6 0 0 1 11.3 1.36A3.75 3.75 0 0 1 18.5 18.5z",
  brain: "M9.5 4.5A3 3 0 0 0 6.6 7a3 3 0 0 0-1.1 5.6v3a3 3 0 0 0 4 2.8zM14.5 4.5A3 3 0 0 1 17.4 7a3 3 0 0 1 1.1 5.6v3a3 3 0 0 1-4 2.8zM12 4.5v15",
  calendar: "M5 5.5h14a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1zM4 10.5h16M8 3v4M16 3v4",
  location: "M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  mail: "M3 6.5h18v11H3zM3.5 7.5 12 13.5l8.5-6",
  verified: "M12 2.5 14.2 5l3.3-.4.9 3.2 2.8 1.8-1.4 3 1.4 3-2.8 1.8-.9 3.2-3.3-.4L12 21.5 9.8 19l-3.3.4-.9-3.2L2.8 14.4l1.4-3-1.4-3 2.8-1.8.9-3.2L9.8 5zM9 12l2.2 2.2L15.5 10",
  external: "M14 4h6v6M20 4l-8.5 8.5M18 14.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4.5",
  terminal: "M5 5h14v14H5zM8.5 10l2.5 2.5L8.5 15M13 15h3.5",
  document: "M6 3h7.5L18 7.5V21H6zM13.5 3v4.5H18M9 12.5h6M9 16.5h6",
  shield: "M12 3l7.5 3v6c0 4.5-3.2 7.7-7.5 9.2C7.7 19.7 4.5 16.5 4.5 12V6zM9 12l2.2 2.2L15.5 10",
  code: "M9 7 4 12l5 5M15 7l5 5-5 5",
  "arrow-down": "M12 4.5v15M6.5 14 12 19.5 17.5 14",
  "arrow-right": "M4.5 12h15M14 6.5 19.5 12 14 17.5",
  "arrow-back": "M19.5 12h-15M10 6.5 4.5 12 10 17.5",
  download: "M12 3.5v11.5M7.5 11 12 15.5 16.5 11M4 20h16",
};

export interface IconProps {
  name: IconName;
  /** Pixel size for both axes. Icons are square by design. */
  size?: number;
  className?: string;
  /**
   * Accessible name. When omitted the icon is treated as decorative and hidden
   * from assistive technology, which is correct for the majority of usages here.
   */
  title?: string;
}

/**
 * Inline SVG icon. Server Component safe: no hooks, no state, no client bundle.
 */
export function Icon({ name, size = 20, className, title }: IconProps) {
  const d = PATHS[name];

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      <path d={d} />
    </svg>
  );
}

/** Accent tone to Tailwind text-colour utility, per DESIGN.md §3.2. */
export const ACCENT_TEXT: Readonly<Record<AccentTone, string>> = {
  primary: "text-primary-container",
  secondary: "text-secondary",
  tertiary: "text-tertiary",
};

/** Accent tone to chip/badge treatment, per DESIGN.md §8.4. */
export const ACCENT_CHIP: Readonly<Record<AccentTone, string>> = {
  primary: "bg-primary-container/8 text-primary-container border-primary-container/40",
  secondary: "bg-secondary/8 text-secondary border-secondary/40",
  tertiary: "bg-tertiary/8 text-tertiary border-tertiary/40",
};

/** Accent tone to the status-dot colour used by pills. */
export const ACCENT_DOT: Readonly<Record<AccentTone, string>> = {
  primary: "bg-primary-container",
  secondary: "bg-secondary",
  tertiary: "bg-tertiary",
};
