/*
  # Add counter-proposal fields to rdv_proposals

  1. New Columns
    - `parent_proposal_id` (uuid, nullable, FK to rdv_proposals.id) - links a counter-proposal to its parent
    - `counter_message` (text, default '') - optional message from client explaining their preferred time

  2. Important Notes
    - Non-destructive migration, adds columns only
    - Enables the counter-proposal workflow: client can propose alternative date/time
    - Parent chain allows tracking the full negotiation history
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rdv_proposals' AND column_name = 'parent_proposal_id'
  ) THEN
    ALTER TABLE rdv_proposals ADD COLUMN parent_proposal_id uuid DEFAULT NULL
      REFERENCES rdv_proposals(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rdv_proposals' AND column_name = 'counter_message'
  ) THEN
    ALTER TABLE rdv_proposals ADD COLUMN counter_message text NOT NULL DEFAULT '';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_rdv_proposals_parent_id ON rdv_proposals(parent_proposal_id);
