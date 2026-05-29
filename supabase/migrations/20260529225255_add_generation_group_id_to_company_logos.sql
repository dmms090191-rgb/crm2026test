/*
  # Add generation_group_id to company_logos

  1. Modified Tables
    - `company_logos`
      - `generation_group_id` (text, nullable) - Groups logos generated together in a single generation session
        (e.g. a typographic logo and its matching app icon)

  2. Indexes
    - Index on `generation_group_id` for fast group lookups

  3. Important Notes
    - Existing logos will have NULL generation_group_id (treated as standalone)
    - No data is modified or deleted
    - No RLS changes needed (existing policies cover all columns)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_logos' AND column_name = 'generation_group_id'
  ) THEN
    ALTER TABLE company_logos ADD COLUMN generation_group_id text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_company_logos_generation_group_id
  ON company_logos (generation_group_id)
  WHERE generation_group_id IS NOT NULL;
