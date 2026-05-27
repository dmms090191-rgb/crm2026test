/*
  # Add reschedule columns to rdv_proposals

  1. Modified Tables
    - `rdv_proposals`
      - `reschedule_status` (text, nullable) - 'pending' / 'accepted' / 'refused' / null
      - `reschedule_date` (date, nullable) - New proposed date
      - `reschedule_time` (text, nullable) - New proposed time
      - `reschedule_utc` (timestamptz, nullable) - New appointment in UTC
      - `reschedule_reason` (text, nullable) - Optional reason for reschedule
      - `reschedule_requested_at` (timestamptz, nullable) - When the request was made
      - `reschedule_requested_by` (text, nullable) - Who requested ('admin' / 'vendor')

  2. Purpose
    - Allow admin to request a schedule change on confirmed RDVs
    - Client can then accept, refuse, or counter-propose
    - Original RDV stays confirmed until client responds
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rdv_proposals' AND column_name = 'reschedule_status'
  ) THEN
    ALTER TABLE rdv_proposals ADD COLUMN reschedule_status text DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rdv_proposals' AND column_name = 'reschedule_date'
  ) THEN
    ALTER TABLE rdv_proposals ADD COLUMN reschedule_date date DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rdv_proposals' AND column_name = 'reschedule_time'
  ) THEN
    ALTER TABLE rdv_proposals ADD COLUMN reschedule_time text DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rdv_proposals' AND column_name = 'reschedule_utc'
  ) THEN
    ALTER TABLE rdv_proposals ADD COLUMN reschedule_utc timestamptz DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rdv_proposals' AND column_name = 'reschedule_reason'
  ) THEN
    ALTER TABLE rdv_proposals ADD COLUMN reschedule_reason text DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rdv_proposals' AND column_name = 'reschedule_requested_at'
  ) THEN
    ALTER TABLE rdv_proposals ADD COLUMN reschedule_requested_at timestamptz DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rdv_proposals' AND column_name = 'reschedule_requested_by'
  ) THEN
    ALTER TABLE rdv_proposals ADD COLUMN reschedule_requested_by text DEFAULT NULL;
  END IF;
END $$;
