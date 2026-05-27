/*
  # Create sa_ai_apis table

  1. New Tables
    - `sa_ai_apis`
      - `id` (uuid, primary key)
      - `name` (text, not null) - Name of the AI API (e.g. DeepSeek)
      - `url` (text) - Link to the API platform
      - `account_email` (text) - Email used for the account
      - `account_password` (text) - Password for the account
      - `api_key` (text) - Full API key (stored securely in DB)
      - `remaining_credit` (text) - Manually entered remaining credit
      - `saas_function` (text) - What the API does in the SaaS
      - `status` (text, default 'active') - active or inactive
      - `notes` (text) - Additional notes
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `sa_ai_apis`
    - Authenticated users (Super Admin) can SELECT, INSERT, UPDATE, DELETE
*/

CREATE TABLE IF NOT EXISTS sa_ai_apis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  url text,
  account_email text,
  account_password text,
  api_key text,
  remaining_credit text,
  saas_function text,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sa_ai_apis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view ai apis"
  ON sa_ai_apis
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert ai apis"
  ON sa_ai_apis
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update ai apis"
  ON sa_ai_apis
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete ai apis"
  ON sa_ai_apis
  FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);
