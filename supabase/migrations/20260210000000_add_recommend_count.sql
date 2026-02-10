ALTER TABLE documents ADD COLUMN recommend_count integer NOT NULL DEFAULT 0;

UPDATE documents d
SET recommend_count = (
  SELECT COUNT(*) FROM recommends_on_documents r WHERE r.document = d.uri
);

CREATE OR REPLACE FUNCTION update_recommend_count() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE documents SET recommend_count = recommend_count + 1
    WHERE uri = NEW.document;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE documents SET recommend_count = recommend_count - 1
    WHERE uri = OLD.document;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_recommend_count
AFTER INSERT OR DELETE ON recommends_on_documents
FOR EACH ROW EXECUTE FUNCTION update_recommend_count();
