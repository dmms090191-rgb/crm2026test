/*
  # Add forbidden_actions and sensitive_requests to AI brain

  1. Modified Tables
    - `ai_company_brain`
      - `forbidden_actions` (jsonb) - list of things the AI must never do
      - `sensitive_requests` (jsonb) - list of sensitive request keywords to escalate

  2. Notes
    - Both default to empty arrays
    - Used by Cerveau IA SA for support rules and Cerveau IA AD for company rules
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_company_brain' AND column_name = 'forbidden_actions'
  ) THEN
    ALTER TABLE ai_company_brain ADD COLUMN forbidden_actions jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_company_brain' AND column_name = 'sensitive_requests'
  ) THEN
    ALTER TABLE ai_company_brain ADD COLUMN sensitive_requests jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;
