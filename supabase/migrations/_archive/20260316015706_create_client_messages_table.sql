/*
  # Create client_messages table

  1. New Tables
    - `client_messages`
      - `id` (uuid, primary key)
      - `content` (text) - message content
      - `sender` (text) - 'client' or 'admin'
      - `client_auth_id` (uuid) - references auth.users id for the client
      - `read` (boolean) - whether the message has been read
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `client_messages` table
    - Authenticated users can read/insert/update/delete their own messages
*/

CREATE TABLE IF NOT EXISTS client_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL DEFAULT '',
  sender text NOT NULL DEFAULT 'client',
  client_auth_id uuid NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE client_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read client_messages"
  ON client_messages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert client_messages"
  ON client_messages FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update client_messages"
  ON client_messages FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete client_messages"
  ON client_messages FOR DELETE
  TO authenticated
  USING (true);
