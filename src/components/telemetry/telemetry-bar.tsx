"use client";

import { useEffect, useState } from "react";

import type { BuildInfo } from "@/domain/site/build-info";

export interface TelemetryLabels {
  label: string;
  ttfb: string;
  domContentLoaded: string;
  loadComplete: string;
  unavailable: string;
  /** Tooltip for the build readout, naming what the number identifies. */
  buildTitle: string;
}

export interface TelemetryBarProps {
  labels: TelemetryLabels;
  /**
   * Which build this is, resolved on the server.
   *
   * Passed in rather than imported, and that is not a style preference: this is a
   * client component, and importing `site-info` here would pull `package.json` and
   * the process environment into the browser bundle to render three words the
   * server already knew.
   */
  build: BuildInfo;
}

type Measurement = { label: string; value: string };

const formatMs = (value: number): string =>
  Number.isFinite(value) && value >= 0 ? `${Math.round(value)} ms` : "";

/**
 * Fixed bar reporting the timings of *this* page load.
 *
 * Every figure comes from the Navigation Timing API, which means every figure is
 * something the visitor's own browser measured. Nothing here is simulated, and
 * nothing claims a number the site has no way to know.
 *
 * There is deliberately no uptime figure. A site with no monitoring has no
 * honest uptime number, and inventing one on a portfolio is the kind of claim
 * that fails the first time an interviewer asks how it is measured.
 *
 * The bar also deliberately makes **no request of its own**. An earlier version
 * measured a server round-trip against a dedicated endpoint, which bought one
 * self-referential number at the cost of an extra request on every page view —
 * a bad trade for a portfolio whose pitch is performance, and it kept the
 * network busy enough to make the e2e suite flaky. The three timings below are
 * free: the browser already collected them to render the page.
 *
 * Renders nothing until the metrics exist, so the bar never flashes placeholder
 * numbers, and stays hidden entirely when the browser exposes no timing data.
 */
export function TelemetryBar({ labels, build }: TelemetryBarProps) {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);

  useEffect(() => {
    if (typeof performance === "undefined" || typeof performance.getEntriesByType !== "function") {
      return;
    }

    // Read after the next frame rather than synchronously in the effect body:
    // the values are only meaningful once the page has painted, and it avoids a
    // cascading render on every navigation.
    const frame = requestAnimationFrame(() => {
      const [navigation] = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];

      if (!navigation) {
        return;
      }

      setMeasurements([
        { label: labels.ttfb, value: formatMs(navigation.responseStart - navigation.requestStart) },
        { label: labels.domContentLoaded, value: formatMs(navigation.domContentLoadedEventEnd - navigation.startTime) },
        { label: labels.loadComplete, value: formatMs(navigation.loadEventEnd - navigation.startTime) },
      ]);
    });

    return () => cancelAnimationFrame(frame);
  }, [labels]);

  if (measurements.length === 0) {
    return null;
  }

  return (
    <aside
      aria-label={labels.label}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border-subtle bg-surface-base/92 backdrop-blur-md"
    >
      <div className="mx-auto flex w-full max-w-[1320px] flex-wrap items-center gap-x-space-lg gap-y-1 px-margin py-2 md:px-margin-tablet lg:px-margin-desktop">
        {measurements.map((measurement) => (
          <span key={measurement.label} className="inline-flex items-baseline gap-2">
            <span className="font-label-mono text-label-mono uppercase tracking-widest text-text-muted">
              {measurement.label}
            </span>
            <span className="font-mono text-label-mono text-text-primary">
              {measurement.value || labels.unavailable}
            </span>
          </span>
        ))}

        {/*
          Right-aligned, and on its own line on a phone.

          `ml-auto` rather than `justify-between` on the container: the three
          measurements wrap on a narrow viewport, and `justify-between` would leave
          the build alone at the *start* of the last line. `ml-auto` pushes it to the
          end of whichever line it lands on, which is the right one in both layouts
          without a media query.

          Deliberately not a link. The footer's version number links to the release
          that produced it, which is a claim a reader can check; a build stamp is a
          diagnostic, and linking it somewhere would mean constructing a Vercel
          dashboard URL out of a team slug and a project name — two more pieces of
          configuration that can be wrong. The deployment id rides along in the
          tooltip, which is what a bug report needs and costs no width.
        */}
        <span
          className="ml-auto whitespace-nowrap font-label-mono text-label-mono uppercase tracking-widest text-text-muted"
          title={buildTooltip(build, labels.buildTitle)}
          data-testid="build-readout"
          data-environment={build.environment}
          data-stamp={build.stamp ?? ""}
        >
          {buildLabel(build)}
        </span>
      </div>
    </aside>
  );
}

/**
 * The environment, but only when it is not production.
 *
 * A reader on the real site gains nothing from being told it is production — that
 * is what every other reader is on, and the word is noise on every load. It is the
 * one value here that is *less* useful the more it is repeated, so it appears only
 * where it changes what a reader should assume: a preview or a local build.
 */
/**
 * Exported for the one test that needs the production branch.
 *
 * A local e2e run cannot produce a `production` build — `VERCEL_ENV` is not settable
 * per test — so without an export the rule "production prints one word less" would be
 * the one behaviour of this component with no coverage at all. A private function with
 * no test is how that happens.
 */
export function buildLabel(build: BuildInfo): string {
  // Explicitly `string[]`: the first element is a bare template literal, and letting
  // TypeScript infer from it narrows the array to the template types of two elements,
  // which the later pushes do not satisfy.
  const parts: string[] = build.environment === "production" ? [] : [build.environment];

  parts.push(`v${build.release}`);

  if (build.stamp !== null) {
    parts.push(`· ${build.stamp}`);
  }

  return parts.join(" ");
}

/**
 * The tooltip, and the only place the deployment id surfaces.
 *
 * Omitted entirely when there is none, rather than rendering `title=""` — an empty
 * tooltip is a hover target that promises something and gives nothing.
 */
/**
 * Exported for the same reason as `buildLabel`: the "no deployment id means no
 * tooltip suffix" branch is only reachable off Vercel.
 */
export function buildTooltip(build: BuildInfo, caption: string): string | undefined {
  const parts = [caption];

  if (build.deploymentId !== null) {
    parts.push(build.deploymentId);
  }

  return parts.join(" · ");
}
