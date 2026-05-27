/*
  # Add timezone support for appointments

  1. Modified Tables
    - `rdv_proposals`
      - `appointment_utc` (timestamptz) - Full appointment datetime stored in UTC
      - `source_timezone` (text, default 'Europe/Paris') - Timezone in which the RDV was created
      - `created_by_name` (text, default '') - Name of the person who created the RDV
    - `vendors`
      - `timezone` (text, default 'Europe/Paris') - Vendor's preferred timezone

  2. Data Migration
    - Backfill `appointment_utc` from existing `proposed_date` + `proposed_time` interpreted as Europe/Paris
    - Set `source_timezone` to 'Europe/Paris' for all existing RDVs

  3. Important Notes
    - All new columns are nullable or have defaults so existing code continues to work
    - The `proposed_date` and `proposed_time` columns are kept for backward compatibility
    - `appointment_utc` is the source of truth for timezone-aware scheduling
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rdv_proposals' AND column_name = 'appointment_utc'
  ) THEN
    ALTER TABLE rdv_proposals ADD COLUMN appointment_utc timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rdv_proposals' AND column_name = 'source_timezone'
  ) THEN
    ALTER TABLE rdv_proposals ADD COLUMN source_timezone text NOT NULL DEFAULT 'Europe/Paris';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rdv_proposals' AND column_name = 'created_by_name'
  ) THEN
    ALTER TABLE rdv_proposals ADD COLUMN created_by_name text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendors' AND column_name = 'timezone'
  ) THEN
    ALTER TABLE vendors ADD COLUMN timezone text NOT NULL DEFAULT 'Europe/Paris';
  END IF;
END $$;

UPDATE rdv_proposals
SET appointment_utc = (proposed_date || ' ' || COALESCE(proposed_time, '00:00'))::timestamp AT TIME ZONE 'Europe/Paris'
WHERE appointment_utc IS NULL
  AND proposed_date IS NOT NULL;
