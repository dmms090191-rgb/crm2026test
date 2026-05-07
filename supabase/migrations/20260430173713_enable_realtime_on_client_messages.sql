/*
  # Enable realtime on client_messages

  1. Changes
    - Add `client_messages` table to the `supabase_realtime` publication
    - Enables realtime subscriptions (postgres_changes) for live notification badges

  2. Important Notes
    - Required for the vendor-side "Chat Client" notification badge to update in real-time
    - Also benefits the admin-side client message notifications
*/

ALTER PUBLICATION supabase_realtime ADD TABLE client_messages;
