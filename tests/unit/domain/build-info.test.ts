import { describe, expect, it } from "vitest";

import { resolveBuildInfo, resolveDeploymentEnvironment } from "@/domain/site/build-info";

/*
 * The precedence is the whole claim, and it is the part a real deployment never
 * exercises: a contributor runs this on a laptop, where every variable is absent, and
 * production runs it with all of them present. Every intermediate shape — a preview
 * with the access toggle off, a blank variable in the dashboard, an unrecognised
 * value from a future platform — is a case only a test can reach, and each one is a
 * place a footer could lie.
 */

const onVercel = { VERCEL: "1", VERCEL_ENV: "production" };

describe("which surface this is", () => {
  it("reads the environment name Vercel reports", () => {
    expect(resolveDeploymentEnvironment({ VERCEL: "1", VERCEL_ENV: "production" })).toBe("production");
    expect(resolveDeploymentEnvironment({ VERCEL: "1", VERCEL_ENV: "preview" })).toBe("preview");
    expect(resolveDeploymentEnvironment({ VERCEL: "1", VERCEL_ENV: "development" })).toBe("development");
  });

  it("calls anything without Vercel's variables local", () => {
    // A laptop. Both `npm run dev` and `npm run start`, and neither is production.
    expect(resolveDeploymentEnvironment({})).toBe("local");
  });

  /*
    The failure this module exists to avoid. `NODE_ENV` is deliberately not an input
    at all, so there is no code path on which a preview can read as production. This
    test is the guard on that absence: someone adding `NODE_ENV` back to
    `BuildEnvironment` would have to delete or rewrite it, which is the moment to be
    asked why.
   */
  it("has no way to be told it is production by NODE_ENV", () => {
    expect(resolveDeploymentEnvironment({})).not.toBe("production");
    expect(resolveDeploymentEnvironment({ VERCEL: "1" })).not.toBe("production");
  });

  it("trusts VERCEL over VERCEL_ENV, because the docs say the variables can be off", () => {
    // Project with "access to system environment variables" disabled: `VERCEL_ENV`
    // absent, `VERCEL` present. Still not production.
    expect(resolveDeploymentEnvironment({ VERCEL: "1" })).toBe("local");
    expect(resolveDeploymentEnvironment({ VERCEL: "1", VERCEL_ENV: "" })).toBe("local");
  });

  it("says local rather than guessing when the value is one it does not know", () => {
    // A custom environment name, or a future one. "Local" says "not a surface I
    // recognise", which is the truth; guessing a word here would be the one place a
    // reader acts on it.
    expect(resolveDeploymentEnvironment({ VERCEL: "1", VERCEL_ENV: "staging" })).toBe("local");
    expect(resolveDeploymentEnvironment({ VERCEL: "1", VERCEL_ENV: "" })).toBe("local");
  });
});

describe("resolving the readout", () => {
  it("keeps everything the platform reported", () => {
    expect(
      resolveBuildInfo(
        {
          VERCEL: "1",
          VERCEL_ENV: "production",
          VERCEL_DEPLOYMENT_ID: "dpl_7Gw5ZMBpQA8h9GF832KGp7nwbuh3",
          NEXT_PUBLIC_BUILD_STAMP: "20261003-1204Z",
        },
        "0.14.0",
      ),
    ).toEqual({
      environment: "production",
      release: "0.14.0",
      stamp: "20261003-1204Z",
      deploymentId: "dpl_7Gw5ZMBpQA8h9GF832KGp7nwbuh3",
    });
  });

  /*
    A missing value stays missing. Every environment source has a different idea of
    what "not set" means — absent, `""`, a bare prefix — and all three have to produce
    the same answer, because the alternative is a footer printing `dpl_` or an empty
    tooltip that promises something and gives nothing.
   */
  it("turns every flavour of absent into null rather than an empty string", () => {
    expect(resolveBuildInfo({}, "0.14.0")).toEqual({
      environment: "local",
      release: "0.14.0",
      stamp: null,
      deploymentId: null,
    });

    expect(
      resolveBuildInfo({ VERCEL_DEPLOYMENT_ID: "", NEXT_PUBLIC_BUILD_STAMP: "" }, "0.14.0"),
    ).toMatchObject({ stamp: null, deploymentId: null });

    expect(
      resolveBuildInfo({ VERCEL_DEPLOYMENT_ID: "   ", NEXT_PUBLIC_BUILD_STAMP: "\t" }, "0.14.0"),
    ).toMatchObject({ stamp: null, deploymentId: null });
  });

  it("separates the build stamp from the deployment id, because they answer different questions", () => {
    /*
      The reason the readout is not keyed on the commit. Two builds of one commit are
      two deployments: same code, same version, different stamps and different ids.
      This is the shape that has to be representable, so it is asserted.
     */
    const first = resolveBuildInfo(
      { ...onVercel, NEXT_PUBLIC_BUILD_STAMP: "20261003-1204Z", VERCEL_DEPLOYMENT_ID: "dpl_one" },
      "0.14.0",
    );
    const rebuilt = resolveBuildInfo(
      { ...onVercel, NEXT_PUBLIC_BUILD_STAMP: "20261003-1331Z", VERCEL_DEPLOYMENT_ID: "dpl_two" },
      "0.14.0",
    );

    expect(rebuilt.release).toBe(first.release);
    expect(rebuilt.stamp).not.toBe(first.stamp);
    expect(rebuilt.deploymentId).not.toBe(first.deploymentId);
  });
});