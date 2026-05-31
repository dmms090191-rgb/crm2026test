/*
  # Add 'audio' file type to message tables

  1. Modified Tables
    - `vendor_admin_messages`: Updated file_type CHECK to include 'audio'
    - `client_messages`: Updated file_type CHECK to include 'audio'
    - `super_admin_messages`: Updated file_type CHECK to include 'audio'

  2. Purpose
    - Enable voice message support across all chat features
    - Audio files are stored in the existing `chat-files` storage bucket
    - No data loss: existing 'image' and 'document' values remain valid

  3. Important Notes
    - Uses DROP CONSTRAINT IF EXISTS + ADD CONSTRAINT pattern for safety
    - All three message tables are updated consistently
*/

-- vendor_admin_messages: update file_type check
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'vendor_admin_messages' AND constraint_type = 'CHECK'
      AND constraint_name = 'vendor_admin_messages_file_type_check'
  ) THEN
    ALTER TABLE vendor_admin_messages DROP CONSTRAINT vendor_admin_messages_file_type_check;
  END IF;
END $$;

ALTER TABLE vendor_admin_messages
  ADD CONSTRAINT vendor_admin_messages_file_type_check
  CHECK (file_type IN ('image', 'document', 'audio'));

-- client_messages: update file_type check
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'client_messages' AND constraint_type = 'CHECK'
      AND constraint_name = 'client_messages_file_type_check'
  ) THEN
    ALTER TABLE client_messages DROP CONSTRAINT client_messages_file_type_check;
  END IF;
END $$;

ALTER TABLE client_messages
  ADD CONSTRAINT client_messages_file_type_check
  CHECK (file_type IN ('image', 'document', 'audio'));

-- super_admin_messages: update file_type check
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'super_admin_messages' AND constraint_type = 'CHECK'
      AND constraint_name = 'super_admin_messages_file_type_check'
  ) THEN
    ALTER TABLE super_admin_messages DROP CONSTRAINT super_admin_messages_file_type_check;
  END IF;
END $$;

ALTER TABLE super_admin_messages
  ADD CONSTRAINT super_admin_messages_file_type_check
  CHECK (file_type IS NULL OR file_type IN ('image', 'document', 'audio'));
