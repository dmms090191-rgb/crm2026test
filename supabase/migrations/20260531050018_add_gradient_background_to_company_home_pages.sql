/*
  # Add gradient background columns to company_home_pages

  1. Modified Tables
    - `company_home_pages`
      - `draft_canvas_gradient_desktop` (jsonb, nullable) - Draft gradient config for desktop
      - `draft_canvas_gradient_mobile` (jsonb, nullable) - Draft gradient config for mobile
      - `published_canvas_gradient_desktop` (jsonb, nullable) - Published gradient config for desktop
      - `published_canvas_gradient_mobile` (jsonb, nullable) - Published gradient config for mobile

  2. Notes
    - Stores gradient configs as JSONB with structure:
      { color1: string, color2: string, direction: string, intensity: string, showGuideLine: boolean }
    - Draft values are updated when the user saves a draft in Studio
    - Published values are copied from draft when the user publishes
    - NULL means "no gradient / use solid background color"
    - When gradient is present, it takes priority over the solid canvas_bg color
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_home_pages' AND column_name = 'draft_canvas_gradient_desktop'
  ) THEN
    ALTER TABLE company_home_pages ADD COLUMN draft_canvas_gradient_desktop jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_home_pages' AND column_name = 'draft_canvas_gradient_mobile'
  ) THEN
    ALTER TABLE company_home_pages ADD COLUMN draft_canvas_gradient_mobile jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_home_pages' AND column_name = 'published_canvas_gradient_desktop'
  ) THEN
    ALTER TABLE company_home_pages ADD COLUMN published_canvas_gradient_desktop jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_home_pages' AND column_name = 'published_canvas_gradient_mobile'
  ) THEN
    ALTER TABLE company_home_pages ADD COLUMN published_canvas_gradient_mobile jsonb;
  END IF;
END $$;
