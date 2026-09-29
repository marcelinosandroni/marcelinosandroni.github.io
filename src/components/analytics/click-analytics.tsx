"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { TRACKABLE_ELEMENTS, type ClickAggregates } from "@/domain/analytics";

export interface ClickAnalyticsLabels {
  panelLabel: string;
  open: string;
  close: string;
  title: string;
  subtitle: string;
  empty: string;
  total: string;
  unknownElement: string;
}

export interface ClickAnalyticsProps {
  labels: ClickAnalyticsLabels;
}

/**
 * Anonymous click aggregate, rendered as a canvas overlay.
 *
 * The split that makes this privacy-defensible: the **browser** records only an
 * element id from a fixed allowlist and sends that, while the **page itself**
 * measures where each element is on screen at draw time to paint the overlay.
 *
 * Those rectangles never leave the visitor's device — they are not sent, not
 * stored and not aggregated anywhere. Only the counters travel, so the data at
 * rest is a list of integers and re-identification is impossible rather than
 * merely discouraged.
 *
 * Recording is delegated from a capture-phase listener, so a control does not
 * have to know it is being tracked.
 */
export function ClickAnalytics({ labels }: ClickAnalyticsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [aggregates, setAggregates] = useState<ClickAggregates>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hasData, setHasData] = useState(false);

  // One delegated listener for the whole document, instead of instrumenting
  // every control.
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const marked = target.closest<HTMLElement>("[data-click]");
      const element = marked?.dataset.click;

      if (!element || !(TRACKABLE_ELEMENTS as readonly string[]).includes(element)) {
        return;
      }

      // Fire and forget: the visitor's interaction must never wait on, or fail
      // because of, a counter write.
      void fetch("/api/analytics/click", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ element }),
        keepalive: true,
      }).catch(() => undefined);
    }

    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  const reload = useCallback(() => {
    void fetch("/api/analytics", { cache: "no-store" })
      .then((response) => response.json() as Promise<{ aggregates: ClickAggregates }>)
      .then((payload) => {
        setAggregates(payload.aggregates ?? []);
        setHasData((payload.aggregates ?? []).length > 0);
      })
      .catch(() => setHasData(false));
  }, []);

  useEffect(() => {
    if (isOpen) {
      reload();
    }
  }, [isOpen, reload]);

  useEffect(() => {
    if (!isOpen || !hasData) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    context.scale(ratio, ratio);

    const total = aggregates.reduce((sum, row) => sum + row.count, 0);
    if (total === 0) {
      return;
    }

    for (const row of aggregates) {
      const node = document.querySelector<HTMLElement>(`[data-click="${row.element}"]`);
      if (!node) {
        continue;
      }

      // Measured here, in the visitor's browser, and never transmitted.
      const box = node.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) {
        continue;
      }

      const intensity = row.count / total;
      const gradient = context.createRadialGradient(
        box.left + box.width / 2,
        box.top + box.height / 2,
        0,
        box.left + box.width / 2,
        box.top + box.height / 2,
        Math.max(box.width, box.height) * 0.75,
      );
      gradient.addColorStop(0, `rgba(186, 243, 54, ${0.15 + intensity * 0.55})`);
      gradient.addColorStop(1, "rgba(186, 243, 54, 0)");

      context.fillStyle = gradient;
      context.fillRect(
        box.left - 12,
        box.top - 12,
        box.width + 24,
        box.height + 24,
      );
    }
  }, [isOpen, hasData, aggregates]);

  const total = aggregates.reduce((sum, row) => sum + row.count, 0);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-label={isOpen ? labels.close : labels.open}
        className="fixed bottom-14 right-4 z-40 inline-flex items-center gap-2 rounded-full border border-border-prominent bg-surface-raised/90 px-3 py-1.5 font-label-mono text-label-mono uppercase tracking-widest text-text-secondary backdrop-blur-md transition-colors hover:border-primary-container hover:text-primary-container"
      >
        <span aria-hidden="true">{isOpen ? "▾" : "▸"}</span>
        {isOpen ? labels.close : labels.open}
      </button>

      {isOpen && (
        <div
          role="region"
          aria-label={labels.panelLabel}
          className="fixed inset-x-0 bottom-24 z-30 mx-auto w-full max-w-[1320px] px-margin md:px-margin-tablet lg:px-margin-desktop"
        >
          <div className="border border-border-subtle bg-surface-raised/95 p-space-md backdrop-blur-md">
            <h2 className="font-headline-sm text-headline-sm text-text-primary">{labels.title}</h2>
            <p className="mt-1 text-body-sm text-body-sm text-text-secondary">{labels.subtitle}</p>

            {!hasData ? (
              <p className="mt-space-sm text-body-sm text-body-sm text-text-muted">{labels.empty}</p>
            ) : (
              <>
                <canvas
                  ref={canvasRef}
                  aria-hidden="true"
                  className="pointer-events-none fixed inset-x-0 top-0 z-0 h-full w-full"
                />
                <p className="mt-space-sm font-label-mono text-label-mono uppercase tracking-widest text-primary-container">
                  {labels.total.replace("{count}", String(total))}
                </p>
                <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                  {aggregates.map((row) => (
                    <li key={row.element} className="font-mono text-label-mono text-text-secondary">
                      {row.element}: {row.count}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
