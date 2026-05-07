/*
  # Enable realtime on vendor_admin_messages

  1. Changes
    - Add `vendor_admin_messages` table to the `supabase_realtime` publication
    - This enables realtime subscriptions (postgres_changes) to work for this table

  2. Important Notes
    - Required for live notification badges (unread vendor/admin messages)
    - Without this, realtime channels on this table receive no events
*/

ALTER PUBLICATION supabase_realtime ADD TABLE vendor_admin_messages;
