import { SectionShell } from "@/components/home/section-shell";
import { Icon } from "@/components/ui/icon";
import { toWhatsAppHref } from "@/domain/portfolio";
import { isFeatureEnabled, visibleChannels } from "@/domain/feature-flags/feature-flags";
/**
 * Contact channels mapped onto the aggregate allowlist.
 *
 * Only the destinations that represent a real decision are counted. Social
 * profiles are excluded on purpose: "did they click LinkedIn" is a question
 * about a person's browsing habits, and the portfolio has no use for the answer.
 */
const CONTACT_CLICK_IDS: Record<string, string | undefined> = {
  email: "contact-email",
  whatsapp: "contact-whatsapp",
  phone: "contact-phone",
};
import type { HomeContact } from "@/domain/portfolio";
import type { Dictionary } from "@/i18n";
import { formatMessage } from "@/i18n/format-message";

export interface ContactGatewaySectionProps {
  section: HomeContact;
  /** Where the prefilled brief and the WhatsApp thread are addressed. */
  email: string;
  phone: string;
  t: Dictionary;
}

/**
 * Executive contact gateway.
 *
 * The reference prototype shipped a form that posted nowhere and answered with
 * `alert()` — DESIGN.md §13 forbids both, and a form that silently discards a
 * reader's message is worse than no form at all. Both affordances here work
 * with no server at all, and neither depends on the other:
 *
 *  - **WhatsApp leads.** A reader who wants an answer wants a conversation, not a
 *    form. The link opens a thread with the context fields already framed.
 *  - **The email brief is the fallback** for anyone who prefers to write, opening
 *    a pre-addressed draft with the same structure.
 *
 * The subject, body and message templates are configuration, so the tone of the
 * outreach is editable per language without touching the component.
 *
 * ## WhatsApp is gated, and so is its absence from the layout
 *
 * `NEXT_PUBLIC_FEATURE_WHATSAPP` decides whether the number is published, and it
 * is off unless something explicitly turns it on. When it is off, two things go
 * away rather than one: the primary call to action is not rendered, and any
 * WhatsApp row in the channel list is filtered out. Leaving the row behind would
 * leave a `wa.me` link that the CTA no longer draws attention to — the reader
 * would still be one click from a stranger's phone, which is the thing the flag
 * exists to prevent.
 *
 * The email brief is unaffected either way. It is the fallback, and a fallback
 * that disappears along with the thing it is a fallback *for* would leave a
 * contact section with no way to make contact at all.
 */
export function ContactGatewaySection({ section, email, phone, t }: ContactGatewaySectionProps) {
  // `{company}` and `{scope}` stay as visible dashes in the reader's own client,
  // which is what makes the draft a template rather than a form that swallowed
  // their input.
  const values = { company: "—", scope: "—" };

  const whatsappEnabled = isFeatureEnabled("whatsapp");
  const channels = visibleChannels(section.channels, {
    enabled: whatsappEnabled,
    icon: "whatsapp",
  });

  return (
    <SectionShell id={section.id} surface="overlay" artwork={{ section: "contact", placement: "corner-bottom-left" }}>
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
              {whatsappEnabled ? section.narrative : section.narrativeWithoutWhatsApp}
            </p>

            <dl className="space-y-space-xs pt-space-md font-label-mono text-label-mono">
              {channels.map((channel) => (
                <div key={channel.id} className="flex items-center gap-space-sm">
                  <dt className="flex items-center gap-space-sm text-text-muted">
                    <Icon
                      name={channel.icon}
                      size={18}
                      className={
                        channel.icon === "whatsapp" || channel.icon === "mail"
                          ? "text-primary-container"
                          : "text-secondary"
                      }
                    />
                    <span className="hidden sm:inline">{channel.label}</span>
                  </dt>
                  <dd className="min-w-0 text-text-primary">
                    {channel.link === false ? (
                      <span className="font-body-sm text-body-sm text-text-secondary">
                        {channel.value}
                      </span>
                    ) : (
                      <a
                        href={channel.href}
                        data-click={CONTACT_CLICK_IDS[channel.id] ?? undefined}
                        className="tap-target truncate font-bold transition-colors hover:text-primary-container"
                        {...(channel.external
                          ? { target: "_blank", rel: "noreferrer noopener" }
                          : {})}
                      >
                        {channel.value}
                      </a>
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

            <div className="space-y-space-sm">
              {whatsappEnabled ? (
                <a
                  href={toWhatsAppHref(phone, formatMessage(section.whatsapp.message, values))}
                  className="button button-primary w-full"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  <Icon name="whatsapp" size={20} />
                  {section.whatsapp.ctaLabel}
                </a>
              ) : null}

              <a
                href={`mailto:${email}?subject=${encodeURIComponent(
                  section.brief.subject.replace("{company}", "—"),
                )}&body=${encodeURIComponent(
                  formatMessage(section.brief.bodyTemplate, values),
                )}`}
                className="button button-quiet w-full"
              >
                <Icon name="mail" size={20} />
                {section.brief.ctaLabel}
              </a>

              {/*
                The note explains what the two buttons do, naming WhatsApp in the
                first clause. With the WhatsApp button gone, keeping it would leave
                copy describing an affordance the reader cannot find, so it is part
                of the same gate. The email button does not grow to fill the gap:
                `button-quiet` next to nothing above it still reads as a secondary
                action, and restyling it per environment would make the two
                deployments look like different sites.
              */}
              {whatsappEnabled ? (
                <p className="pt-space-xs font-body-sm text-body-sm text-text-muted">
                  {t.contact.briefNote}
                </p>
              ) : null}
            </div>

            <p className="pt-space-xs text-center font-label-mono text-[10px] tracking-wider text-text-muted">
              {whatsappEnabled ? section.statusNote : section.statusNoteWithoutWhatsApp}
            </p>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}
