import { ChannelLink, StatusPill } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import type { HomeHero } from "@/domain/portfolio";
import { isFeatureEnabled, visibleChannels } from "@/domain/feature-flags/feature-flags";
import type { Dictionary } from "@/i18n";

import { PortraitFrame } from "./portrait-frame";

export interface HomeHeroSectionProps {
  hero: HomeHero;
  t: Dictionary;
}

/**
 * Hero — the only section with a `<h1>`, and the LCP element (DESIGN.md §11).
 *
 * The full name is rendered as a mono kicker *inside* the heading rather than as
 * a separate element: it keeps a single, correctly-outlined `<h1>` while making
 * the name the first thing a recruiter's eye lands on.
 */
export function HomeHeroSection({ hero, t }: HomeHeroSectionProps) {
  return (
    <section
      id="top"
      aria-labelledby="hero-heading"
      /*
       * `overflow-x-clip` contains the decorative backdrops below.
       *
       * They are 24rem and 20rem blurred circles anchored to the viewport
       * edges, so on a 390px phone the left one lands at 25% + 384px and pushed
       * the whole document 92px wider than the screen — a horizontal scrollbar
       * on the most common device width there is.
       *
       * Clipping is the correct tool rather than `overflow-hidden`: it contains
       * the decoration without creating a scroll container, so it cannot break
       * `position: sticky` further down the page.
       */
      className="relative w-full overflow-x-clip bg-surface-base"
    >
      <div className="mx-auto w-full max-w-[1320px] px-margin py-space-2xl md:px-margin-tablet lg:px-margin-desktop lg:py-space-3xl">
        {/* Diffused radial backdrops — atmospheric depth only, never a hard edge. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/4 top-10 -z-10 h-96 w-96 rounded-full bg-primary-container/5 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-10 right-10 -z-10 h-80 w-80 rounded-full bg-secondary/5 blur-3xl"
        />

        <div className="grid grid-cols-1 items-center gap-space-xl lg:grid-cols-12 lg:gap-space-2xl">
          <div className="flex flex-col space-y-space-lg lg:col-span-7">
            <StatusPill label={hero.statusPill} />

            <h1
              id="hero-heading"
              className="font-display-hero text-display-hero-mobile font-extrabold tracking-tight text-text-primary md:text-display-hero"
            >
              <span className="mb-space-sm block font-label-mono text-label-mono uppercase tracking-widest text-secondary md:text-label-mono">
                {hero.name}
              </span>
              {hero.headlineLead}{" "}
              <span className="text-primary-container">{hero.headlineAccent}</span>{" "}
              {hero.headlineTail}
            </h1>

            <p className="font-editorial-quote text-editorial-quote hero-title italic text-text-secondary">
              {hero.role}
            </p>

            <p className="max-w-2xl font-body-lg text-body-lg text-text-secondary">
              {hero.narrative}
            </p>

            <div className="flex flex-wrap items-center gap-space-md pt-space-sm">
              <a href={hero.primaryAction.href} className="button button-primary">
                {hero.primaryAction.icon ? (
                  <Icon name={hero.primaryAction.icon} size={20} />
                ) : null}
                {hero.primaryAction.label}
              </a>
              <a href={hero.secondaryAction.href} className="button button-quiet">
                {hero.secondaryAction.label}
                <Icon name="arrow-down" size={18} />
              </a>
              {/*
                The PDF download used to live here too. It is now only on the
                full resume page (/[locale]/resume), which is where a visitor
                goes when they actually want the document. Two entrances to the
                same 200KB download was a decision the visitor had to make
                before they knew what they were getting.
              */}
            </div>

            <div className="flex flex-wrap items-center gap-x-space-lg gap-y-space-sm pt-space-md font-label-mono text-label-mono text-text-muted">
              <span className="flex items-center gap-space-xs">
                <Icon name="verified" size={16} className="text-secondary" />
                <span className="text-text-secondary">{hero.availability}</span>
              </span>
              <span className="flex flex-wrap items-center gap-space-md">
                {visibleChannels(hero.channels, {
                  enabled: isFeatureEnabled("whatsapp"),
                  icon: "whatsapp",
                }).map((channel) => (
                  <ChannelLink
                    key={channel.id}
                    label={channel.label}
                    value={channel.value}
                    href={channel.href}
                    icon={channel.icon}
                    external={channel.external}
                    opensInNewTabLabel={t.a11y.opensInNewTab}
                  />
                ))}
              </span>
            </div>
          </div>

          <div className="flex justify-center lg:col-span-5">
            <PortraitFrame portrait={hero.portrait} />
          </div>
        </div>
      </div>
    </section>
  );
}
