/*
  # Add page_key column to content_blocks

  1. Modified Tables
    - `content_blocks`
      - Added `page_key` (text, NOT NULL, default 'page-accueil')
      - All existing rows will get 'page-accueil' as their page_key
    - Added index on `page_key` for fast filtering

  2. Purpose
    - Allows each CRM page to have its own independent set of content blocks
    - Existing data for "Page d'accueil" is preserved with page_key = 'page-accueil'
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'content_blocks' AND column_name = 'page_key'
  ) THEN
    ALTER TABLE content_blocks ADD COLUMN page_key text NOT NULL DEFAULT 'page-accueil';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_content_blocks_page_key ON content_blocks(page_key);
