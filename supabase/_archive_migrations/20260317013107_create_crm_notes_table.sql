/*
  # Create crm_notes table

  ## Summary
  Adds a notes system for the "Contexte ChatGPT" section of the CRM Documentation.

  ## New Tables
  - `crm_notes`
    - `id` (uuid, primary key)
    - `title` (text) — note title
    - `content` (text) — note body
    - `note_date` (date) — the date of the note
    - `time_start` (text) — start time (HH:MM)
    - `time_end` (text) — end time (HH:MM)
    - `created_at` (timestamptz) — insertion timestamp
    - `updated_at` (timestamptz) — last update timestamp

  ## Security
  - RLS enabled
  - Authenticated users can select, insert, update, delete their own notes
    (admin-only tool so we allow any authenticated user full access)
*/

CREATE TABLE IF NOT EXISTS crm_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  note_date date NOT NULL DEFAULT CURRENT_DATE,
  time_start text NOT NULL DEFAULT '',
  time_end text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE crm_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select notes"
  ON crm_notes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert notes"
  ON crm_notes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update notes"
  ON crm_notes FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete notes"
  ON crm_notes FOR DELETE
  TO authenticated
  USING (true);
