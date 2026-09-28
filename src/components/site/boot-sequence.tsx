"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

/**
 * First-visit "system handshake" overlay.
 *
 * The reference prototype (`design-assets/code.html`) blocked the page behind a
 * full-screen matrix boot screen for 2.5 seconds, dismissed only by a click or
 * `Enter`, and started a Web Audio drone. Both behaviours were rejected — see
 * DESIGN.md §9. What survives is the *aesthetic*: a fast, translucent telemetry
 * frame over the top of the page, which
 *
 *  - never intercepts pointer input (`pointer-events-none` on the visual layer),
 *    so the headline, CTAs and links are clickable and readable from first paint;
 *  - dismisses itself on a timer, on `Enter`/`Escape`, on the first scroll, and
 *    on the skip control;
 *  - shows only on a visitor's first visit, then records a flag in
 *    `localStorage` — a returning reader never pays for it again;
 *  - renders nothing at all under `prefers-reduced-motion: reduce`;
 *  - tears down its animation frame on unmount, so it costs nothing afterwards.
 *
 * The two gating decisions — reduced motion and first visit — are read through
 * `useSyncExternalStore` with a `false` server snapshot. That is what keeps the
 * overlay out of the server-rendered HTML and out of the hydration pass (so the
 * page has no layout shift when it appears), without a `setState` inside an
 * effect and therefore without a cascading render.
 *
 * Accessibility: the visual layer is `aria-hidden` because it is pure decoration,
 * and the skip control lives *outside* that subtree — a focusable element inside
 * `aria-hidden` is a keyboard trap for screen-reader users, which is the exact
 * failure mode the redesign is trying to avoid.
 *
 * All copy arrives as props from the parent Server Component: this client island
 * holds no dictionary and no content data, so nothing it imports can leak resume
 * or home content into the browser bundle.
 */

const SEEN_KEY = "msd:boot-seen:v1";
/** Long enough to register as an intentional opening beat, short enough to ignore. */
const AUTO_DISMISS_MS = 1100;
const FADE_MS = 750;

const GLYPHS = "ｦｱｳｴｵｶｷｹｺｻｼｽｾｿﾀﾂﾃﾅﾆﾇﾈﾊﾋﾎﾏﾐﾑﾒﾓ011010MSD//ARCHITECT";
const COLUMN_WIDTH = 14;

/** The gating values are read once per page load and never change afterwards. */
const NO_SUBSCRIPTION = () => () => {};
const SERVER_SNAPSHOT_FALSE = () => false;

let firstVisitSnapshot: boolean | null = null;

function readFirstVisit(): boolean {
  if (firstVisitSnapshot === null) {
    try {
      firstVisitSnapshot = window.localStorage.getItem(SEEN_KEY) !== "1";
    } catch {
      // Private mode or a blocked storage partition: treat it as a first visit
      // rather than an error, and let the sequence play.
      firstVisitSnapshot = true;
    }
  }
  return firstVisitSnapshot;
}

function readPrefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export interface BootSequenceProps {
  statusLabel: string;
  skipLabel: string;
  hint: string;
  ownerLine: string;
  diagnostics: string[];
}

