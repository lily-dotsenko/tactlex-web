# Content guidelines

## Editorial standard

TactLex teaches language, not tactics. Definitions are short, neutral and written in our own words. Do not paste substantial source passages. Never add classified, sensitive, current operational or weapon-employment instructions. TCCC terminology must include a visible note that the product does not replace certified training.

Every publishable term needs:

- one primary EN and one primary UA variant;
- explicitly approved synonyms, if any;
- part of speech, stored difficulty and its public CEFR level;
- short definitions in both languages;
- usage example and context note;
- at least one category;
- at least one verified source with exact URL and verification date;
- reviewer and publication metadata;
- human audio or an explicit TTS fallback state.

## Sources

Preferred order:

1. TCCC Ukraine and Deployed Medicine for public medical terminology;
2. official public documents of Ukrainian authorities;
3. NATO Terminology Database and AAP-6;
4. DoD Dictionary and official public doctrine;
5. reviewed English–Ukrainian military dictionaries.

A source record stores canonical URL, title, publisher, access/verification date and verification status. A link alone is not an approval decision.

## Workflow

`DRAFT → IN_REVIEW → APPROVED → PUBLISHED → ARCHIVED`

- Imports and machine-assisted entries always start as `DRAFT`.
- Moving to `IN_REVIEW` requires structurally complete bilingual data.
- `APPROVED` requires an admin review and verified source.
- `PUBLISHED` requires the approved revision to remain complete.
- Editing learning-critical fields of published content creates a revision and returns the term to review rather than silently changing accepted answers.
- `ARCHIVED` removes content from new lessons/search while retaining historical references.

Skipped transitions are rejected. A review decision records author, timestamp and note. Content revisions and reviews are immutable.

## Import

CSV import is bounded, validates headers and every row, reports row-level errors, and commits only valid rows selected by the admin. Imported translations remain visibly `DRAFT`; the importer never infers approval or publication. Stable external keys permit safe repeat imports.

## Demo content

The versioned release contains 556 term records in 71 lessons; no record remains dictionary-only. The 256 supplemental records are grouped into 41 shorter lessons of 6–10 related terms, each with a sourced optional fact and a text-only quiz. Imports remain drafts; a temporary owner-authorized beta release keeps unreviewed records visibly marked and never fabricates reviewer metadata. Normal approval and publication still require a subject-matter expert.

## Reports

Users can report translation, definition, audio, source or other issues. A report never directly changes content. An admin reviews it, records a resolution and opens a revision when needed.
