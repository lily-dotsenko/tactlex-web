export const CONTENT_TRANSITIONS = Object.freeze({
  DRAFT: ["IN_REVIEW"],
  IN_REVIEW: ["APPROVED", "DRAFT"],
  APPROVED: ["PUBLISHED", "DRAFT"],
  PUBLISHED: ["ARCHIVED", "DRAFT"],
  ARCHIVED: [],
});

function localized(items, locale) {
  return items?.some((item) => item.locale === locale && Boolean(item.shortDefinition?.trim()));
}

export function contentCompleteness(term) {
  const verifiedSources =
    term.sources?.filter(
      (item) =>
        item.verificationStatus === "VERIFIED" &&
        Boolean(item.checkedAt) &&
        Boolean(item.checkedById) &&
        /^https?:\/\//u.test(item.source?.exactUrl ?? item.source?.url ?? item.url ?? ""),
    ) ?? [];
  const checks = {
    publishableRecord: term.isDemo !== true,
    primaryEnglish: term.variants?.some(
      (item) => item.locale === "EN" && item.kind === "PRIMARY" && item.isPrimary,
    ),
    primaryUkrainian: term.variants?.some(
      (item) => item.locale === "UK" && item.kind === "PRIMARY" && item.isPrimary,
    ),
    englishDefinition: localized(term.definitions, "EN"),
    ukrainianDefinition: localized(term.definitions, "UK"),
    category: term.categories?.some((item) => item.isPrimary),
    verifiedSource: verifiedSources.length > 0,
  };

  return {
    complete: Object.values(checks).every(Boolean),
    checks,
    missing: Object.entries(checks)
      .filter(([, present]) => !present)
      .map(([name]) => name),
  };
}

export function assertContentTransition(term, nextStatus) {
  const allowed = CONTENT_TRANSITIONS[term.status] ?? [];
  if (!allowed.includes(nextStatus)) {
    throw new ContentWorkflowError(
      "INVALID_CONTENT_TRANSITION",
      `Cannot move content from ${term.status} to ${nextStatus}`,
    );
  }

  if (
    nextStatus === "IN_REVIEW" &&
    term.reviews?.some(
      (review) =>
        ["CHANGES_REQUESTED", "REJECTED"].includes(review.status) &&
        review.revisionNumber === term.currentRevision,
    )
  ) {
    throw new ContentWorkflowError(
      "REVISION_REQUIRED",
      "A rejected revision must be updated before it can be reviewed again",
    );
  }

  if (["IN_REVIEW", "APPROVED", "PUBLISHED"].includes(nextStatus)) {
    const completeness = contentCompleteness(term);
    if (!completeness.complete) {
      throw new ContentWorkflowError(
        "INCOMPLETE_CONTENT",
        "The term is missing required bilingual content or a verified source",
        completeness.missing,
      );
    }
  }

  if (
    nextStatus === "PUBLISHED" &&
    !term.reviews?.some(
      (review) => review.status === "APPROVED" && review.revisionNumber === term.currentRevision,
    )
  ) {
    throw new ContentWorkflowError(
      "REVISION_NOT_APPROVED",
      "The current revision has not been approved",
    );
  }

  return true;
}

export class ContentWorkflowError extends Error {
  constructor(code, message, details = []) {
    super(message);
    this.name = "ContentWorkflowError";
    this.code = code;
    this.details = details;
  }
}
