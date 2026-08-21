CREATE OR REPLACE FUNCTION enforce_lesson_publication() RETURNS trigger AS $$
DECLARE
  term_count integer;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'DRAFT' THEN
      RAISE EXCEPTION 'new lessons must start as drafts';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status = 'PUBLISHED' AND OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT count(*) INTO term_count FROM "lesson_terms" WHERE "lesson_id" = NEW.id;
    IF term_count < 6 OR term_count > 12 THEN
      RAISE EXCEPTION 'published lesson must contain 6 to 12 terms';
    END IF;
    IF EXISTS (
      SELECT 1 FROM "lesson_terms" lt JOIN "terms" t ON t.id = lt."term_id"
      WHERE lt."lesson_id" = NEW.id AND t.status <> 'PUBLISHED'
    ) THEN
      RAISE EXCEPTION 'published lesson may contain only published terms';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
