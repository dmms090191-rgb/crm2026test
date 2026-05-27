/*
  # Add seen_by_admin and seen_by_vendor to rdv_proposals

  1. Modified Tables
    - `rdv_proposals`
      - Added `seen_by_admin` (boolean, NOT NULL, default false)
        Tracks whether the admin has seen this confirmed proposal notification.
      - Added `seen_by_vendor` (boolean, NOT NULL, default false)
        Tracks whether the assigned vendor has seen this confirmed proposal notification.

  2. Backfill
    - All existing confirmed proposals are marked as seen by both admin and vendor
      to avoid a flood of notifications for historical data.

  3. Important Notes
    - Only newly confirmed proposals (accepted by clients after this migration)
      will appear as unseen notifications.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rdv_proposals' AND column_name = 'seen_by_admin'
  ) THEN
    ALTER TABLE rdv_proposals ADD COLUMN seen_by_admin boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rdv_proposals' AND column_name = 'seen_by_vendor'
  ) THEN
    ALTER TABLE rdv_proposals ADD COLUMN seen_by_vendor boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Backfill: mark all already-confirmed proposals as seen
UPDATE rdv_proposals
SET seen_by_admin = true, seen_by_vendor = true
WHERE status = 'confirmed';
