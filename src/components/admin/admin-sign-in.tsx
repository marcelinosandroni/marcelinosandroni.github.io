"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";

import type { Dictionary } from "@/i18n";

export interface AdminSignInProps {
  t: Dictionary;
  /** Shown when the provider has no credentials, instead of a dead form. */
  isConfigured: boolean;
}

/**
 * Owner sign-in: an address, and a link arrives by email.
 *
 * A password field is deliberately absent. There is no credential to leak,
 * reuse, phish or leak from a breach, which is the entire security argument for
 * passwordless auth on a single-owner surface.
 *
 * The form never reveals whether an address is on the allowlist: Auth.js answers
 * the same way either way, and this component keeps it that way. Telling a
 * stranger "that address is not the owner" hands them the one fact they came for.
 */
export function AdminSignIn({ t, isConfigured }: AdminSignInProps) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "done">("idle");
  const [isPending, startTransition] = useTransition();

  if (!isConfigured) {
    return (
      <div className="border border-border-prominent bg-surface-raised p-space-md">
        <h1 className="font-headline-sm text-headline-sm text-text-primary">{t.admin.signInTitle}</h1>
        <p className="mt-2 text-body-sm text-body-sm text-text-secondary">
          {t.admin.notConfigured}
        </p>
      </div>
    );
  }

  return (
    <div className="border border-border-subtle bg-surface-raised p-space-md">
      <h1 className="font-headline-sm text-headline-sm text-text-primary">{t.admin.signInTitle}</h1>
      <p className="mt-2 text-body-sm text-body-sm text-text-secondary">{t.admin.signInDescription}</p>

      {state === "done" ? (
        <p role="status" className="mt-space-md text-body-sm text-body-sm text-text-secondary">
          {t.admin.sent}
        </p>
      ) : (
        <form
          className="mt-space-md flex flex-col gap-space-sm sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              await signIn("resend", { email, redirect: false });
              // Deliberately no branch on the result: the message is the same
              // whether the address is the owner or not, so this cannot be used
              // to discover who is on the allowlist.
              setState("done");
            });
          }}
        >
          <label htmlFor="admin-email" className="sr-only">
            {t.admin.emailLabel}
          </label>
          <input
            id="admin-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={t.admin.emailPlaceholder}
            aria-label={t.admin.emailLabel}
            className="min-w-0 flex-1 border border-border-subtle bg-surface-base px-space-sm py-space-sm font-body-sm text-body-sm text-text-primary outline-none focus:border-primary-container"
          />
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center justify-center bg-primary-container px-space-md py-space-sm font-label-mono text-label-mono uppercase tracking-widest text-on-primary-container disabled:opacity-70"
          >
            {isPending ? t.admin.sending : t.admin.submit}
          </button>
        </form>
      )}
    </div>
  );
}
