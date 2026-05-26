/*
  # Add is_visible column to site_templates

  1. Schema Changes
    - Add `is_visible` (boolean, NOT NULL, default true) to `site_templates`
    - Used to temporarily hide templates from the UI without deleting them

  2. Data Changes
    - Set is_visible = false for templates: heat_pump, fitness, real_estate, renovation
    - Keep is_visible = true for: talvex_official, renewable_energy

  3. Notes
    - Hidden templates remain in the database and can be re-enabled later
    - Any site already using a hidden template continues to work (active_template_id is preserved)
    - Only the template picker is affected
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_templates' AND column_name = 'is_visible'
  ) THEN
    ALTER TABLE site_templates ADD COLUMN is_visible boolean NOT NULL DEFAULT true;
  END IF;
END $$;

UPDATE site_templates
SET is_visible = false
WHERE template_key IN ('heat_pump', 'fitness', 'real_estate', 'renovation');
