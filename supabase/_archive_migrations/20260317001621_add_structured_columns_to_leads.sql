/*
  # Add structured columns to leads table

  ## Summary
  This migration adds proper typed columns to the `leads` table to replace exclusive reliance
  on the flexible `data` JSONB column. It also enriches the `import_history` table with
  audit and deduplication statistics, and adds source tracking fields.

  ## Changes to `leads` table
  - `prenom` (text, nullable) — first name as a real column
  - `nom` (text, nullable) — last name as a real column
  - `email` (text, nullable) — email address, normalized (lowercase), used for deduplication
  - `telephone` (text, nullable) — phone in canonical E.164 format, used for deduplication
  - `source` (text, nullable, default 'csv_import') — origin of the lead
  - `source_file` (text, nullable) — original CSV filename for traceability

  ## Changes to `import_history` table
  - `new_leads_count` (integer, default 0) — leads actually inserted
  - `duplicates_count` (integer, default 0) — leads skipped or updated as duplicates
  - `errors_count` (integer, default 0) — rows rejected due to validation errors
  - `import_mode` (text, default 'ignore') — import strategy used: ignore | update | force
  - `source_file` (text, nullable) — mirrors leads.source_file for the history row
  - `imported_by` (uuid, nullable) — auth.uid() of the user who ran the import

  ## Indexes
  - Partial unique index on `email` (WHERE email IS NOT NULL AND email != '')
  - Partial unique index on `telephone` (WHERE telephone IS NOT NULL AND telephone != '')
  - These partial indexes enforce uniqueness only for non-empty values, allowing
    multiple leads to have no email or no phone without conflicting.

  ## SQL Function
  - `find_duplicate_leads(emails text[], telephones text[])` — returns existing leads
    that match any of the provided emails OR phones. Single SQL call, index-backed.

  ## Notes
  - The `data` JSONB column is preserved intact for backwards compatibility
  - All new columns are nullable so existing rows are unaffected
  - The function uses ANY() operator for efficient array membership tests
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'prenom'
  ) THEN
    ALTER TABLE leads ADD COLUMN prenom text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'nom'
  ) THEN
    ALTER TABLE leads ADD COLUMN nom text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'email'
  ) THEN
    ALTER TABLE leads ADD COLUMN email text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'telephone'
  ) THEN
    ALTER TABLE leads ADD COLUMN telephone text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'source'
  ) THEN
    ALTER TABLE leads ADD COLUMN source text DEFAULT 'csv_import';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'source_file'
  ) THEN
    ALTER TABLE leads ADD COLUMN source_file text;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS leads_email_unique
  ON leads (email)
  WHERE email IS NOT NULL AND email != '';

CREATE UNIQUE INDEX IF NOT EXISTS leads_telephone_unique
  ON leads (telephone)
  WHERE telephone IS NOT NULL AND telephone != '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'import_history' AND column_name = 'new_leads_count'
  ) THEN
    ALTER TABLE import_history ADD COLUMN new_leads_count integer NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'import_history' AND column_name = 'duplicates_count'
  ) THEN
    ALTER TABLE import_history ADD COLUMN duplicates_count integer NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'import_history' AND column_name = 'errors_count'
  ) THEN
    ALTER TABLE import_history ADD COLUMN errors_count integer NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'import_history' AND column_name = 'import_mode'
  ) THEN
    ALTER TABLE import_history ADD COLUMN import_mode text NOT NULL DEFAULT 'ignore';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'import_history' AND column_name = 'source_file'
  ) THEN
    ALTER TABLE import_history ADD COLUMN source_file text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'import_history' AND column_name = 'imported_by'
  ) THEN
    ALTER TABLE import_history ADD COLUMN imported_by uuid;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION find_duplicate_leads(
  p_emails text[],
  p_telephones text[]
)
RETURNS TABLE (
  lead_id uuid,
  lead_email text,
  lead_telephone text,
  lead_nom text,
  lead_prenom text,
  match_type text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    id AS lead_id,
    email AS lead_email,
    telephone AS lead_telephone,
    nom AS lead_nom,
    prenom AS lead_prenom,
    CASE
      WHEN email = ANY(p_emails) AND telephone = ANY(p_telephones) THEN 'both'
      WHEN email = ANY(p_emails) THEN 'email'
      ELSE 'telephone'
    END AS match_type
  FROM leads
  WHERE
    (email IS NOT NULL AND email != '' AND email = ANY(p_emails))
    OR
    (telephone IS NOT NULL AND telephone != '' AND telephone = ANY(p_telephones));
$$;
