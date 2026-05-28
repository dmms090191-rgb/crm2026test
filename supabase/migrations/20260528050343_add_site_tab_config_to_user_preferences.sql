/*
  # Add site_tab_config column to user_preferences

  1. Modified Tables
    - `user_preferences`
      - `site_tab_config` (jsonb, nullable) - stores per-user site tab ordering and visibility
        - Format: { "order": ["apercu", "templates", "domaine"], "hidden": ["domaine"] }
        - `order` array controls tab display sequence
        - `hidden` array controls which tabs are hidden

  2. Notes
    - Nullable column: when null, default tab order is used
    - No RLS changes needed - existing policies already cover all columns on user_preferences
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences' AND column_name = 'site_tab_config'
  ) THEN
    ALTER TABLE user_preferences ADD COLUMN site_tab_config jsonb;
  END IF;
END $$;
