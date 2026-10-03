import { describe, expect, it } from "vitest";

import { buildLabel, buildTooltip } from "@/components/telemetry/telemetry-bar";
import type { BuildInfo } from "@/domain/site/build-info";

/*
 * The rendering decision, tested apart from the resolution of the facts.
 *
 * `resolveBuildInfo` owns which environment this is; these two functions own what gets
 * printed about it. Both have a branch that a local run and a local e2e run can never
 * reach — production is the production build's shape, and a deployment id only exists
 * on Vercel — so testing them by rendering the page would leave the deploy's actual
 * output as the only untested case.
 */

const base: BuildInfo = {
  environment: "production",
  release: "0.14.0",
  stamp: "20261003-1204Z",
  deploymentId: "dpl_7Gw5ZMBpQA8h9GF832KGp7nwbuh3",
};

describe("buildLabel", () => {
  /*
    The rule, stated as the reader sees it. Production omits the environment because
    every other reader is on it and the word is noise on every load — it is the one
    value here that is *less* useful the more often it appears.
   */
  it("names the environment only when it is not production", () => {
    expect(buildLabel({ ...base, environment: "production" })).toBe("v0.14.0 · 20261003-1204Z");
    expect(buildLabel({ ...base, environment: "preview" })).toBe("preview v0.14.0 · 20261003-1204Z");
    expect(buildLabel({ ...base, environment: "development" })).toBe("development v0.14.0 · 20261003-1204Z");
    expect(buildLabel({ ...base, environment: "local" })).toBe("local v0.14.0 · 20261003-1204Z");
  });

  /*
    Dropping the environment is not the same as dropping the version. A branch that
    returned early on production would satisfy the test above and ship a footer with no
    number on it at all, which is the failure this asserts against.
   */
  it("keeps the version when the environment is dropped", () => {
    const label = buildLabel({ ...base, environment: "production" });

    expect(label).toContain("v0.14.0");
    expect(label.startsWith("v")).toBe(true);
    expect(label).not.toContain("· ·");
  });

  it("omits the stamp rather than printing a separator with nothing after it", () => {
    expect(buildLabel({ ...base, stamp: null })).toBe("v0.14.0");
    expect(buildLabel({ ...base, environment: "preview", stamp: null })).toBe("preview v0.14.0");

    // The dangling `·` is the specific artefact of handling null in the wrong order.
    expect(buildLabel({ ...base, stamp: null })).not.toContain("·");
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