/*
  # Add canvas background mode columns

  1. Modified Tables
    - `company_home_pages`
      - `draft_canvas_bg_mode_desktop` (text, default 'default') - Draft background mode for desktop: 'default', 'solid', or 'gradient'
      - `draft_canvas_bg_mode_mobile` (text, default 'default') - Draft background mode for mobile
      - `published_canvas_bg_mode_desktop` (text) - Published background mode for desktop
      - `published_canvas_bg_mode_mobile` (text) - Published background mode for mobile

  2. Notes
    - 'default' means white background, no solid color or gradient applied
    - 'solid' means the solid color is active
    - 'gradient' means the gradient (and shapes) is active
    - These columns control which background is rendered, without changing the stored color/gradient values
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_home_pages' AND column_name = 'draft_canvas_bg_mode_desktop'
  ) THEN
    ALTER TABLE company_home_pages ADD COLUMN draft_canvas_bg_mode_desktop text DEFAULT 'default';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_home_pages' AND column_name = 'draft_canvas_bg_mode_mobile'
  ) THEN
    ALTER TABLE company_home_pages ADD COLUMN draft_canvas_bg_mode_mobile text DEFAULT 'default';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_home_pages' AND column_name = 'published_canvas_bg_mode_desktop'
  ) THEN
    ALTER TABLE company_home_pages ADD COLUMN published_canvas_bg_mode_desktop text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_home_pages' AND column_name = 'published_canvas_bg_mode_mobile'
  ) THEN
    ALTER TABLE company_home_pages ADD COLUMN published_canvas_bg_mode_mobile text;
  END IF;
END $$;
