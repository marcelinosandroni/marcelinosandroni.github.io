import { describe, expect, it } from "vitest";

import {
  DEFAULT_RESUME_TEMPLATE,
  RESUME_TEMPLATE_IDS,
  isResumeTemplateId,
  resolveResumeTemplateId,
} from "@/infrastructure/pdf/resume-template-registry";

describe("the template registry", () => {
  it("keeps CLEAN as the default", () => {
    expect(DEFAULT_RESUME_TEMPLATE).toBe("CLEAN");
  });

  it("offers CLEAN and DETAILED", () => {
    expect(RESUME_TEMPLATE_IDS).toEqual(["CLEAN", "DETAILED"]);
  });

  it("resolves a current name to itself", () => {
    expect(resolveResumeTemplateId("DETAILED")).toBe("DETAILED");
    expect(resolveResumeTemplateId("CLEAN")).toBe("CLEAN");
  });

  it("defaults when nothing was requested", () => {
    expect(resolveResumeTemplateId(null)).toBe("CLEAN");
  });

  it("still accepts REFERENCE, the name it used to have", () => {
    /*
      A recruiter may have this in a bookmark or in a sent message. Answering
      `invalid_template` makes them conclude the document is gone rather than
      renamed, so the old name resolves to the new one — to the *canonical* value,
      so the cache signature, the filename and the label cannot disagree about
      which document was rendered.
    */
    expect(resolveResumeTemplateId("REFERENCE")).toBe("DETAILED");
  });

  it("refuses an unknown name rather than silently serving the default", () => {
    /*
      Answering a request for a document that does not exist with a different
      document is a wrong answer that looks like a success.
    */
    expect(resolveResumeTemplateId("FANCY")).toBeNull();
  });

  it("does not treat REFERENCE as a current name any more", () => {
    expect(isResumeTemplateId("REFERENCE")).toBe(false);
    expect(isResumeTemplateId("DETAILED")).toBe(true);
  });
});