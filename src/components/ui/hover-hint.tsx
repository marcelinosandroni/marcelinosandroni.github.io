"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * A description that appears when the pointer rests on something.
 *
 * ## Why it is not a `title` attribute
 *
 * Because `title` cannot be styled, cannot be positioned, is not announced by a
 * screen reader on most browsers, and appears instantly — so moving the pointer
 * across a row of chips flashes a series of unstyled boxes. This one is delayed,
 * dismissible, and reachable from the keyboard.
 *
 * ## Why the keyboard path has no delay
 *
 * Focus is a deliberate act. Someone tabbing through a skills list reaches a chip
 * and waits for nothing, because there is no pointer sweep to protect them from.
 * The delay exists only to survive a mouse crossing several chips in passing.
 *
 * ## Why Escape and blur both dismiss
 *
 * Escape because a tooltip that cannot be dismissed is a popup with no close
 * button, which on a keyboard is a trap: there is no way past it except tabbing
 * to something that unmounts it.
 */
export function HoverHint({
  label,
  description,
  children,
  delayMs = 350,
  className,
}: {
  label: string;
  /** Empty renders the child alone — a chip with no description says nothing. */
  description: string;
  children: React.ReactNode;
  delayMs?: number;
  className?: string;
}): React.ReactElement {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const id = useId();

  const cancel = (): void => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const showAfter = (ms: number): void => {
    cancel();
    timer.current = setTimeout(() => setOpen(true), ms);
  };

  useEffect(() => cancel, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", onKey);

    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (description.trim() === "") {
    return <>{children}</>;
  }

  return (
    <span
      className={`relative inline-flex ${className ?? ""}`}
      onMouseEnter={() => showAfter(delayMs)}
      onMouseLeave={() => {
        cancel();
        setOpen(false);
      }}
      onFocus={() => {
        cancel();
        setOpen(true);
      }}
      onBlur={() => setOpen(false)}
      aria-describedby={open ? id : undefined}
    >
      {children}

      {open ? (
        <span
          id={id}
          role="tooltip"
          className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 w-64 -translate-x-1/2 border border-border-subtle bg-surface-overlay p-2 text-left text-body-sm text-text-secondary shadow-lg"
        >
          <span className="block font-label-mono text-label-mono uppercase tracking-widest text-text-primary">
            {label}
          </span>
          <span className="mt-1 block">{description}</span>
        </span>
      ) : null}
    </span>
  );
}