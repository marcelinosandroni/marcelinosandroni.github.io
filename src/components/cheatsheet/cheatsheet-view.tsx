"use client";

import { useState } from "react";

import type { CheatsheetContent } from "@/infrastructure/content/cheatsheet/cheatsheet-content";

export function CheatsheetView({ content }: { content: CheatsheetContent }): React.ReactElement {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set(content.categories.map((c) => c.id)));

  const filtered = content.categories
    .map((cat) => ({
      ...cat,
      terms: cat.terms.filter(
        (t) =>
          search === "" ||
          t.term.toLowerCase().includes(search.toLowerCase()) ||
          t.definition.toLowerCase().includes(search.toLowerCase()),
      ),
    }))
    .filter((cat) => cat.terms.length > 0);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <main className="mx-auto w-full max-w-[1320px] px-margin py-space-lg md:px-margin-tablet lg:px-margin-desktop">
      <header className="mb-space-lg">
        <h1 className="font-headline-lg text-headline-lg text-text-primary">{content.title}</h1>
        <p className="mt-2 text-body-md text-text-secondary">{content.subtitle}</p>
        <input
          type="search"
          placeholder="Buscar termo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mt-space-md w-full border border-border-subtle bg-surface-raised px-space-sm py-space-xs text-body-sm"
        />
        <p className="mt-2 text-label-mono text-text-tertiary">
          {filtered.reduce((n, c) => n + c.terms.length, 0)} termos em {filtered.length} categorias
        </p>
      </header>

      <div className="space-y-space-lg">
        {filtered.map((cat) => (
          <section key={cat.id} className="border border-border-subtle bg-surface-raised">
            <button
              type="button"
              onClick={() => toggle(cat.id)}
              className="flex w-full items-center gap-3 px-space-md py-space-sm text-left"
            >
              <span className="text-2xl">{cat.icon}</span>
              <h2 className="font-headline-sm text-headline-sm text-text-primary">{cat.title}</h2>
              <span className="ml-auto text-label-mono text-text-tertiary">
                {cat.terms.length} termos
              </span>
              <span className="text-text-tertiary">{expanded.has(cat.id) ? "−" : "+"}</span>
            </button>
            {expanded.has(cat.id) ? (
              <div className="border-t border-border-subtle px-space-md py-space-sm">
                <dl className="space-y-space-sm">
                  {cat.terms.map((t, i) => (
                    <div key={i} className="border-b border-border-subtle/50 pb-space-sm last:border-0">
                      <dt className="font-label-mono text-label-mono uppercase tracking-widest text-text-primary">
                        {t.term}
                      </dt>
                      <dd className="mt-1 text-body-sm text-text-secondary">{t.definition}</dd>
                      {t.example ? (
                        <dd className="mt-1 text-body-sm text-text-tertiary italic">
                          Ex: {t.example}
                        </dd>
                      ) : null}
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}
          </section>
        ))}
      </div>
    </main>
  );
}
