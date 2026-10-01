/**
 * Whether a contact channel or a document action is offered to a reader.
 *
 * ## Why these are flags and not a config file
 *
 * Both of these are decisions about *what the site offers*, and both can be
 * reversed without a deploy — the number is on the resume, the link is in the
 * copy, and neither belongs in a component's `if`. The environment is the only
 * place that is already shared by local development, preview and production and
 * is read the same way in all three.
 *
 * ## Why the default is off
 *
 * Off is the safe direction for both, and for different reasons that are worth
 * keeping apart:
 *
 *  - **WhatsApp** is a personal phone number. A number that reaches a stranger's
 *    handset should be published deliberately, not inherited from whatever was
 *    true when the component was written. Off-by-default means adding the link is
 *    one env var on purpose, and forgetting it costs nothing.
 *  - **Resume download** renders a document the owner may not want distributed
 *    as a file at all, and the endpoint is a serverless route that compiles
 *    LaTeX. Off-by-default means the surface is absent rather than present and
 *    merely discouraged.
 *
 * A flag that is off by default and shipped on by accident is a smaller failure
 * than one that is on by default and shipped off by accident only if someone
 * notices. Neither of these should depend on someone noticing.
 *
 * ## Why the parsing is here and not in a component
 *
 * `parseFeatureFlag` is a pure function over a string, so the rules are unit
 * tested rather than discovered in a browser. In particular: an unset variable,
 * an empty string and a typo must all resolve to *off*, never to a truthy
 * accident. `NEXT_PUBLIC_FEATURE_WHATSAPP=no` and `=0` and `=off` are all
 * deliberate, and none of them is a state this function cannot represent.
 */

/** The two features that can be switched on or off per environment. */
export type FeatureFlagName = "whatsapp" | "resumeDownload";

/**
 * Environment variable names, spelled once.
 *
 * **The `NEXT_PUBLIC_` prefix is load-bearing, and the reason is SSG.**
 *
 * These pages are statically prerendered. `next build` renders `/pt-br/` and
 * `/pt-br/resume` to HTML on the build machine, so a flag consulted while
 * rendering them is consulted *at build time*, whatever the name happens to be. A
 * plain `FEATURE_WHATSAPP` read from `process.env` looks like a runtime switch and
 * is not one: the home page keeps serving the HTML its build produced.
 *
 * That was measured, not assumed. The first version used the plain name, and the
 * e2e suite served a site with the flag `on` in the server's environment and no
 * WhatsApp link on the page, because the page had been prerendered with it off.
 * The same build answered correctly from a *dynamic* route handler, which is what
 * made the contradiction look like an env-passing bug for far too long.
 *
 * So the prefix is used on purpose, for the honest reason: with it, the value is
 * inlined into the prerendered HTML and the operational rule is simply **change
 * the variable, deploy**. On Vercel that is one env edit. What you give up is a
 * runtime switch with no rebuild, which is not a thing this site needs — and what
 * you keep is a static, cacheable home page instead of one that re-renders per
 * request to read two booleans.
 */
export const FEATURE_FLAG_VARIABLES = {
  whatsapp: "NEXT_PUBLIC_FEATURE_WHATSAPP",
  resumeDownload: "NEXT_PUBLIC_FEATURE_RESUME_DOWNLOAD",
} as const satisfies Record<FeatureFlagName, string>;

/**
 * A flag is off unless the variable says otherwise.
 *
 * Recorded as data rather than passed as an argument at each call site so that
 * the defaults live in exactly one place and a test can assert the whole map at
 * once, instead of each component carrying its own idea of what "unset" means.
 */
export const FEATURE_FLAG_DEFAULTS = {
  whatsapp: false,
  resumeDownload: false,
} as const satisfies Record<FeatureFlagName, boolean>;

/**
 * Values that mean "on".
 *
 * Deliberately short. `true`/`1`/`yes`/`on` cover every shell, `.env` file and
 * hosting dashboard a person is likely to type into, and each of them is
 * unambiguous. Anything else is off.
 */
const TRUTHY = new Set(["1", "true", "yes", "on"]);

/**
 * Reads one flag out of an environment-shaped record.
 *
 * `undefined`, `null`, `""` and whitespace all mean *off* — an operator who
 * left a trailing space after `=` did not mean to enable a feature, and treating
 * a blank as on is the kind of default that turns into a published phone number
 * nobody typed.
 */
export function parseFeatureFlag(value: string | undefined | null): boolean {
  if (typeof value !== "string") {
    return false;
  }

  return TRUTHY.has(value.trim().toLowerCase());
}

/** The environment slice this module reads: just the two variables. */
export type FeatureFlagEnv = Readonly<Partial<Record<string, string | undefined>>>;

/** Whether one named feature is on in the given environment. */
export function isFeatureEnabled(
  name: FeatureFlagName,
  env: FeatureFlagEnv = process.env,
): boolean {
  return parseFeatureFlag(env[FEATURE_FLAG_VARIABLES[name]]);
}

/** Both flags at once, for a component that gates more than one thing. */
export function readFeatureFlags(
  env: FeatureFlagEnv = process.env,
): Record<FeatureFlagName, boolean> {
  return {
    whatsapp: isFeatureEnabled("whatsapp", env),
    resumeDownload: isFeatureEnabled("resumeDownload", env),
  };
}

/**
 * A contact link as the components receive it.
 *
 * Declared here rather than imported from the portfolio so that this module stays
 * a leaf: the feature-flag policy must not depend on the content model, or a
 * change to a channel's shape would drag the gating decision with it.
 */
export type FlaggableChannel = { icon: string };

/**
 * The channels a reader may see, given what is enabled.
 *
 * The WhatsApp number appears in four places — the hero's link row, the contact
 * section's primary button and its channel list, the resume footer, and the site
 * footer's contact line and link columns. Each of those rendered its own copy of
 * "hide the WhatsApp row", and the e2e caught a `wa.me` link surviving in the
 * footer columns because one of the four had been missed. Four copies of one rule
 * is four chances to be wrong, and the wrongness is invisible: the link still
 * works.
 *
 * So the rule lives once, here, and the components ask. A fifth surface would get
 * the filtering for free rather than by remembering.
 *
 * Only the WhatsApp icon is filtered, because it is the only channel that is
 * gated. The predicate is a parameter so that adding a second gated channel is a
 * matter of naming it, not of editing four components.
 */
export function visibleChannels<T extends FlaggableChannel>(
  channels: readonly T[],
  options: { enabled: boolean; icon: string },
): T[] {
  if (options.enabled) {
    return [...channels];
  }

  return channels.filter((channel) => channel.icon !== options.icon);
}
