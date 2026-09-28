import { Section } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import type { HomeContact } from "@/domain/portfolio";
import type { Dictionary } from "@/i18n";

export interface ContactGatewaySectionProps {
  section: HomeContact;
  /** Where the pre-filled brief is addressed. */
  email: string;
  t: Dictionary;
}

/**
 * Executive contact gateway.
 *
 * The reference prototype shipped a form that posted nowhere and answered with
 * `alert()` — DESIGN.md §13 forbids both, and a form that silently discards a
 * recruiter's message is worse than no form at all. The affordance is preserved
 * and made honest: the primary action opens a pre-addressed draft in the
 * visitor's own mail client, so a structured brief reaches the inbox without the
 * site needing a server, a spam filter or a queue.
 *
 * The full subject and body templates are configuration, so the tone of the
 * outreach is editable per language without touching the component.
 */
export function ContactGatewaySection({ section, email, t }: ContactGatewaySectionProps) {
  return (
    <Section id={section.id} surface="overlay">
      <div className="relative overflow-hidden rounded-2xl bg-surface-raised p-space-2xl shadow-2xl">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-10 -right-10 h-96 w-96 rounded-full bg-primary-container/10 blur-3xl"
        />

        <div className="relative grid grid-cols-1 items-center gap-space-2xl lg:grid-cols-12">
          <div className="space-y-space-md lg:col-span-7">
            <span className="font-label-mono text-label-mono uppercase tracking-widest text-primary-container">
              {section.kicker}
            </span>
            <h2
              id={`${section.id}-heading`}
              className="font-display-hero text-display-hero-mobile font-extrabold tracking-tight text-text-primary md:text-display-hero"
            >
              {section.title}
            </h2>
            <p className="max-w-xl font-body-lg text-body-lg text-text-secondary">
              {section.narrative}
            </p>

            <dl className="space-y-space-xs pt-space-md font-label-mono text-label-mono">
              {section.channels.map((channel) => (
                <div key={channel.id} className="flex items-center gap-space-sm">
                  <dt className="flex items-center gap-space-sm text-text-muted">
                    <Icon
                      name={channel.icon}
                      size={18}
                      className={
                        channel.icon === "mail" ? "text-primary-container" : "text-secondary"
                      }
                    />
                    <span className="hidden sm:inline">{channel.label}</span>
                  </dt>
                  <dd className="min-w-0 text-text-primary">
                    {channel.href.startsWith("mailto:") ? (
                      <a
                        href={channel.href}
                        className="truncate font-bold transition-colors hover:text-primary-container"
                      >
                        {channel.value}
                      </a>
                    ) : (
                      <span className="font-body-sm text-body-sm text-text-secondary">
                        {channel.value}
                      </span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="space-y-space-md rounded-xl bg-surface-base p-space-xl lg:col-span-5">
            <div className="flex items-center justify-between pb-space-xs">
              <span className="font-label-mono text-label-mono text-text-muted">
                {section.portalLabel}
              </span>
              <span className="msd-pulse h-2 w-2 rounded-full bg-secondary" />
            </div>

            <BriefLauncher
              brief={section.brief}
              email={email}
              note={t.contact.briefNote}
            />

            <p className="pt-space-xs text-center font-label-mono text-[10px] tracking-wider text-text-muted">
              {section.statusNote}
            </p>
          </div>
        </div>
      </div>
    </Section>
  );
}

/**
 * Builds the `mailto:` URL. `{company}` and `{scope}` are left as visible
 * placeholders inside the draft body so the reader fills them in their own mail
 * client — which is exactly what makes the draft feel like a template rather
 * than a form that swallowed their input.
 */
function BriefLauncher({
  brief,
  email,
  note,
}: {
  brief: HomeContact["brief"];
  email: string;
  note: string;
}) {
  const href = `mailto:${email}?subject=${encodeURIComponent(
    brief.subject.replace("{company}", "—"),
  )}&body=${encodeURIComponent(brief.bodyTemplate.replace("{company}", "—").replace("{scope}", "—"))}`;

  return (
    <div className="space-y-space-sm">
      <a href={href} className="button button-primary w-full">
        <Icon name="mail" size={20} />
        {brief.ctaLabel}
      </a>
      <p className="font-body-sm text-body-sm text-text-muted">{note}</p>
    </div>
  );
}
