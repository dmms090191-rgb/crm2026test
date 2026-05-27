/*
  # Add knowledge_sections to ai_company_brain

  1. Modified Tables
    - `ai_company_brain`
      - `knowledge_sections` (jsonb, default '[]') - Array of structured knowledge sections
        Each section has: key (unique identifier), title, icon, content (rich text), position (order)
        Used by SA to document all Talvex platform knowledge for AI responses

  2. Purpose
    - Allow Super Admin to organize Talvex platform knowledge by topic
    - Each section covers a specific area (roles, CRM, messages, agenda, etc.)
    - AI uses these sections to answer admin questions accurately
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_company_brain' AND column_name = 'knowledge_sections'
  ) THEN
    ALTER TABLE ai_company_brain ADD COLUMN knowledge_sections jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;
