DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences' AND column_name = 'sa_hidden_tabs'
  ) THEN
    ALTER TABLE user_preferences ADD COLUMN sa_hidden_tabs jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;