export function BootSequence({
  statusLabel,
  skipLabel,
  hint,
  ownerLine,
  diagnostics,
}: BootSequenceProps) {
  const prefersReducedMotion = useSyncExternalStore(
    NO_SUBSCRIPTION,
    readPrefersReducedMotion,
    SERVER_SNAPSHOT_FALSE,
  );
  const isFirstVisit = useSyncExternalStore(NO_SUBSCRIPTION, readFirstVisit, SERVER_SNAPSHOT_FALSE);

  const [dismissed, setDismissed] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fadeTimerRef = useRef<number | null>(null);

  const visible = isFirstVisit && !prefersReducedMotion && !dismissed;

  const dismiss = useCallback(() => {
    setLeaving(true);
    fadeTimerRef.current = window.setTimeout(() => setDismissed(true), FADE_MS);
  }, []);

  // Record the visit so the sequence is a first-run flourish, not a tax.
  useEffect(() => {
    if (!isFirstVisit) {
      return;
    }
    try {
      window.localStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* Non-fatal: the visitor simply sees it again next time. */
    }
  }, [isFirstVisit]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const timer = window.setTimeout(dismiss, AUTO_DISMISS_MS);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Enter" || event.key === "Escape") {
        dismiss();
      }
    };
    const onScroll = () => dismiss();

    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true, once: true });

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll);
    };
  }, [visible, dismiss]);

  useEffect(() => {
    return () => {
      if (fadeTimerRef.current !== null) {
        window.clearTimeout(fadeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!visible || !canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    let width = 0;
    let height = 0;
    let frame = 0;
    let drops: number[] = [];

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.max(1, Math.floor(width * ratio));
      canvas.height = Math.max(1, Math.floor(height * ratio));
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      drops = Array.from({ length: Math.ceil(width / COLUMN_WIDTH) }, () => Math.random() * -20);
    };

    const draw = () => {
      context.fillStyle = "rgba(10, 13, 18, 0.14)";
      context.fillRect(0, 0, width, height);
      context.fillStyle = "#baf336";
      context.font = '14px "JetBrains Mono", monospace';
      context.globalAlpha = 0.55;

      drops.forEach((y, index) => {
        const glyph = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        context.fillText(glyph, index * COLUMN_WIDTH, y);
        drops[index] = y > height + Math.random() * 400 ? 0 : y + COLUMN_WIDTH;
      });

      context.globalAlpha = 1;
      frame = window.requestAnimationFrame(draw);
    };

    resize();
    frame = window.requestAnimationFrame(draw);
    window.addEventListener("resize", resize);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, [visible]);

  if (!visible) {
    return null;
  }

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-100 transition-opacity duration-700 ease-out ${
        leaving ? "opacity-0" : "opacity-100"
      }`}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 flex select-none flex-col justify-between bg-surface-base/55 p-space-lg"
      >
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full opacity-45" />

        <div className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between font-label-mono text-label-mono text-text-muted">
          <span className="flex items-center gap-space-xs">
            <span className="msd-pulse inline-block h-2 w-2 rounded-full bg-primary-container" />
            <span className="font-bold tracking-widest text-primary-container">{statusLabel}</span>
          </span>
          <span className="hidden text-text-secondary sm:inline">UPLINK // SECURE</span>
        </div>

        <div className="relative z-10 mx-auto w-full max-w-xl rounded-xl bg-surface-raised/90 p-space-xl shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between pb-space-sm">
            <span className="font-label-mono text-label-mono uppercase tracking-widest text-text-secondary">
              {"// COGNITIVE SYS_INIT"}
            </span>
            <span className="font-label-mono text-label-mono text-primary-container">[SECURE BOOT]</span>
          </div>
          <div className="space-y-space-xs font-code-inline text-code-inline text-text-muted">
            {diagnostics.map((line, index) => (
              <p
                key={line}
                className={
                  index === diagnostics.length - 1
                    ? "font-bold text-primary-container"
                    : index % 2 === 0
                      ? "text-text-secondary"
                      : "text-on-surface"
                }
              >
                {line}
              </p>
            ))}
          </div>
        </div>

        <div className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between font-label-mono text-label-mono text-text-muted">
          <span className="hidden sm:inline">{ownerLine}</span>
          <span className="ml-auto hidden sm:inline">{hint}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={dismiss}
        aria-label={skipLabel}
        className="pointer-events-auto absolute bottom-4 right-4 cursor-pointer rounded border border-border-subtle bg-surface-overlay/90 px-space-sm py-2 font-label-mono text-label-mono uppercase text-text-primary backdrop-blur-md transition-colors hover:border-primary-container hover:text-primary-container"
      >
        {skipLabel}
      </button>
    </div>
  );
}
