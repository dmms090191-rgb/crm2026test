/*
  # Enable Realtime on leads table

  ## Summary
  Activates Supabase Realtime publication on the `leads` table so that
  INSERT, UPDATE, and DELETE events are broadcast to all subscribed clients.

  ## Changes
  - Adds the `leads` table to the `supabase_realtime` publication if not already present.

  ## Notes
  - This is required for Postgres Changes subscriptions (`supabase.channel().on('postgres_changes', ...)`)
    to receive events from this table.
  - Without this, channels subscribe but never fire callbacks on remote changes.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'leads'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE leads;
  END IF;
END $$;
