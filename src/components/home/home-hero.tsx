import { ChannelLink, StatusPill } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import type { HomeHero } from "@/domain/portfolio";
import { getClaim } from "@/domain/portfolio/claims";
import { isFeatureEnabled, visibleChannels } from "@/domain/feature-flags/feature-flags";
import type { Locale } from "@/domain/i18n";
import type { Dictionary } from "@/i18n";

import { PortraitFrame } from "./portrait-frame";

export interface HomeHeroSectionProps {
  hero: HomeHero;
  t: Dictionary;
  locale: Locale;
}

/**
 * Hero — the only section with a `<h1>`, and the LCP element (DESIGN.md §11).
 *
 * The full name is rendered as a mono kicker *inside* the heading rather than as
 * a separate element: it keeps a single, correctly-outlined `<h1>` while making
 * the name the first thing a reader's eye lands on.
 *
 * ## Why the proof band sits between the role and the narrative
 *
 * Because those three lines are the only part of the page a hiring manager is
 * guaranteed to read. Everything below the fold is opt-in; this is not. The role
 * line says what he is, the proof says what he has done, and only then does the
 * narrative ask for the attention that a paragraph of prose has to earn.
 *
 * The figures resolve from the claims module at render time, so what the hero
 * promises and what the document of record says are the same numbers.
 */
export function HomeHeroSection({ hero, t, locale }: HomeHeroSectionProps) {
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

            {/*
              The proof band. Three claims, each with the scope that makes it
              defensible, resolved from the claims module so the hero cannot quote
              a figure the resume and the PDF contradict.
            */}
            <ul
              className="grid grid-cols-1 gap-x-space-lg gap-y-space-md border-y border-border-subtle py-space-md sm:grid-cols-3"
              aria-label={t.hero.proofLabel}
            >
              {hero.proof.map((item) => {
                const claim = getClaim(item.id, locale);

                return (
                  <li key={item.id} className="flex flex-col gap-space-xs">
                    <span className="font-display-lg text-display-lg font-extrabold leading-none text-primary-container">
                      {claim.display}
                    </span>
                    <span className="font-label-mono text-label-mono uppercase tracking-wider text-text-muted">
                      {item.label}
                    </span>
                    <span className="text-body-sm text-body-sm text-text-secondary">
                      {claim.scope}
                    </span>
                  </li>
                );
              })}
            </ul>

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
