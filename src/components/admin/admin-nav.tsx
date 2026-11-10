"use client";

// No cn utility; use template literals inline.

/**
 * The admin navigation menu.
 *
 * ## Why a tabbed layout and not separate routes
 *
 * Every editor here is a server component that reads its data once per page
 * load. Splitting them into routes would mean a round trip and a spinner for
 * each section, and the owner opens this page to answer "is what is stored here
 * the same as what I just deployed?" — that question is answered faster when
 * everything is one load.
 *
 * The tabs are client-side state, so the server still renders every section
 * (so the data is in the first paint); the tab only decides which one is
 * visible. A section that failed to load still renders its error state, so the
 * owner is not left guessing which editor is broken.
 */
export type AdminSection =
  | "overview"
  | "resume"
  | "variants"
  | "tech-stack"
  | "catalog"
  | "profiles"
  | "cheatsheet"
  | "job-match"
  | "blog"
  | "chat"
  | "feedback";

const SECTIONS: ReadonlyArray<{ id: AdminSection; label: string; icon: string }> = [
  { id: "overview", label: "Overview", icon: "📊" },
  { id: "resume", label: "Resume & Experience", icon: "📄" },
  { id: "variants", label: "CV Variants", icon: "📋" },
  { id: "tech-stack", label: "Tech Stack", icon: "🛠️" },
  { id: "catalog", label: "Technology Catalog", icon: "📚" },
  { id: "profiles", label: "Stack Profiles", icon: "🎯" },
  { id: "cheatsheet", label: "Cheatsheet Tags", icon: "🏷️" },
  { id: "job-match", label: "Job Match", icon: "🔍" },
  { id: "blog", label: "Blog / CMS", icon: "✍️" },
  { id: "chat", label: "Chat & Presence", icon: "💬" },
  { id: "feedback", label: "Feedback", icon: "📋" },
];

export function AdminNav({
  active,
  onChange,
}: {
  active: AdminSection;
  onChange: (section: AdminSection) => void;
}): React.ReactElement {
  return (
    <nav
      aria-label="Admin sections"
      className="sticky top-0 z-10 border-b border-border-subtle bg-surface-raised p-space-sm"
    >
      <ul className="flex flex-wrap gap-2">
        {SECTIONS.map((section) => (
          <li key={section.id}>
            <button
              type="button"
              onClick={() => onChange(section.id)}
              className={
                active === section.id
                  ? "inline-flex items-center gap-2 border px-space-sm py-space-xs text-label-mono uppercase tracking-widest transition-colors border-primary-container bg-primary-container text-on-primary-container"
                  : "inline-flex items-center gap-2 border px-space-sm py-space-xs text-label-mono uppercase tracking-widest transition-colors border-border-subtle bg-surface-base text-text-secondary hover:border-primary-container hover:text-text-primary"
              }
              aria-current={active === section.id ? "page" : undefined}
            >
              <span aria-hidden="true">{section.icon}</span>
              <span>{section.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
