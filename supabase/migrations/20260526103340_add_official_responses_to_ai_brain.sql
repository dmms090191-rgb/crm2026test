/*
  # Add official_responses column to ai_company_brain

  1. Modified Tables
    - `ai_company_brain`
      - `official_responses` (jsonb, default '[]') - Array of {question, answer} objects
        representing official Talvex responses the AI must use as priority answers

  2. Notes
    - Used by Cerveau IA SA for platform-level official responses
    - Also available per-company in Cerveau IA AD
    - AI system prompt will inject these as highest-priority answers
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_company_brain' AND column_name = 'official_responses'
  ) THEN
    ALTER TABLE ai_company_brain ADD COLUMN official_responses jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;
