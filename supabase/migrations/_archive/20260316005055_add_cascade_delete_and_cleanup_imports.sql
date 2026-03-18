/*
  # Cascade delete leads and cleanup orphan import_history

  1. Changes
    - Add ON DELETE CASCADE on leads.import_id foreign key so deleting an import_history row removes all its leads
    - Create a function + trigger to delete import_history rows that have no more leads after a lead is deleted
    - This ensures a full cleanup: deleting leads removes all DB traces

  2. Notes
    - Safe migration: drops and recreates only the FK constraint, no data loss
    - Trigger fires AFTER DELETE on leads
*/

ALTER TABLE leads
  DROP CONSTRAINT IF EXISTS leads_import_id_fkey;

ALTER TABLE leads
  ADD CONSTRAINT leads_import_id_fkey
  FOREIGN KEY (import_id)
  REFERENCES import_history(id)
  ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION cleanup_orphan_import_history()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM import_history
  WHERE id = OLD.import_id
    AND NOT EXISTS (
      SELECT 1 FROM leads WHERE import_id = OLD.import_id
    );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cleanup_import_history ON leads;

CREATE TRIGGER trg_cleanup_import_history
AFTER DELETE ON leads
FOR EACH ROW
EXECUTE FUNCTION cleanup_orphan_import_history();
