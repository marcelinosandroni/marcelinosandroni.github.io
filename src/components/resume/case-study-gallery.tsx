"use client";

import { useCallback, useEffect, useState } from "react";

import type { CaseStudyMedia } from "@/domain/resume/types";

/**
 * The images attached to one case study, as thumbnails that open a viewer.
 *
 * ## Why a viewer and not just a row of images
 *
 * Because a diagram at thumbnail size is unreadable, and the reader either
 * enlarges it or loses it. The viewer is the difference between "there is a
 * picture" and "there is a picture you can read", and a case study's whole
 * argument is that its diagram is legible.
 *
 * ## Why nothing renders when there is no imagery
 *
 * Because a case study without images is the normal case. A placeholder row, an
 * "images coming soon" line, or a collapsed section would make the majority of
 * cards look broken, and the reader would learn that the empty state is normal
 * and stop noticing the one that is broken.
 *
 * ## Why it is a client component
 *
 * It holds the index of the open image. The images themselves are ordinary
 * `<img>` elements with no optimisation, because a case study diagram is
 * author-supplied content of unknown dimensions — `next/image` would want
 * dimensions it cannot know, and guessing them produces a blurry placeholder or
 * a layout shift on every card that has imagery.
 */
export function CaseStudyGallery({
  title,
  media,
  labels,
}: {
  title: string;
  media: readonly CaseStudyMedia[];
  labels: { open: string; previous: string; next: string; close: string };
}): React.ReactElement | null {
  const [open, setOpen] = useState<number | null>(null);

  const move = useCallback(
    (delta: number) => {
      setOpen((current) =>
        current === null ? null : (current + delta + media.length) % media.length,
      );
    },
    [media.length],
  );

  useEffect(() => {
    if (open === null) {
      return;
    }

    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") setOpen(null);
      if (event.key === "ArrowRight") move(1);
      if (event.key === "ArrowLeft") move(-1);
    };

    document.addEventListener("keydown", onKey);

    /*
      Scrolling locked while open, and restored on the way out.

      Restored rather than merely cleared: a page that stays scrolled-frozen
      after closing a viewer is a page whose content has moved under the reader,
      and on a résumé that reads as the document rearranging itself.
    */
    const previous = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, move]);

  if (media.length === 0) {
    return null;
  }

  return (
    <>
      <ul className="mt-space-sm flex flex-wrap gap-space-sm">
        {media.map((item, index) => (
          <li key={`${item.url}-${index}`}>
            <button
              type="button"
              onClick={() => setOpen(index)}
              aria-label={`${labels.open}: ${item.caption === "" ? item.alt : item.caption}`}
              className="block overflow-hidden rounded border border-border-subtle transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2"
            >
              <img
                src={item.url}
                alt={item.alt}
                loading="lazy"
                className="h-28 w-auto max-w-[220px] object-cover"
              />
            </button>
          </li>
        ))}
      </ul>

      {open === null ? null : (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="fixed inset-0 z-100 flex flex-col bg-surface-overlay/95 p-space-md"
        >
          <div className="flex items-start justify-between gap-space-sm">
            <p className="text-body-sm text-text-secondary">
              {title}
              {media.length > 1 ? ` (${open + 1}/${media.length})` : ""}
            </p>
            <button
              type="button"
              onClick={() => setOpen(null)}
              className="border border-border-subtle px-2 py-1 text-body-sm text-text-primary"
            >
              {labels.close}
            </button>
          </div>

          <div className="flex min-h-0 flex-1 items-center justify-center py-space-md">
            <img
              src={media[open]?.url ?? ""}
              alt={media[open]?.alt ?? ""}
              className="max-h-full max-w-full object-contain"
            />
          </div>

          {media[open]?.caption ? (
            <p className="text-center text-body-sm text-text-secondary">{media[open]?.caption}</p>
          ) : null}

          {media.length > 1 ? (
            <div className="mt-space-sm flex justify-center gap-space-sm">
              <button
                type="button"
                onClick={() => move(-1)}
                className="border border-border-subtle px-3 py-1 text-body-sm text-text-primary"
              >
                {labels.previous}
              </button>
              <button
                type="button"
                onClick={() => move(1)}
                className="border border-border-subtle px-3 py-1 text-body-sm text-text-primary"
              >
                {labels.next}
              </button>
            </div>
          ) : null}
        </div>
      )}
    </>
  );
}