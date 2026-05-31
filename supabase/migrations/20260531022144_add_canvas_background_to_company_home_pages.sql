/*
  # Add canvas background columns to company_home_pages

  1. Modified Tables
    - `company_home_pages`
      - `draft_canvas_bg_desktop` (text, nullable) - Draft background color for desktop view
      - `draft_canvas_bg_mobile` (text, nullable) - Draft background color for mobile view
      - `published_canvas_bg_desktop` (text, nullable) - Published background color for desktop
      - `published_canvas_bg_mobile` (text, nullable) - Published background color for mobile

  2. Notes
    - Stores canvas background colors separately for desktop and mobile views
    - Draft values are updated when the user saves a draft in Studio
    - Published values are copied from draft when the user publishes
    - NULL means "use default" (#020617, the dark studio background)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_home_pages' AND column_name = 'draft_canvas_bg_desktop'
  ) THEN
    ALTER TABLE company_home_pages ADD COLUMN draft_canvas_bg_desktop text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_home_pages' AND column_name = 'draft_canvas_bg_mobile'
  ) THEN
    ALTER TABLE company_home_pages ADD COLUMN draft_canvas_bg_mobile text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_home_pages' AND column_name = 'published_canvas_bg_desktop'
  ) THEN
    ALTER TABLE company_home_pages ADD COLUMN published_canvas_bg_desktop text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_home_pages' AND column_name = 'published_canvas_bg_mobile'
  ) THEN
    ALTER TABLE company_home_pages ADD COLUMN published_canvas_bg_mobile text;
  END IF;
END $$;
