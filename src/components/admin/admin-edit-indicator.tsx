"use client";

import { useEffect, useState } from "react";

import { getOwnerSession } from "@/infrastructure/auth/owner-session";

/**
 * Inline edit indicator shown to the owner when they are logged in.
 *
 * ## Why this is a client component
 *
 * The owner session is read on the server, but the decision to show an edit
 * affordance is a client-side concern: the indicator must not be in the
 * server-rendered HTML for anonymous visitors, and it must appear without a
 * full page reload after sign-in. Reading the session here means the page
 * stays statically generated and the indicator is layered on top.
 *
 * ## How it works
 *
 * When the owner is signed in, a small floating badge appears in the corner
 * of the page. Clicking it opens the admin panel in a new tab at the section
 * that owns the content being viewed.
 */
export function AdminEditIndicator({
  section = "overview",
  label = "Edit",
}: {
  section?: string;
  label?: string;
}): React.ReactElement | null {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check if the user is an admin by looking for the session cookie.
    // The actual authorization is server-side; this is only a UI hint.
    const checkAdmin = async () => {
      try {
        const response = await fetch("/api/admin/status", { credentials: "include" });
        setIsAdmin(response.ok);
      } catch {
        setIsAdmin(false);
      }
    };

    void checkAdmin();
  }, []);

  if (!isAdmin) {
    return null;
  }

  return (
    <a
      href={`/admin#${section}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-4 right-4 z-50 inline-flex items-center gap-2 border border-primary-container bg-primary-container px-space-sm py-space-xs text-label-mono uppercase tracking-widest text-on-primary-container shadow-lg transition-transform hover:scale-105"
      aria-label={`Edit this page (${label})`}
    >
      <span aria-hidden="true">✏️</span>
      <span>{label}</span>
    </a>
  );
}
