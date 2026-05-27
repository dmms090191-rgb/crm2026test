/*
  # Add replied_to_message_id to super_admin_messages

  1. Modified Tables
    - `super_admin_messages`
      - `replied_to_message_id` (uuid, nullable) - references the original message that an AI reply is responding to

  2. Important Notes
    - This column is used by the sa-support-auto-reply edge function to prevent duplicate AI replies
    - No foreign key constraint is added to avoid cascade issues
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'super_admin_messages' AND column_name = 'replied_to_message_id'
  ) THEN
    ALTER TABLE super_admin_messages ADD COLUMN replied_to_message_id uuid;
  END IF;
END $$;
