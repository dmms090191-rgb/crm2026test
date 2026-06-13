ALTER TABLE company_home_pages
  ADD COLUMN IF NOT EXISTS draft_overlay_elements jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS published_overlay_elements jsonb DEFAULT '[]'::jsonb;
