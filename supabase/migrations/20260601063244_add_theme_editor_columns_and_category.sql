/*
  # Add theme editor support columns and category

  1. Modified Tables
    - `theme_config`
      - `theme_tokens` (jsonb, nullable) - Stores full ThemeTokens JSON for editor-created themes
      - `created_from_theme` (text, nullable) - Base theme key this editor theme was derived from
      - `description` (text, default '') - Optional description for the theme

  2. New Data
    - `theme_categories` - Adds "Themes editeur" category with slug 'editor', sort_order 9

  3. Important Notes
    - Existing themes are unaffected (new columns are nullable/default)
    - The editor category is not a system category, so regular users can see it
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'theme_config' AND column_name = 'theme_tokens'
  ) THEN
    ALTER TABLE theme_config ADD COLUMN theme_tokens jsonb DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'theme_config' AND column_name = 'created_from_theme'
  ) THEN
    ALTER TABLE theme_config ADD COLUMN created_from_theme text DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'theme_config' AND column_name = 'description'
  ) THEN
    ALTER TABLE theme_config ADD COLUMN description text DEFAULT '';
  END IF;
END $$;

INSERT INTO theme_categories (slug, name, sort_order, is_system)
SELECT 'editor', 'Themes editeur', 9, false
WHERE NOT EXISTS (SELECT 1 FROM theme_categories WHERE slug = 'editor');