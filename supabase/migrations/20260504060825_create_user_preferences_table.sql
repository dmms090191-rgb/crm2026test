/*
  # Create user_preferences table

  1. New Tables
    - `user_preferences`
      - `user_id` (uuid, primary key, references auth.users(id))
      - `theme` (text, default 'dark') - user's preferred theme ('dark' or 'light')
      - `updated_at` (timestamptz, default now()) - last time preferences were updated

  2. Security
    - Enable RLS on `user_preferences` table
    - SELECT policy: authenticated users can only read their own row
    - INSERT policy: authenticated users can only insert their own row
    - UPDATE policy: authenticated users can only update their own row

  3. Notes
    - Each authenticated user has exactly one row keyed by their auth.uid()
    - This guarantees complete isolation: Client A cannot read or modify Client B's preferences
    - The theme column accepts 'dark' or 'light' values
*/

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme text NOT NULL DEFAULT 'dark',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can read own preferences' AND tablename = 'user_preferences') THEN
  CREATE POLICY "Users can read own preferences"
    ON user_preferences
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own preferences' AND tablename = 'user_preferences') THEN
  CREATE POLICY "Users can insert own preferences"
    ON user_preferences
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own preferences' AND tablename = 'user_preferences') THEN
  CREATE POLICY "Users can update own preferences"
    ON user_preferences
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
END IF;
END $$;
