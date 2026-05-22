/*
  # Add AI enabled flag to leads

  1. Modified Tables
    - `leads`
      - `ai_enabled` (boolean, NOT NULL, default false)
        - Controls whether DeepSeek AI auto-reply is enabled for this specific lead/client
        - false = manual mode (admin replies manually)
        - true = AI mode (DeepSeek can auto-reply if global automation is also enabled)

  2. Important Notes
    - Default is false so existing leads remain in manual mode
    - AI will only respond when BOTH global automation AND per-lead ai_enabled are true
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'ai_enabled'
  ) THEN
    ALTER TABLE leads ADD COLUMN ai_enabled boolean NOT NULL DEFAULT false;
  END IF;
END $$;
