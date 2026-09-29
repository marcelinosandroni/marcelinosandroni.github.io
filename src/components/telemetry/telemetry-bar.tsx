"use client";

import { useEffect, useState } from "react";

export interface TelemetryLabels {
  label: string;
  ttfb: string;
  domContentLoaded: string;
  loadComplete: string;
  unavailable: string;
}

export interface TelemetryBarProps {
  labels: TelemetryLabels;
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
export function TelemetryBar({ labels }: TelemetryBarProps) {
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
      </div>
    </aside>
  );
}
