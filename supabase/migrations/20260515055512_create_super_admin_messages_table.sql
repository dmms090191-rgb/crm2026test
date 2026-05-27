/*
  # Create super_admin_messages table

  1. New Tables
    - `super_admin_messages`
      - `id` (uuid, primary key)
      - `super_admin_id` (uuid, NOT NULL) - auth.uid() of the super admin
      - `admin_id` (uuid, NOT NULL) - auth.uid() of the admin
      - `sender_role` (text, NOT NULL) - 'super_admin' or 'admin'
      - `content` (text, NOT NULL, default '')
      - `file_url` (text, nullable)
      - `file_name` (text, nullable)
      - `file_type` (text, nullable, check: 'image' or 'document')
      - `read` (boolean, NOT NULL, default false)
      - `deleted` (boolean, NOT NULL, default false)
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `super_admin_messages` table
    - Super admin can SELECT all messages where they are super_admin_id
    - Admin can SELECT only messages where admin_id = auth.uid()
    - Super admin can INSERT messages with sender_role = 'super_admin'
    - Admin can INSERT messages with sender_role = 'admin' and admin_id = auth.uid()
    - Super admin can UPDATE (mark as read) messages where they are super_admin_id
    - Admin can UPDATE (mark as read) messages where admin_id = auth.uid()

  3. Indexes
    - Index on admin_id for fast filtering per admin
    - Index on super_admin_id for fast filtering per super admin

  4. Realtime
    - Enable realtime on super_admin_messages
*/

CREATE TABLE IF NOT EXISTS super_admin_messages (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  super_admin_id uuid        NOT NULL,
  admin_id       uuid        NOT NULL,
  sender_role    text        NOT NULL DEFAULT 'admin' CHECK (sender_role IN ('super_admin', 'admin')),
  content        text        NOT NULL DEFAULT '',
  file_url       text,
  file_name      text,
  file_type      text        CHECK (file_type IS NULL OR file_type IN ('image', 'document')),
  read           boolean     NOT NULL DEFAULT false,
  deleted        boolean     NOT NULL DEFAULT false,
  created_at     timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS super_admin_messages_admin_id_idx ON super_admin_messages(admin_id);
CREATE INDEX IF NOT EXISTS super_admin_messages_super_admin_id_idx ON super_admin_messages(super_admin_id);

-- Enable RLS
ALTER TABLE super_admin_messages ENABLE ROW LEVEL SECURITY;

-- SELECT policies
CREATE POLICY "Super admin can view their conversations"
  ON super_admin_messages
  FOR SELECT
  TO authenticated
  USING (auth.uid() = super_admin_id);

CREATE POLICY "Admin can view own conversation with super admin"
  ON super_admin_messages
  FOR SELECT
  TO authenticated
  USING (auth.uid() = admin_id);

-- INSERT policies
CREATE POLICY "Super admin can send messages"
  ON super_admin_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = super_admin_id AND sender_role = 'super_admin');

CREATE POLICY "Admin can send messages in own conversation"
  ON super_admin_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = admin_id AND sender_role = 'admin');

-- UPDATE policies (for marking as read)
CREATE POLICY "Super admin can update messages in their conversations"
  ON super_admin_messages
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = super_admin_id)
  WITH CHECK (auth.uid() = super_admin_id);

CREATE POLICY "Admin can update messages in own conversation"
  ON super_admin_messages
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = admin_id)
  WITH CHECK (auth.uid() = admin_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE super_admin_messages;
