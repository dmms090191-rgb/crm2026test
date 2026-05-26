/*
  # Enable all site templates visibility

  1. Changes
    - Set `is_visible = true` on all existing templates
    - Templates: fitness, real_estate, heat_pump, renovation
    - These were previously hidden but are now ready to be used

  2. Important Notes
    - Both Admin and Super Admin panels use the same `is_visible` filter
    - This makes all templates available for selection in both panels
    - No data loss or structural changes
*/

UPDATE site_templates
SET is_visible = true, updated_at = now()
WHERE is_visible = false;
