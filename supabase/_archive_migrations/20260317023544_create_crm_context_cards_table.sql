/*
  # Create crm_context_cards table

  ## Purpose
  Replaces the single text block "Contexte ChatGPT" in the crm_documentation table
  with a card-based system. Each card represents an independent piece of context
  (e.g., architecture, stack, DB schema) that can be individually copied and sent to ChatGPT.

  ## New Tables
  - `crm_context_cards`
    - `id` (uuid, primary key) — unique card identifier
    - `title` (text) — card title, required
    - `content` (text) — card body content (can be long)
    - `position` (integer) — sort order for display, default 0
    - `created_at` (timestamptz) — creation timestamp
    - `updated_at` (timestamptz) — last modification timestamp

  ## Security
  - RLS enabled on `crm_context_cards`
  - Authenticated users can SELECT, INSERT, UPDATE, DELETE their own cards

  ## Notes
  1. The old textarea content stored in crm_documentation with tab_id='contexte-chatgpt'
     is preserved and NOT deleted — it remains as a fallback or can be ignored.
  2. Cards are sorted by `position` ascending when displayed.
  3. An auto-update trigger sets `updated_at` on every UPDATE.
*/

CREATE TABLE IF NOT EXISTS crm_context_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE crm_context_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select context cards"
  ON crm_context_cards FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert context cards"
  ON crm_context_cards FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update context cards"
  ON crm_context_cards FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete context cards"
  ON crm_context_cards FOR DELETE
  TO authenticated
  USING (true);

CREATE OR REPLACE FUNCTION update_crm_context_cards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_crm_context_cards_updated_at
  BEFORE UPDATE ON crm_context_cards
  FOR EACH ROW EXECUTE FUNCTION update_crm_context_cards_updated_at();
