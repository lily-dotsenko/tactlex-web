import { parse } from "csv-parse/sync";
import { z } from "zod";

import { normalizeAnswer } from "@/lib/validation/answer";
import { DomainError } from "@/server/services/errors";

const importRowSchema = z
  .object({
    external_key: z.string().trim().min(1).max(100),
    english: z.string().trim().min(1).max(200),
    ukrainian: z.string().trim().min(1).max(200),
    part_of_speech: z.string().trim().min(1).max(40),
    difficulty: z.coerce.number().int().min(1).max(5),
    category_slug: z.string().trim().min(1).max(80),
    definition_en: z.string().trim().min(1).max(500),
    definition_uk: z.string().trim().min(1).max(500),
    example: z.string().trim().max(500).default(""),
    context_note: z.string().trim().max(500).default(""),
    example_en: z.string().trim().max(500).optional().default(""),
    example_uk: z.string().trim().max(500).optional().default(""),
    context_note_en: z.string().trim().max(500).optional().default(""),
    context_note_uk: z.string().trim().max(500).optional().default(""),
    source_url: z.url().max(2_000),
    source_title: z.string().trim().min(1).max(300),
  })
  .strict();

const REQUIRED_HEADERS = Object.freeze([
  "external_key",
  "english",
  "ukrainian",
  "part_of_speech",
  "difficulty",
  "category_slug",
  "definition_en",
  "definition_uk",
  "example",
  "context_note",
  "source_url",
  "source_title",
]);

const PARTS_OF_SPEECH = new Set([
  "NOUN",
  "VERB",
  "ADJECTIVE",
  "ADVERB",
  "PHRASE",
  "ABBREVIATION",
  "PROPER_NOUN",
  "OTHER",
]);

function normalizePartOfSpeech(value) {
  const normalized = value.trim().replaceAll("-", "_").replaceAll(" ", "_").toUpperCase();
  return PARTS_OF_SPEECH.has(normalized) ? normalized : "OTHER";
}

function toDraft(row) {
  const legacyExampleEn = row.example
    .toLocaleLowerCase("en-US")
    .includes(row.english.toLocaleLowerCase("en-US"))
    ? row.example
    : "";
  const legacyExampleUk = row.example
    .toLocaleLowerCase("uk-UA")
    .includes(row.ukrainian.toLocaleLowerCase("uk-UA"))
    ? row.example
    : "";
  return {
    externalKey: row.external_key,
    status: "DRAFT",
    origin: "CSV_IMPORT",
    partOfSpeech: normalizePartOfSpeech(row.part_of_speech),
    difficulty: row.difficulty,
    categorySlug: row.category_slug,
    variants: [
      {
        locale: "EN",
        kind: "PRIMARY",
        value: row.english,
        normalizedValue: normalizeAnswer(row.english, "en"),
        isPrimary: true,
        isAcceptedAnswer: true,
      },
      {
        locale: "UK",
        kind: "PRIMARY",
        value: row.ukrainian,
        normalizedValue: normalizeAnswer(row.ukrainian, "uk"),
        isPrimary: true,
        isAcceptedAnswer: true,
      },
    ],
    definitions: [
      {
        locale: "EN",
        shortDefinition: row.definition_en,
        example: row.example || null,
        contextNote: row.context_note || null,
      },
      {
        locale: "UK",
        shortDefinition: row.definition_uk,
        example: row.example || null,
        contextNote: row.context_note || null,
      },
    ],
    contextDefinitions: [
      {
        categorySlug: row.category_slug,
        locale: "EN",
        shortDefinition: row.definition_en,
        example: row.example_en || legacyExampleEn || null,
        contextNote: row.context_note_en || row.context_note || null,
      },
      {
        categorySlug: row.category_slug,
        locale: "UK",
        shortDefinition: row.definition_uk,
        example: row.example_uk || legacyExampleUk || null,
        contextNote: row.context_note_uk || row.context_note || null,
      },
    ],
    source: {
      exactUrl: row.source_url,
      title: row.source_title,
      sourceType: "OTHER",
      verificationStatus: "UNVERIFIED",
      isPrimary: true,
    },
  };
}

export function parseTermRows(records, { maxRows = 500 } = {}) {
  if (!Array.isArray(records)) {
    throw new DomainError("INVALID_IMPORT", "JSON-імпорт має містити масив рядків.", 400);
  }
  if (records.length > maxRows) {
    throw new DomainError(
      "TOO_MANY_IMPORT_ROWS",
      `Один імпорт може містити не більше ${maxRows} рядків.`,
      413,
    );
  }

  const rows = [];
  const errors = [];
  const externalKeys = new Set();

  records.forEach((record, index) => {
    const result = importRowSchema.safeParse(record);
    if (!result.success) {
      errors.push({ row: index + 1, fields: result.error.flatten().fieldErrors });
      return;
    }
    if (externalKeys.has(result.data.external_key)) {
      errors.push({
        row: index + 1,
        fields: { external_key: ["Ключ повторюється в цьому файлі."] },
      });
      return;
    }
    externalKeys.add(result.data.external_key);
    rows.push({ row: index + 1, data: toDraft(result.data) });
  });

  return { rows, errors, total: records.length };
}

export function parseTermCsv(csvText, { maxRows = 500, maxBytes = 512 * 1024 } = {}) {
  if (typeof csvText !== "string") {
    throw new DomainError("INVALID_IMPORT", "CSV-файл неможливо прочитати.", 400);
  }
  if (Buffer.byteLength(csvText, "utf8") > maxBytes) {
    throw new DomainError("IMPORT_TOO_LARGE", "CSV-файл перевищує дозволений розмір.", 413);
  }

  let records;
  try {
    records = parse(csvText, {
      bom: true,
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: false,
      max_record_size: 16 * 1024,
    });
  } catch (error) {
    throw new DomainError("INVALID_CSV", `CSV має помилку формату: ${error.message}`, 422);
  }

  if (records.length > maxRows) {
    throw new DomainError(
      "TOO_MANY_IMPORT_ROWS",
      `Один імпорт може містити не більше ${maxRows} рядків.`,
      413,
    );
  }

  const presentHeaders = new Set(records.length ? Object.keys(records[0]) : []);
  const missingHeaders = REQUIRED_HEADERS.filter((header) => !presentHeaders.has(header));
  if (missingHeaders.length) {
    throw new DomainError(
      "MISSING_IMPORT_HEADERS",
      "CSV не містить усіх обов’язкових колонок.",
      422,
      { headers: missingHeaders },
    );
  }

  const result = parseTermRows(records, { maxRows });
  return {
    ...result,
    rows: result.rows.map((row) => ({ ...row, row: row.row + 1 })),
    errors: result.errors.map((error) => ({ ...error, row: error.row + 1 })),
  };
}
