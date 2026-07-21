import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const ukrainian = JSON.parse(fs.readFileSync(path.join(root, "messages", "uk.json"), "utf8"));
const english = JSON.parse(fs.readFileSync(path.join(root, "messages", "en.json"), "utf8"));

function flattenKeys(value, prefix = "") {
  return Object.entries(value).flatMap(([key, item]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    return item && typeof item === "object" ? flattenKeys(item, fullKey) : [fullKey];
  });
}

describe("bilingual messages", () => {
  it("keeps Ukrainian and English message keys aligned", () => {
    expect(flattenKeys(ukrainian).sort()).toEqual(flattenKeys(english).sort());
  });

  it("does not ship empty translated strings", () => {
    for (const locale of [ukrainian, english]) {
      for (const key of flattenKeys(locale)) {
        const value = key.split(".").reduce((current, segment) => current[segment], locale);
        expect(value.trim(), key).not.toBe("");
      }
    }
  });
});
