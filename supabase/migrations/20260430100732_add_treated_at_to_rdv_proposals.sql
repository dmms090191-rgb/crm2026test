/*
  # Add treated_at column to rdv_proposals

  1. Modified Tables
    - `rdv_proposals`
      - Added `treated_at` (timestamptz, nullable, default null)
        - NULL means the appointment has not been treated yet
        - A timestamp value means it has been treated at that time

  2. Important Notes
    - This column is independent of the `status` field
    - RDVs remain in status = 'confirmed' even after being treated
    - Allows tracking which past appointments have been processed
    - No data loss or breaking changes
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rdv_proposals' AND column_name = 'treated_at'
  ) THEN
    ALTER TABLE rdv_proposals ADD COLUMN treated_at timestamptz DEFAULT NULL;
  END IF;
END $$;
