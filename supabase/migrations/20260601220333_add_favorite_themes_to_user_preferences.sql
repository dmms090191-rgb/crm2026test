/*
  # Add favorite_themes to user_preferences

  1. Modified Tables
    - `user_preferences`
      - `favorite_themes` (jsonb) - Array of theme_key strings the user has favorited
        Defaults to empty array '[]'

  2. Notes
    - Stores user-level theme favorites for the Design Studio modal
    - Each entry is a theme_key string (e.g. "dark", "beige", "custom_xxx")
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences' AND column_name = 'favorite_themes'
  ) THEN
    ALTER TABLE user_preferences ADD COLUMN favorite_themes jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;
