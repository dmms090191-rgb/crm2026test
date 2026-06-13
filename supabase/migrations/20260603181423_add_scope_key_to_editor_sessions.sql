/*
  # Scope editor sessions by panel context

  1. Changes
    - Add `scope_key` text column to `editor_sessions` (default 'sa').
      Used to namespace editor drafts by panel scope:
      - 'sa' for the Super Admin panel
      - 'co_<company_id>' for any Admin/Vendor/Client of a given company
    - Replace the unique constraint on `user_id` with a composite
      `(user_id, scope_key)` constraint so each user can keep one
      independent draft per scope.

  2. Notes
    - Existing rows keep their value and become the default 'sa' draft.
    - All upsert/select queries must include `scope_key` to avoid
      leaking one panel's editor draft into another.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'editor_sessions' AND column_name = 'scope_key'
  ) THEN
    ALTER TABLE editor_sessions ADD COLUMN scope_key text NOT NULL DEFAULT 'sa';
  END IF;
END $$;

DO $$
DECLARE
  con_name text;
BEGIN
  SELECT conname INTO con_name
  FROM pg_constraint
  WHERE conrelid = 'editor_sessions'::regclass
    AND contype = 'u'
    AND pg_get_constraintdef(oid) = 'UNIQUE (user_id)';
  IF con_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE editor_sessions DROP CONSTRAINT %I', con_name);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'editor_sessions'::regclass
      AND contype = 'u'
      AND pg_get_constraintdef(oid) = 'UNIQUE (user_id, scope_key)'
  ) THEN
    ALTER TABLE editor_sessions
      ADD CONSTRAINT editor_sessions_user_scope_unique UNIQUE (user_id, scope_key);
  END IF;
END $$;