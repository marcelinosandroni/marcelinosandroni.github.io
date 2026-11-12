"use client";

import { useState } from "react";

import type { CheatsheetContent } from "@/infrastructure/content/cheatsheet/cheatsheet-content";

const TAG_COLORS: Record<string, string> = {
  backend: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  frontend: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  mobile: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  devops: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  sre: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  "ai-ml": "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200",
  database: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  security: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200",
  architecture: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  beginner: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  advanced: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  estagiario: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200",
  trainee: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200",
  junior: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  pleno: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  senior: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200",
  especialista: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  staff: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  principal: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  lead: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200",
  arquiteto: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  distinguished: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export function CheatsheetView({ content }: { content: CheatsheetContent }): React.ReactElement {
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(content.categories.map((c) => c.id)));

  // Collect all unique tags
  const allTags = Array.from(
    new Set(content.categories.flatMap((cat) => cat.terms.flatMap((t) => t.tags ?? []))),
  ).sort();

  const filtered = content.categories
    .map((cat) => ({
      ...cat,
      terms: cat.terms.filter((t) => {
        if (search !== "" && !t.term.toLowerCase().includes(search.toLowerCase()) && !t.definition.toLowerCase().includes(search.toLowerCase())) {
          return false;
        }
        if (activeTag && !(t.tags ?? []).includes(activeTag)) {
          return false;
        }
        return true;
      }),
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
        {allTags.length > 0 ? (
          <div className="mt-space-sm flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTag(null)}
              className={`rounded border px-2 py-0.5 text-[10px] uppercase tracking-widest transition-colors ${
                activeTag === null
                  ? "border-primary-container bg-primary-container text-on-primary-container"
                  : "border-border-subtle bg-surface-base text-text-secondary hover:border-primary-container"
              }`}
            >
              Todas
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                className={`rounded border px-2 py-0.5 text-[10px] uppercase tracking-widest transition-colors ${
                  activeTag === tag
                    ? "border-primary-container bg-primary-container text-on-primary-container"
                    : `border-border-subtle ${TAG_COLORS[tag] ?? "bg-surface-base text-text-secondary"} hover:border-primary-container`
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        ) : null}
        <p className="mt-2 text-label-mono text-text-tertiary">
          {filtered.reduce((n, c) => n + c.terms.length, 0)} termos em {filtered.length} categorias
          {activeTag ? ` (filtrado por: ${activeTag})` : ""}
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
                      <div className="flex flex-wrap items-center gap-2">
                        <dt className="font-label-mono text-label-mono uppercase tracking-widest text-text-primary">
                          {t.term}
                        </dt>
                        {t.level ? (
                          <span className={`rounded px-1.5 py-0.5 text-[9px] uppercase tracking-widest ${TAG_COLORS[t.level] ?? "bg-surface-overlay text-text-secondary"}`}>
                            {t.level}
                          </span>
                        ) : null}
                        {(t.tags ?? []).length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {(t.tags ?? []).map((tag) => (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                                className={`rounded px-1.5 py-0.5 text-[9px] uppercase tracking-widest ${TAG_COLORS[tag] ?? "bg-surface-overlay text-text-secondary"}`}
                              >
                                {tag}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
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
