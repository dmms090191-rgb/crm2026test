/*
  # Add color column to crm_system_categories

  1. Modified Tables
    - `crm_system_categories`
      - Added `color` (text, nullable) - hex color code for visual distinction

  2. Notes
    - When color is null, the category uses the default theme accent color
    - Users can assign any hex color to any category at any depth level
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_system_categories' AND column_name = 'color'
  ) THEN
    ALTER TABLE crm_system_categories ADD COLUMN color text;
  END IF;
END $$;
