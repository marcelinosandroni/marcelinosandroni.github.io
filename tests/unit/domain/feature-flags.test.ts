import { describe, expect, it } from "vitest";

import {
  FEATURE_FLAG_DEFAULTS,
  FEATURE_FLAG_VARIABLES,
  isFeatureEnabled,
  parseFeatureFlag,
  readFeatureFlags,
  visibleChannels,
} from "@/domain/feature-flags/feature-flags";

describe("parseFeatureFlag", () => {
  it.each(["1", "true", "TRUE", "yes", "Yes", "on", "ON", " true "])(
    "reads %o as on",
    (value) => {
      expect(parseFeatureFlag(value)).toBe(true);
    },
  );

  // The whole point of the defaults: a phone number and a document endpoint that
  // nobody asked to publish must not appear because a variable was left blank.
  it.each([
    undefined,
    null,
    "",
    "   ",
    "\t",
    "no",
    "0",
    "false",
    "off",
    "maybe",
    "enabled",
    "2",
    "null",
    "undefined",
  ])("reads %o as off", (value) => {
    expect(parseFeatureFlag(value)).toBe(false);
  });

  it("is not fooled by a value that merely contains a truthy word", () => {
    // `noton` and `yes-please` are typos, not intentions. Anything outside the
    // exact set is off, so a typo disables rather than enables.
    expect(parseFeatureFlag("noton")).toBe(false);
    expect(parseFeatureFlag("yes-please")).toBe(false);
    expect(parseFeatureFlag("truthy")).toBe(false);
  });
});

describe("feature flag defaults", () => {
  it("has both features off when nothing is configured", () => {
    expect(readFeatureFlags({})).toEqual({ whatsapp: false, resumeDownload: false });
  });

  it("agrees with the declared defaults", () => {
    // The map is duplicated as a constant so call sites can read it; if the two
    // ever disagree, one of them is lying. This is the test that says so.
    expect(FEATURE_FLAG_DEFAULTS).toEqual({ whatsapp: false, resumeDownload: false });
  });

  it("declares a variable name for every feature", () => {
    // The `NEXT_PUBLIC_` prefix is part of the contract, and asserted rather than
    // assumed. These pages are prerendered at build time, so without it the flag
    // would read as a runtime switch and behave as a baked-in constant — which is
    // exactly the confusion the prefix settles.
    for (const name of Object.keys(FEATURE_FLAG_VARIABLES)) {
      expect(FEATURE_FLAG_VARIABLES[name as keyof typeof FEATURE_FLAG_VARIABLES]).toMatch(
        /^NEXT_PUBLIC_FEATURE_[A-Z_]+$/,
      );
    }
  });
});

describe("isFeatureEnabled", () => {
  const env = {
    [FEATURE_FLAG_VARIABLES.whatsapp]: "on",
    [FEATURE_FLAG_VARIABLES.resumeDownload]: "",
  };

  it("reads each feature from its own variable", () => {
    expect(isFeatureEnabled("whatsapp", env)).toBe(true);
    expect(isFeatureEnabled("resumeDownload", env)).toBe(false);
  });

  it("does not let one feature's variable enable the other", () => {
    // WhatsApp on, download off — the two are independent, and a shared prefix
    // that matched too loosely would be the obvious way to break that.
    expect(isFeatureEnabled("resumeDownload", env)).toBe(false);
  });

  it("is off in an empty environment", () => {
    expect(isFeatureEnabled("whatsapp", {})).toBe(false);
    expect(isFeatureEnabled("resumeDownload", {})).toBe(false);
  });
});

describe("visibleChannels", () => {
  const channels = [
    { id: "email", icon: "mail" },
    { id: "whatsapp", icon: "whatsapp" },
    { id: "github", icon: "github" },
    { id: "linkedin", icon: "linkedin" },
  ];
  const off = { enabled: false, icon: "whatsapp" } as const;

  it("drops only the gated channel when disabled", () => {
    expect(visibleChannels(channels, off).map((c) => c.id)).toEqual(["email", "github", "linkedin"]);
  });

  it("keeps everything when enabled", () => {
    expect(visibleChannels(channels, { enabled: true, icon: "whatsapp" })).toHaveLength(4);
  });

  it("matches on the icon, not the id", () => {
    // The flag is about a channel type, not about one row. A test that filtered on
    // the id would pass here and fail the moment the copy file renames it.
    const renamed = [
      { id: "wa-primary", icon: "whatsapp" },
      { id: "mail", icon: "mail" },
    ];

    expect(visibleChannels(renamed, off).map((c) => c.id)).toEqual(["mail"]);
  });

  it("leaves other channels alone", () => {
    // Only the named icon is gated. A channel that is not a contact route must not
    // be swept up by the filter.
    const others = [
      { id: "location", icon: "pin" },
      { id: "whatsapp", icon: "whatsapp" },
    ];

    expect(visibleChannels(others, off).map((c) => c.id)).toEqual(["location"]);
  });

  it("handles an empty list and a list with nothing to remove", () => {
    expect(visibleChannels([], off)).toEqual([]);
    expect(visibleChannels([{ id: "mail", icon: "mail" }], off)).toHaveLength(1);
  });

  it("does not mutate its input", () => {
    // The channel arrays come from shared content modules. A sort or splice in
    // here would silently empty the hero's links for the rest of the request.
    const input = [...channels];
    visibleChannels(input, off);

    expect(input).toHaveLength(4);
  });

  it("returns a copy even when nothing is filtered", () => {
    const input = [...channels];

    expect(visibleChannels(input, { enabled: true, icon: "whatsapp" })).not.toBe(input);
  });
});
