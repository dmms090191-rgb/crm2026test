/*
  # Add seen_by_client column to rdv_proposals

  1. Modified Tables
    - `rdv_proposals`
      - Added `seen_by_client` (boolean, NOT NULL, default false)
        Tracks whether the client has seen/acknowledged the proposal notification.

  2. Important Notes
    - Existing proposals default to false (unseen), which is acceptable since
      this feature is new and we want clients to see all pending proposals.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rdv_proposals' AND column_name = 'seen_by_client'
  ) THEN
    ALTER TABLE rdv_proposals ADD COLUMN seen_by_client boolean NOT NULL DEFAULT false;
  END IF;
END $$;
