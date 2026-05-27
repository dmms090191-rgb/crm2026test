/*
  # Create crm_ideas table

  ## Purpose
  Stores improvement ideas for the CRM, accessible from the Documentation CRM tab.

  ## New Tables
  - `crm_ideas`
    - `id` (uuid, primary key)
    - `title` (text, required) — short title of the idea
    - `content` (text) — full description of the idea
    - `idea_date` (date, required) — date of the idea, auto-set to today
    - `created_at` (timestamptz) — insertion timestamp
    - `updated_at` (timestamptz) — last update timestamp

  ## Security
  - RLS enabled
  - Authenticated users can read, insert, update, and delete
*/

CREATE TABLE IF NOT EXISTS crm_ideas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  idea_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE crm_ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read ideas"
  ON crm_ideas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert ideas"
  ON crm_ideas FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update ideas"
  ON crm_ideas FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete ideas"
  ON crm_ideas FOR DELETE
  TO authenticated
  USING (true);
