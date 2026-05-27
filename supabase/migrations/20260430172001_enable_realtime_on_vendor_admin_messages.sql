/*
  # Enable realtime on vendor_admin_messages

  1. Changes
    - Add `vendor_admin_messages` table to the `supabase_realtime` publication
    - This enables realtime subscriptions (postgres_changes) to work for this table

  2. Important Notes
    - Required for live notification badges (unread vendor/admin messages)
    - Without this, realtime channels on this table receive no events
*/

DO $$ BEGIN
IF NOT EXISTS (
  SELECT 1 FROM pg_publication_tables
  WHERE pubname = 'supabase_realtime' AND tablename = 'vendor_admin_messages'
) THEN
  ALTER PUBLICATION supabase_realtime ADD TABLE vendor_admin_messages;
END IF;
END $$;
