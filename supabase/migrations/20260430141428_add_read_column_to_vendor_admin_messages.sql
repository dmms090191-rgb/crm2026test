/*
  # Add read column to vendor_admin_messages

  1. Modified Tables
    - `vendor_admin_messages`
      - Added `read` (boolean, NOT NULL, default false) - tracks whether a message has been read by the recipient

  2. Backfill
    - All existing messages are marked as read to avoid a large notification badge appearing on deployment

  3. Important Notes
    - Only new messages after this migration will trigger unread notifications
    - Admin sees unread when sender='vendor', vendor sees unread when sender='admin'
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendor_admin_messages' AND column_name = 'read'
  ) THEN
    ALTER TABLE vendor_admin_messages ADD COLUMN read boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Backfill: mark all existing messages as read
UPDATE vendor_admin_messages SET read = true WHERE read = false;
