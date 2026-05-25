/*
  # Create demo_sessions table for live demo mode

  1. New Tables
    - `demo_sessions`
      - `id` (uuid, primary key)
      - `super_admin_id` (text, not null) - SA user who started the demo
      - `target_user_id` (text, not null) - user who will see the demo
      - `target_role` (text, not null) - 'admin' / 'vendor' / 'client'
      - `company_id` (text) - company context
      - `status` (text, default 'pending') - pending / active / ended / rejected
      - `current_view` (text) - current tab/view the SA is showing
      - `sa_display_name` (text) - display name of the SA for the invite modal
      - `started_at` (timestamptz) - when the session became active
      - `ended_at` (timestamptz) - when the session was terminated
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on demo_sessions
    - Super admins can create, read, update, delete their own sessions
    - Target users can read sessions where they are the target
    - Target users can update status (accept/reject/end) on their own sessions

  3. Important Notes
    - Broadcast channels handle cursor/click data ephemerally (not stored in DB)
    - Only session metadata is persisted
    - Realtime enabled for invitation detection
*/

CREATE TABLE IF NOT EXISTS demo_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  super_admin_id text NOT NULL,
  target_user_id text NOT NULL,
  target_role text NOT NULL DEFAULT 'admin',
  company_id text,
  status text NOT NULL DEFAULT 'pending',
  current_view text,
  sa_display_name text NOT NULL DEFAULT 'Support Talvex',
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_demo_sessions_target ON demo_sessions (target_user_id, status);
CREATE INDEX IF NOT EXISTS idx_demo_sessions_sa ON demo_sessions (super_admin_id, status);

ALTER TABLE demo_sessions ENABLE ROW LEVEL SECURITY;

-- SA can read all their own sessions
CREATE POLICY "SA can read own demo sessions"
  ON demo_sessions FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->'app_metadata'->>'is_super_admin')::boolean = true
    AND super_admin_id = auth.uid()::text
  );

-- SA can create demo sessions
CREATE POLICY "SA can create demo sessions"
  ON demo_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt()->'app_metadata'->>'is_super_admin')::boolean = true
    AND super_admin_id = auth.uid()::text
  );

-- SA can update own sessions (change view, end session)
CREATE POLICY "SA can update own demo sessions"
  ON demo_sessions FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt()->'app_metadata'->>'is_super_admin')::boolean = true
    AND super_admin_id = auth.uid()::text
  )
  WITH CHECK (
    (auth.jwt()->'app_metadata'->>'is_super_admin')::boolean = true
    AND super_admin_id = auth.uid()::text
  );

-- SA can delete own sessions
CREATE POLICY "SA can delete own demo sessions"
  ON demo_sessions FOR DELETE
  TO authenticated
  USING (
    (auth.jwt()->'app_metadata'->>'is_super_admin')::boolean = true
    AND super_admin_id = auth.uid()::text
  );

-- Target users can see sessions where they are the target
CREATE POLICY "Target user can read own demo sessions"
  ON demo_sessions FOR SELECT
  TO authenticated
  USING (
    target_user_id = auth.uid()::text
  );

-- Target users can update status on their sessions (accept/reject/end)
CREATE POLICY "Target user can update own demo session status"
  ON demo_sessions FOR UPDATE
  TO authenticated
  USING (
    target_user_id = auth.uid()::text
  )
  WITH CHECK (
    target_user_id = auth.uid()::text
  );

-- Enable realtime for invitation detection
ALTER PUBLICATION supabase_realtime ADD TABLE demo_sessions;
