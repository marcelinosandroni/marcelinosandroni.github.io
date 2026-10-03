"use client";

import { useSyncExternalStore } from "react";

import { PortraitVideo } from "@/components/effects/portrait-video";
import { evaluatePortraitVideoDecision } from "@/domain/media/portrait-video";

/**
 * Decides whether the moving portrait plays here, and renders it if so.
 *
 * ## Why the still is not in here
 *
 * Because it must not be. The `next/image` still underneath is the LCP element,
 * it is rendered on the server with a `srcset` the browser can act on immediately,
 * and moving it behind a client decision would make a photograph wait for
 * hydration. This gate renders *nothing at all* when the answer is no, and the
 * reader is left looking at the photograph — which is the fallback, already
 * correct, needing no reconstruction.
 *
 * ## Why `useSyncExternalStore` and not `useState` + `useEffect`
 *
 * Because the answer is a fact about the reader's environment rather than a piece
 * of component state, and reading it in an effect to then `setState` is two
 * renders to learn something that was already known at the first one. React
 * 19's own lint rule rejects that shape outright, and it is right to: the gate
 * existed to avoid a hydration mismatch and an effect-based version introduces a
 * window where the server said "still" and the client is about to say "video".
 *
 * This way the server snapshot and the first client render agree — both are `no`
 * — and the video appears on the commit after hydration, at which point the still
 * is already painted. The reader never sees a hole.
 *
 * ## `navigator.connection` is not in any standard
 *
 * `saveData` is a `NetworkInformation` extension shipped by Chromium browsers and
 * absent from Safari and Firefox. Reading it through a narrowed cast is the only
 * honest way to ask: on a browser without it the value is `undefined`, which is
 * not `true`, which means the video plays — the same answer a browser with no
 * JavaScript reaches by playing the declarative element directly.
 */
function readVideoAllowed(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const connection = (
    navigator as Navigator & {
      connection?: { saveData?: boolean };
    }
  ).connection;

  return (
    evaluatePortraitVideoDecision({
      reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      saveData: connection?.saveData === true,
    }).kind === "video"
  );
}

/** The server has no reader and no connection, so it always says no. */
function readVideoAllowedOnServer(): boolean {
  return false;
}

/**
 * Subscribing to nothing, deliberately.
 *
 * There is no event to listen for: a reader's motion preference and data-saver
 * setting are both read once per page view, and neither changing mid-visit is
 * worth a re-render. The empty subscribe is the honest expression of that — the
 * snapshot is a constant for the lifetime of the document.
 */
function subscribeToNothing(): () => void {
  return () => undefined;
}

export function PortraitVideoGate({
  className,
  eager = false,
}: {
  className?: string;
  eager?: boolean;
}) {
  const allowed = useSyncExternalStore(
    subscribeToNothing,
    readVideoAllowed,
    readVideoAllowedOnServer,
  );

  if (!allowed) {
    return null;
  }

  return <PortraitVideo className={className} eager={eager} />;
}