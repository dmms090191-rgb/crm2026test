/*
  # Add active_template_id to company_home_pages

  1. Modified Tables
    - `company_home_pages`
      - `active_template_id` (uuid, nullable, FK to site_templates)

  2. Notes
    - Links each company site to its active template
    - Nullable so existing sites without a template continue to work
    - Foreign key references site_templates(id)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_home_pages' AND column_name = 'active_template_id'
  ) THEN
    ALTER TABLE company_home_pages
      ADD COLUMN active_template_id uuid REFERENCES site_templates(id);
  END IF;
END $$;
