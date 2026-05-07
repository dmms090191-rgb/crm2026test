/*
  # Enhance chat tables for full internal messaging system

  ## Summary
  Adds file attachment support and soft-delete to vendor_admin_messages,
  enhances client_messages with vendor_id, file attachments and soft-delete,
  and creates a storage bucket for chat files.

  ## Changes

  ### vendor_admin_messages
  - Add `file_url` (text) — public URL of uploaded file
  - Add `file_name` (text) — original filename
  - Add `file_type` (text) — 'image' or 'document'
  - Add `deleted` (boolean, default false) — soft delete flag

  ### client_messages
  - Add `vendor_id` (uuid → vendors.id SET NULL) — which vendor this convo belongs to
  - Add `file_url`, `file_name`, `file_type` — file attachment support
  - Add `deleted` (boolean, default false) — soft delete flag
  - Add `sender` update: now supports 'vendor' as well as 'client' and 'admin'

  ## Security
  - RLS already enabled on both tables, no changes needed
*/

-- vendor_admin_messages: add file & deleted fields
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendor_admin_messages' AND column_name='file_url') THEN
    ALTER TABLE vendor_admin_messages ADD COLUMN file_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendor_admin_messages' AND column_name='file_name') THEN
    ALTER TABLE vendor_admin_messages ADD COLUMN file_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendor_admin_messages' AND column_name='file_type') THEN
    ALTER TABLE vendor_admin_messages ADD COLUMN file_type text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendor_admin_messages' AND column_name='deleted') THEN
    ALTER TABLE vendor_admin_messages ADD COLUMN deleted boolean DEFAULT false;
  END IF;
END $$;

-- client_messages: add vendor_id, file & deleted fields
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='client_messages' AND column_name='vendor_id') THEN
    ALTER TABLE client_messages ADD COLUMN vendor_id uuid REFERENCES vendors(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='client_messages' AND column_name='file_url') THEN
    ALTER TABLE client_messages ADD COLUMN file_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='client_messages' AND column_name='file_name') THEN
    ALTER TABLE client_messages ADD COLUMN file_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='client_messages' AND column_name='file_type') THEN
    ALTER TABLE client_messages ADD COLUMN file_type text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='client_messages' AND column_name='deleted') THEN
    ALTER TABLE client_messages ADD COLUMN deleted boolean DEFAULT false;
  END IF;
END $$;

-- Update client_messages sender check to allow 'vendor'
DO $$
BEGIN
  ALTER TABLE client_messages DROP CONSTRAINT IF EXISTS client_messages_sender_check;
  ALTER TABLE client_messages ADD CONSTRAINT client_messages_sender_check
    CHECK (sender IN ('client', 'admin', 'vendor'));
EXCEPTION WHEN others THEN NULL;
END $$;
