import { describe, expect, it } from "vitest";

import {
  audioMetadataSchema,
  importCommitSchema,
  termCreateSchema,
  termUpdateSchema,
  userAdminUpdateSchema,
} from "@/server/services/admin-content-validation";

const categoryId = "11111111-1111-4111-8111-111111111111";

describe("admin content validation", () => {
  it("accepts exact source verification metadata but not client audit fields", () => {
    const term = termCreateSchema.parse({
      slug: "medical-evacuation",
      partOfSpeech: "NOUN",
      difficulty: 2,
      variants: [{ locale: "EN", kind: "PRIMARY", value: "medical evacuation", isPrimary: true }],
      categories: [{ categoryId, isPrimary: true }],
      sources: [
        {
          exactUrl: "https://example.gov/medical-evacuation",
          title: "Public glossary",
          sourceType: "OFFICIAL_UKRAINIAN",
          verificationStatus: "VERIFIED",
          isPrimary: true,
        },
      ],
    });

    expect(term.status).toBeUndefined();
    expect(term.sources[0]).toMatchObject({
      exactUrl: "https://example.gov/medical-evacuation",
      verificationStatus: "VERIFIED",
    });
    expect(() =>
      termCreateSchema.parse({
        slug: "unsafe",
        partOfSpeech: "NOUN",
        difficulty: 1,
        status: "PUBLISHED",
      }),
    ).toThrow();
  });

  it("does not apply create defaults to a partial revision", () => {
    expect(termUpdateSchema.parse({ changeNote: "Clarify the definition" })).toEqual({
      changeNote: "Clarify the definition",
    });
  });

  it("requires the preview checksum when committing an import", () => {
    expect(
      importCommitSchema.parse({
        format: "json",
        fileName: "terms.json",
        content: [],
        expectedChecksum: "a".repeat(64),
      }),
    ).toMatchObject({ format: "json", expectedChecksum: "a".repeat(64) });
  });

  it("prevents removing the base USER role", () => {
    expect(() => userAdminUpdateSchema.parse({ roleCodes: ["ADMIN"] })).toThrow();
    expect(userAdminUpdateSchema.parse({ roleCodes: ["USER", "ADMIN"] })).toEqual({
      roleCodes: ["USER", "ADMIN"],
    });
  });

  it("marks synthetic audio explicitly", () => {
    expect(audioMetadataSchema.parse({ kind: "SYNTHETIC" })).toMatchObject({
      kind: "SYNTHETIC",
      locale: "EN",
      isPrimary: false,
    });
  });
});
