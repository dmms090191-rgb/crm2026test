/*
  # Add extended columns to rdv_proposals

  1. Modified Tables
    - `rdv_proposals`
      - `motif` (text, not null, default '') - reason/subject for the appointment
      - `description` (text, not null, default '') - additional details
      - `created_by_role` (text, not null, default 'admin') - role of the creator (admin/vendor/client)
      - `created_by_id` (uuid, nullable) - auth user id of the creator
      - `target_role` (text, not null, default 'client') - intended recipient role
      - `responded_at` (timestamptz, nullable) - when the proposal was accepted/declined
      - `responded_by` (text, nullable) - role that responded (admin/vendor/client)

  2. Notes
    - Uses IF NOT EXISTS checks so it is safe to run on databases where columns already exist
    - No destructive operations - existing data is preserved
    - No RLS or policy changes
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rdv_proposals' AND column_name = 'motif') THEN
    ALTER TABLE rdv_proposals ADD COLUMN motif text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rdv_proposals' AND column_name = 'description') THEN
    ALTER TABLE rdv_proposals ADD COLUMN description text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rdv_proposals' AND column_name = 'created_by_role') THEN
    ALTER TABLE rdv_proposals ADD COLUMN created_by_role text NOT NULL DEFAULT 'admin';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rdv_proposals' AND column_name = 'created_by_id') THEN
    ALTER TABLE rdv_proposals ADD COLUMN created_by_id uuid DEFAULT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rdv_proposals' AND column_name = 'target_role') THEN
    ALTER TABLE rdv_proposals ADD COLUMN target_role text NOT NULL DEFAULT 'client';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rdv_proposals' AND column_name = 'responded_at') THEN
    ALTER TABLE rdv_proposals ADD COLUMN responded_at timestamptz DEFAULT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rdv_proposals' AND column_name = 'responded_by') THEN
    ALTER TABLE rdv_proposals ADD COLUMN responded_by text DEFAULT NULL;
  END IF;
END $$;
