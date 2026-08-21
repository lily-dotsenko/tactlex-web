-- Preserve the reviewed publication workflow while allowing an explicitly
-- labelled, audited beta publication requested by an administrator.
CREATE OR REPLACE FUNCTION enforce_term_workflow() RETURNS trigger AS $$
DECLARE
  transition_allowed boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'DRAFT' THEN
      RAISE EXCEPTION 'new terms must start as drafts';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  transition_allowed := CASE OLD.status
    WHEN 'DRAFT' THEN NEW.status = 'IN_REVIEW' OR (NEW.status = 'PUBLISHED' AND NEW."is_beta" = true)
    WHEN 'IN_REVIEW' THEN NEW.status IN ('DRAFT', 'APPROVED') OR (NEW.status = 'PUBLISHED' AND NEW."is_beta" = true)
    WHEN 'APPROVED' THEN NEW.status IN ('DRAFT', 'PUBLISHED')
    WHEN 'PUBLISHED' THEN NEW.status IN ('DRAFT', 'ARCHIVED')
    ELSE false
  END;
  IF NOT transition_allowed THEN
    RAISE EXCEPTION 'invalid content transition from % to %', OLD.status, NEW.status;
  END IF;

  IF NEW.status = 'PUBLISHED' AND NEW."is_beta" = false THEN
    IF NEW."is_demo" = true
      OR NOT EXISTS (
        SELECT 1 FROM "term_variants" v
        WHERE v."term_id" = NEW.id AND v.locale = 'EN' AND v."is_primary" = true
      )
      OR NOT EXISTS (
        SELECT 1 FROM "term_variants" v
        WHERE v."term_id" = NEW.id AND v.locale = 'UK' AND v."is_primary" = true
      )
      OR NOT EXISTS (
        SELECT 1 FROM "term_definitions" d
        WHERE d."term_id" = NEW.id AND d.locale = 'EN' AND d."short_definition" IS NOT NULL
      )
      OR NOT EXISTS (
        SELECT 1 FROM "term_definitions" d
        WHERE d."term_id" = NEW.id AND d.locale = 'UK' AND d."short_definition" IS NOT NULL
      )
      OR NOT EXISTS (SELECT 1 FROM "term_categories" c WHERE c."term_id" = NEW.id)
      OR NOT EXISTS (
        SELECT 1 FROM "term_sources" ts
        JOIN "sources" source ON source.id = ts."source_id"
        WHERE ts."term_id" = NEW.id AND ts."verification_status" = 'VERIFIED'
          AND ts."checked_at" IS NOT NULL AND ts."checked_by_id" IS NOT NULL
          AND source."exact_url" ~ '^https?://'
      )
      OR NOT EXISTS (
        SELECT 1 FROM "content_reviews" r
        WHERE r."term_id" = NEW.id AND r."revision_number" = NEW."current_revision"
          AND r.status = 'APPROVED'
      )
    THEN
      RAISE EXCEPTION 'term is not eligible for publication';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
