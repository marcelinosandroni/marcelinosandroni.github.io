"use client";

import { useState } from "react";

import { useAdminWrite } from "@/components/admin/use-admin-write";

/**
 * The owner's CV variant editor — full editing.
 *
 * ## What this unlocks
 *
 * The five stack variants used to be typed TypeScript modules under
 * `scripts/data/stack-variants.pt-br.ts`. That made it impossible to correct
 * a typo or add a stack without a deploy and a rebuild of all twelve PDFs.
 *
 * This moves variant content into the database so the owner edits it from
 * `/admin`, exactly as the experience and the tech stack already are.
 *
 * ## Shape
 *
 * A variant is the shared shell with five things replaced:
 * - headline (one line)
 * - summary (lead + body, 5 lines)
 * - metrics (4 cards × value/label/caption)
 * - inventory (6 groups × label/items)
 * - roles (5 roles × stack + bullets)
 *
 * Everything else — company, dates, tenure, education, languages, contact —
 * is inherited from the shell and is not stored here.
 */
export function ResumeVariantEditor({
  initialVariants,
  locale,
}: {
  initialVariants: ReadonlyArray<{
    id: string;
    slug: string;
    label: string;
    title: string;
    headline: string;
    summaryLead?: string;
    summaryBody?: string;
    metrics?: ReadonlyArray<readonly [string, string, string]>;
    inventory?: ReadonlyArray<readonly [string, string]>;
    roles?: ReadonlyArray<{
      key: string;
      stack: string | null;
      bullets: ReadonlyArray<readonly [string, string]>;
    }>;
  }>;
  locale: string;
}): React.ReactElement {
  const [variants, setVariants] = useState(initialVariants);
  const [selected, setSelected] = useState<string | null>(
    initialVariants[0]?.id ?? null,
  );
  const [creating, setCreating] = useState(false);
  const [newSlug, setNewSlug] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newHeadline, setNewHeadline] = useState("");
  const { status, pending, write } = useAdminWrite("/api/admin/resume/variants");

  const selectedVariant = variants.find((v) => v.id === selected);

  return (
    <div>
      <h2 className="font-headline-sm text-headline-sm text-text-primary">CV Variants</h2>
      <p className="mt-2 max-w-prose text-body-sm text-text-secondary">
        One variant per stack. Each one argues for a different backend + frontend
        pair, sharing the experience, the education and the contact details with
        the general résumé. The headline is the one thing a variant owns outright.
      </p>

      {status === null ? null : (
        <p
          role="status"
          className="mt-3 border border-border-subtle p-space-sm text-body-sm text-text-secondary"
        >
          {status}
        </p>
      )}

      <div className="mt-space-md flex gap-space-md">
        {/* Sidebar: variant list */}
        <div className="w-1/3 space-y-2">
          <ul className="space-y-2">
            {variants.map((variant) => (
              <li key={variant.id}>
                <button
                  type="button"
                  onClick={() => setSelected(variant.id)}
                  className={`w-full border px-space-sm py-space-xs text-left text-label-mono uppercase tracking-widest transition-colors ${
                    selected === variant.id
                      ? "border-primary-container bg-primary-container text-on-primary-container"
                      : "border-border-subtle bg-surface-base text-text-secondary hover:border-primary-container"
                  }`}
                >
                  {variant.slug}
                </button>
              </li>
            ))}
          </ul>

          {creating ? (
            <div className="border border-border-subtle bg-surface-base p-space-sm">
              <input
                type="text"
                placeholder="Slug (e.g. enterprise-go-react)"
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value)}
                className="w-full border border-border-subtle bg-surface-raised px-space-sm py-space-xs text-body-sm"
              />
              <input
                type="text"
                placeholder="Title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="mt-2 w-full border border-border-subtle bg-surface-raised px-space-sm py-space-xs text-body-sm"
              />
              <input
                type="text"
                placeholder="Headline"
                value={newHeadline}
                onChange={(e) => setNewHeadline(e.target.value)}
                className="mt-2 w-full border border-border-subtle bg-surface-raised px-space-sm py-space-xs text-body-sm"
              />
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    if (newSlug.trim() === "" || newTitle.trim() === "" || newHeadline.trim() === "") return;
                    void write(
                      { kind: "insert", table: "resume_variant", values: { locale, slug: newSlug.trim(), label: newSlug.trim(), title: newTitle.trim(), headline: newHeadline.trim(), sort_order: variants.length } },
                      "Variant created.",
                      () => {
                        setVariants((c) => [...c, { id: crypto.randomUUID(), slug: newSlug.trim(), label: newSlug.trim(), title: newTitle.trim(), headline: newHeadline.trim() }]);
                        setCreating(false);
                        setNewSlug(""); setNewTitle(""); setNewHeadline("");
                      },
                    );
                  }}
                  className="border border-primary-container bg-primary-container px-space-sm py-space-xs text-label-mono uppercase tracking-widest text-on-primary-container"
                >
                  {pending ? "Saving…" : "Create"}
                </button>
                <button
                  type="button"
                  onClick={() => setCreating(false)}
                  className="border border-border-subtle px-space-sm py-space-xs text-label-mono uppercase tracking-widest text-text-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="w-full border border-border-subtle px-space-sm py-space-xs text-label-mono uppercase tracking-widest text-text-secondary hover:border-primary-container hover:text-text-primary"
            >
              + New variant
            </button>
          )}
        </div>

        {/* Editor: selected variant */}
        <div className="flex-1">
          {selectedVariant ? (
            <VariantEditor
              variant={selectedVariant}
              write={write}
              onChange={(next) =>
                setVariants((current) =>
                  current.map((v) => (v.id === selectedVariant.id ? { ...v, ...next } : v)),
                )
              }
            />
          ) : (
            <p className="text-body-sm text-text-secondary">Select a variant to edit.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function VariantEditor({
  variant,
  write,
  onChange,
}: {
  variant: {
    id: string;
    slug: string;
    label: string;
    title: string;
    headline: string;
    summaryLead?: string;
    summaryBody?: string;
    metrics?: ReadonlyArray<readonly [string, string, string]>;
    inventory?: ReadonlyArray<readonly [string, string]>;
    roles?: ReadonlyArray<{ key: string; stack: string | null; bullets: ReadonlyArray<readonly [string, string]> }>;
  };
  write: ReturnType<typeof useAdminWrite>["write"];
  onChange: (next: Record<string, unknown>) => void;
}): React.ReactElement {
  const [title, setTitle] = useState(variant.title);
  const [headline, setHeadline] = useState(variant.headline);
  const [summaryLead, setSummaryLead] = useState(variant.summaryLead ?? "");
  const [summaryBody, setSummaryBody] = useState(variant.summaryBody ?? "");
  const [metrics, setMetrics] = useState(variant.metrics ?? []);
  const [inventory, setInventory] = useState(variant.inventory ?? []);
  const [roles, setRoles] = useState(variant.roles ?? []);

  const saveField = (field: string, value: unknown) => {
    void write(
      { kind: "update", table: "resume_variant", id: variant.id, values: { [field]: value } },
      "Saved.",
      () => onChange({ [field]: value }),
    );
  };

  return (
    <div className="space-y-space-md">
      <div>
        <label className="block text-body-sm text-text-secondary">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => saveField("title", title)}
          className="mt-1 w-full border border-border-subtle bg-surface-raised px-space-sm py-space-xs text-body-sm"
        />
      </div>

      <div>
        <label className="block text-body-sm text-text-secondary">Headline</label>
        <input
          type="text"
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          onBlur={() => saveField("headline", headline)}
          className="mt-1 w-full border border-border-subtle bg-surface-raised px-space-sm py-space-xs text-body-sm"
        />
      </div>

      <div>
        <label className="block text-body-sm text-text-secondary">Summary Lead</label>
        <textarea
          value={summaryLead}
          onChange={(e) => setSummaryLead(e.target.value)}
          onBlur={() => saveField("summary_lead", summaryLead)}
          rows={2}
          className="mt-1 w-full border border-border-subtle bg-surface-raised px-space-sm py-space-xs text-body-sm"
        />
      </div>

      <div>
        <label className="block text-body-sm text-text-secondary">Summary Body</label>
        <textarea
          value={summaryBody}
          onChange={(e) => setSummaryBody(e.target.value)}
          onBlur={() => saveField("summary_body", summaryBody)}
          rows={4}
          className="mt-1 w-full border border-border-subtle bg-surface-raised px-space-sm py-space-xs text-body-sm"
        />
      </div>

      <div>
        <h3 className="font-headline-sm text-headline-sm text-text-primary">Metrics (4 cards)</h3>
        {metrics.map((m, i) => (
          <div key={i} className="mt-2 grid grid-cols-3 gap-2">
            <input
              type="text"
              value={m[0]}
              onChange={(e) => {
                const next = [...metrics];
                next[i] = [e.target.value, m[1], m[2]];
                setMetrics(next);
              }}
              onBlur={() => saveField("metrics", metrics)}
              placeholder="Value"
              className="border border-border-subtle bg-surface-raised px-space-sm py-space-xs text-body-sm"
            />
            <input
              type="text"
              value={m[1]}
              onChange={(e) => {
                const next = [...metrics];
                next[i] = [m[0], e.target.value, m[2]];
                setMetrics(next);
              }}
              onBlur={() => saveField("metrics", metrics)}
              placeholder="Label"
              className="border border-border-subtle bg-surface-raised px-space-sm py-space-xs text-body-sm"
            />
            <input
              type="text"
              value={m[2]}
              onChange={(e) => {
                const next = [...metrics];
                next[i] = [m[0], m[1], e.target.value];
                setMetrics(next);
              }}
              onBlur={() => saveField("metrics", metrics)}
              placeholder="Caption"
              className="border border-border-subtle bg-surface-raised px-space-sm py-space-xs text-body-sm"
            />
          </div>
        ))}
      </div>

      <div>
        <h3 className="font-headline-sm text-headline-sm text-text-primary">Inventory (skill groups)</h3>
        {inventory.map((inv, i) => (
          <div key={i} className="mt-2 space-y-1">
            <input
              type="text"
              value={inv[0]}
              onChange={(e) => {
                const next = [...inventory];
                next[i] = [e.target.value, inv[1]];
                setInventory(next);
              }}
              onBlur={() => saveField("inventory", inventory)}
              placeholder="Group label"
              className="w-full border border-border-subtle bg-surface-raised px-space-sm py-space-xs text-body-sm"
            />
            <textarea
              value={inv[1]}
              onChange={(e) => {
                const next = [...inventory];
                next[i] = [inv[0], e.target.value];
                setInventory(next);
              }}
              onBlur={() => saveField("inventory", inventory)}
              placeholder="Items (comma-separated)"
              rows={2}
              className="w-full border border-border-subtle bg-surface-raised px-space-sm py-space-xs text-body-sm"
            />
          </div>
        ))}
      </div>

      <div>
        <h3 className="font-headline-sm text-headline-sm text-text-primary">Roles (stack + bullets)</h3>
        {roles.map((role, ri) => (
          <div key={ri} className="mt-2 border border-border-subtle bg-surface-base p-space-sm">
            <p className="font-label-mono text-label-mono uppercase tracking-widest text-text-muted">
              {role.key}
            </p>
            <input
              type="text"
              value={role.stack ?? ""}
              onChange={(e) => {
                const next = [...roles];
                next[ri] = { ...role, stack: e.target.value || null };
                setRoles(next);
              }}
              onBlur={() => saveField("roles", roles)}
              placeholder="Stack (one line)"
              className="mt-1 w-full border border-border-subtle bg-surface-raised px-space-sm py-space-xs text-body-sm"
            />
            {role.bullets.map((bullet, bi) => (
              <div key={bi} className="mt-2 grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={bullet[0]}
                  onChange={(e) => {
                    const next = [...roles];
                    const newBullets = [...role.bullets];
                    newBullets[bi] = [e.target.value, bullet[1]];
                    next[ri] = { ...role, bullets: newBullets };
                    setRoles(next);
                  }}
                  onBlur={() => saveField("roles", roles)}
                  placeholder="Bullet label"
                  className="border border-border-subtle bg-surface-raised px-space-sm py-space-xs text-body-sm"
                />
                <textarea
                  value={bullet[1]}
                  onChange={(e) => {
                    const next = [...roles];
                    const newBullets = [...role.bullets];
                    newBullets[bi] = [bullet[0], e.target.value];
                    next[ri] = { ...role, bullets: newBullets };
                    setRoles(next);
                  }}
                  onBlur={() => saveField("roles", roles)}
                  placeholder="Bullet body"
                  rows={2}
                  className="border border-border-subtle bg-surface-raised px-space-sm py-space-xs text-body-sm"
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
