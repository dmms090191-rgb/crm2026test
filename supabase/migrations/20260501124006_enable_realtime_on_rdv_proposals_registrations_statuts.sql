/*
  # Enable realtime on rdv_proposals, registrations, and statuts

  1. Changes
    - Adds `rdv_proposals` to the `supabase_realtime` publication (if not already present)
    - Adds `registrations` to the `supabase_realtime` publication (if not already present)
    - Adds `statuts` to the `supabase_realtime` publication (if not already present)

  2. Why
    - The frontend subscribes to postgres_changes on these three tables for live notifications
      (agenda badges, RDV proposal updates, registration alerts, status list refresh)
    - Without publication membership, those realtime channels silently receive no events

  3. Safety
    - Each table is checked in pg_publication_tables before being added
    - Safe to re-run: no error if the table is already in the publication
    - No data modification, no schema change, no RLS change
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'rdv_proposals'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE rdv_proposals;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'registrations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE registrations;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'statuts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE statuts;
  END IF;
END $$;