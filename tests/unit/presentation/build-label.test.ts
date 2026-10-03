import { describe, expect, it } from "vitest";

import {
  buildEnvironmentLabel,
  buildStampLabel,
  buildTooltip,
  buildVersionLabel,
} from "@/components/telemetry/telemetry-bar";
import type { BuildInfo } from "@/domain/site/build-info";

/*
 * The rendering decision, tested apart from the resolution of the facts.
 *
 * `resolveBuildInfo` owns which environment this is; these four functions own what gets
 * printed about it. Each has a branch a local run cannot reach — production is the
 * production build's shape, a deployment id only exists on Vercel, and a null stamp is
 * the only shape the drop-on-mobile CSS can be tested against — so testing them by
 * rendering the page would leave the deploy's actual output as the untested case.
 *
 * ## Why the segments are three functions and not one string
 *
 * Because the stamp is dropped on a phone and the other two are not. A single composed
 * string would have to be split apart again at render time to hide part of it, and the
 * version is the one segment that must survive that on every surface. Testing the
 * segments separately is also the only way to state the production rule as a rule:
 * "the environment is null" is an assertion; "the string does not contain the word
 * production" is a reading.
 */

const base: BuildInfo = {
  environment: "production",
  release: "0.14.0",
  stamp: "20261003-1204Z",
  deploymentId: "dpl_7Gw5ZMBpQA8h9GF832KGp7nwbuh3",
};

describe("buildEnvironmentLabel", () => {
  /*
    The rule, stated as the reader sees it. Production omits the environment because
    every other reader is on it and the word is noise on every load — it is the one
    value here that is *less* useful the more often it appears.
   */
  it("is nothing on production, and the name everywhere else", () => {
    expect(buildEnvironmentLabel({ ...base, environment: "production" })).toBeNull();
    expect(buildEnvironmentLabel({ ...base, environment: "preview" })).toBe("preview");
    expect(buildEnvironmentLabel({ ...base, environment: "development" })).toBe("development");
    expect(buildEnvironmentLabel({ ...base, environment: "local" })).toBe("local");
  });

  /*
    Dropping the environment must not take anything with it. A version readout whose
    production shape is `v0.14.0` still has to name the release, and that is a separate
    function precisely so this cannot be the branch that loses it.
   */
  it("leaves the version to render either way", () => {
    expect(buildVersionLabel({ ...base, environment: "production" })).toBe("v0.14.0");
    expect(buildVersionLabel({ ...base, environment: "preview" })).toBe("v0.14.0");
  });
});

describe("buildVersionLabel", () => {
  it("prefixes the release, on every environment", () => {
    for (const environment of ["production", "preview", "development", "local"] as const) {
      expect(buildVersionLabel({ ...base, environment })).toBe("v0.14.0");
    }
  });

  it("tracks whatever package.json says rather than a number of its own", () => {
    // No literal version anywhere in the component: the release automation writes the
    // number into `package.json` and this is the only path from there to the screen.
    expect(buildVersionLabel({ ...base, release: "9.9.9" })).toBe("v9.9.9");
    expect(buildVersionLabel({ ...base, release: "0.0.0-dev.1" })).toBe("v0.0.0-dev.1");
  });
});

describe("buildStampLabel", () => {
  it("is the build's own stamp, bare", () => {
    expect(buildStampLabel(base)).toBe("20261003-1204Z");
  });

  /*
    No leading separator. The separator belongs to the layout, and a string that
    carries its own `· ` forces the wrapper to strip it back off for the narrow case
    where the stamp is the only thing dropped — which is a trim that eventually forgets
    the boundary and prints a dangling `·` next to a version.
   */
  it("never carries its own separator", () => {
    expect(buildStampLabel(base)).not.toMatch(/^[·\s]/);
    expect(buildStampLabel({ ...base, stamp: null })).toBeNull();
  });
});

describe("buildTooltip", () => {
  it("carries the deployment id when there is one, because that is what a bug report needs", () => {
    expect(buildTooltip(base, "This deployment was built at")).toBe(
      "This deployment was built at · dpl_7Gw5ZMBpQA8h9GF832KGp7nwbuh3",
    );
  });

  /*
    An empty tooltip is a hover target that promises something and gives nothing, so
    the caption is the floor rather than the default.
   */
  it("is the caption alone when there is no deployment id", () => {
    expect(buildTooltip({ ...base, deploymentId: null }, "This deployment was built at")).toBe(
      "This deployment was built at",
    );
  });
});