import { describe, expect, it } from "vitest";

import { parseTermCsv } from "@/server/services/content-import";

const header =
  "external_key,english,ukrainian,part_of_speech,difficulty,category_slug,definition_en,definition_uk,example,context_note,source_url,source_title";

describe("term CSV import", () => {
  it("creates only unverified drafts", () => {
    const csv = `${header}\nmedevac,medical evacuation,медична евакуація,noun,2,tactical-medicine,Movement for medical care,Переміщення для медичної допомоги,,,https://example.gov/medevac,Public glossary`;
    const result = parseTermCsv(csv);
    expect(result.errors).toEqual([]);
    expect(result.rows[0].data).toMatchObject({
      status: "DRAFT",
      origin: "CSV_IMPORT",
      source: { verificationStatus: "UNVERIFIED" },
    });
    expect(result.rows[0].data.variants).toEqual(
      expect.arrayContaining([expect.objectContaining({ isPrimary: true })]),
    );
  });

  it("returns row-level errors without approving invalid content", () => {
    const csv = `${header}\nbad,term,термін,noun,8,general,Definition,Визначення,,,not-a-url,Unknown`;
    const result = parseTermCsv(csv);
    expect(result.rows).toEqual([]);
    expect(result.errors[0].row).toBe(2);
    expect(result.errors[0].fields).toHaveProperty("difficulty");
    expect(result.errors[0].fields).toHaveProperty("source_url");
  });

  it("rejects files without the required contract", () => {
    expect(() => parseTermCsv("english,ukrainian\nterm,термін")).toThrowError(
      expect.objectContaining({ code: "MISSING_IMPORT_HEADERS" }),
    );
  });
});
