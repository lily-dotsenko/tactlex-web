import { describe, expect, it } from "vitest";

import {
  ContentWorkflowError,
  assertContentTransition,
  contentCompleteness,
} from "@/server/services/content-workflow";

function completeTerm(status = "DRAFT") {
  return {
    status,
    currentRevision: 2,
    variants: [
      { locale: "EN", kind: "PRIMARY", isPrimary: true },
      { locale: "UK", kind: "PRIMARY", isPrimary: true },
    ],
    definitions: [
      { locale: "EN", shortDefinition: "A concise definition" },
      { locale: "UK", shortDefinition: "Коротке визначення" },
    ],
    categories: [{ categoryId: "category", isPrimary: true }],
    sources: [
      {
        verificationStatus: "VERIFIED",
        checkedAt: new Date(),
        checkedById: "reviewer",
        source: { url: "https://example.gov/term" },
      },
    ],
    reviews: [{ status: "APPROVED", revisionNumber: 2 }],
  };
}

describe("content workflow", () => {
  it("reports publication completeness", () => {
    expect(contentCompleteness(completeTerm()).complete).toBe(true);
  });

  it("uses the persisted isPrimary flags rather than kind alone", () => {
    const term = completeTerm();
    term.variants[0].isPrimary = false;
    expect(contentCompleteness(term)).toMatchObject({
      complete: false,
      checks: { primaryEnglish: false },
    });
  });

  it("keeps demonstration records out of the review and publication workflow", () => {
    const term = completeTerm();
    term.isDemo = true;
    expect(contentCompleteness(term)).toMatchObject({
      complete: false,
      checks: { publishableRecord: false },
    });
  });

  it("rejects skipped transitions", () => {
    expect(() => assertContentTransition(completeTerm("DRAFT"), "PUBLISHED")).toThrow(
      ContentWorkflowError,
    );
  });

  it("requires a new revision after changes are requested", () => {
    const term = completeTerm();
    term.reviews = [{ status: "CHANGES_REQUESTED", revisionNumber: 2 }];
    expect(() => assertContentTransition(term, "IN_REVIEW")).toThrowError(
      expect.objectContaining({ code: "REVISION_REQUIRED" }),
    );
  });

  it("requires approval for the current revision", () => {
    const term = completeTerm("APPROVED");
    term.reviews[0].revisionNumber = 1;
    expect(() => assertContentTransition(term, "PUBLISHED")).toThrowError(
      expect.objectContaining({ code: "REVISION_NOT_APPROVED" }),
    );
  });
});
