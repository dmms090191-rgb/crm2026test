/*
  # Add identity fields to ai_company_brain

  1. Modified Tables
    - `ai_company_brain`
      - `business_sector` (text) - Business sector/industry of the company
      - `city` (text) - City where the company is located
      - `country` (text) - Country where the company is located
      - `phone` (text) - Company phone number
      - `email` (text) - Company contact email
      - `website` (text) - Company website URL
      - `language` (text) - Primary language for AI responses (default: 'fr')

  2. Purpose
    - Completes the company identity information for the AI brain module
    - Allows the AI to provide richer, more contextual responses
    - Language field enables future multi-language support
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_company_brain' AND column_name = 'business_sector'
  ) THEN
    ALTER TABLE ai_company_brain ADD COLUMN business_sector text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_company_brain' AND column_name = 'city'
  ) THEN
    ALTER TABLE ai_company_brain ADD COLUMN city text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_company_brain' AND column_name = 'country'
  ) THEN
    ALTER TABLE ai_company_brain ADD COLUMN country text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_company_brain' AND column_name = 'phone'
  ) THEN
    ALTER TABLE ai_company_brain ADD COLUMN phone text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_company_brain' AND column_name = 'email'
  ) THEN
    ALTER TABLE ai_company_brain ADD COLUMN email text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_company_brain' AND column_name = 'website'
  ) THEN
    ALTER TABLE ai_company_brain ADD COLUMN website text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_company_brain' AND column_name = 'language'
  ) THEN
    ALTER TABLE ai_company_brain ADD COLUMN language text NOT NULL DEFAULT 'fr';
  END IF;
END $$;