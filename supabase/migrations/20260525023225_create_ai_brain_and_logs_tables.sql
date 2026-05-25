/*
  # Create AI Brain configuration and logging tables

  1. New Tables
    - `ai_company_brain`
      - `id` (uuid, primary key)
      - `company_id` (text, unique, required) - links to company
      - `company_name` (text) - display name
      - `company_description` (text) - what the company does
      - `services` (jsonb) - array of service objects {name, description, price}
      - `opening_hours` (jsonb) - weekly schedule {day: {open, close, closed}}
      - `appointment_rules` (jsonb) - duration, buffer, advance booking, etc.
      - `crm_rules` (jsonb) - default status, auto-assign, etc.
      - `faq` (jsonb) - array of {question, answer}
      - `tone` (text) - AI personality/tone instructions
      - `allowed_tools` (jsonb) - array of enabled tool names
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `ai_conversation_logs`
      - `id` (uuid, primary key)
      - `company_id` (text, required)
      - `lead_id` (uuid, nullable) - if conversation is about a specific lead
      - `role` (text) - 'user', 'assistant', 'system', 'tool'
      - `content` (text) - message content
      - `tool_calls` (jsonb) - tool calls made by the assistant
      - `is_test` (boolean) - whether this was a test conversation
      - `session_id` (text) - groups messages in same conversation
      - `created_at` (timestamptz)

    - `ai_tool_logs`
      - `id` (uuid, primary key)
      - `company_id` (text, required)
      - `session_id` (text) - links to conversation session
      - `tool_name` (text) - which tool was called
      - `tool_input` (jsonb) - arguments passed to the tool
      - `tool_output` (jsonb) - result returned by the tool
      - `duration_ms` (integer) - how long the tool call took
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all 3 tables
    - Policies scoped to company_id via auth.jwt()->'app_metadata'->>'company_id'
    - Super admins (is_super_admin = true in app_metadata) can access all companies
*/

-- ai_company_brain: one row per company storing AI configuration
CREATE TABLE IF NOT EXISTS ai_company_brain (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id text UNIQUE NOT NULL,
  company_name text NOT NULL DEFAULT '',
  company_description text NOT NULL DEFAULT '',
  services jsonb NOT NULL DEFAULT '[]'::jsonb,
  opening_hours jsonb NOT NULL DEFAULT '{}'::jsonb,
  appointment_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  crm_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  faq jsonb NOT NULL DEFAULT '[]'::jsonb,
  tone text NOT NULL DEFAULT '',
  allowed_tools jsonb NOT NULL DEFAULT '["get_company_context","get_available_slots"]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ai_company_brain ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SA can manage all brain configs"
  ON ai_company_brain FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->'app_metadata'->>'is_super_admin')::boolean = true
  );

CREATE POLICY "SA can insert brain configs"
  ON ai_company_brain FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt()->'app_metadata'->>'is_super_admin')::boolean = true
  );

CREATE POLICY "SA can update brain configs"
  ON ai_company_brain FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt()->'app_metadata'->>'is_super_admin')::boolean = true
  )
  WITH CHECK (
    (auth.jwt()->'app_metadata'->>'is_super_admin')::boolean = true
  );

CREATE POLICY "SA can delete brain configs"
  ON ai_company_brain FOR DELETE
  TO authenticated
  USING (
    (auth.jwt()->'app_metadata'->>'is_super_admin')::boolean = true
  );

CREATE POLICY "Admins can read own brain config"
  ON ai_company_brain FOR SELECT
  TO authenticated
  USING (
    company_id = (auth.jwt()->'app_metadata'->>'company_id')
  );

-- ai_conversation_logs: stores every message in AI conversations
CREATE TABLE IF NOT EXISTS ai_conversation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id text NOT NULL,
  lead_id uuid,
  role text NOT NULL DEFAULT 'user',
  content text NOT NULL DEFAULT '',
  tool_calls jsonb,
  is_test boolean NOT NULL DEFAULT false,
  session_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_conversation_logs_company ON ai_conversation_logs (company_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversation_logs_session ON ai_conversation_logs (session_id);

ALTER TABLE ai_conversation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SA can read all conversation logs"
  ON ai_conversation_logs FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->'app_metadata'->>'is_super_admin')::boolean = true
  );

CREATE POLICY "SA can insert conversation logs"
  ON ai_conversation_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt()->'app_metadata'->>'is_super_admin')::boolean = true
  );

CREATE POLICY "Admins can read own conversation logs"
  ON ai_conversation_logs FOR SELECT
  TO authenticated
  USING (
    company_id = (auth.jwt()->'app_metadata'->>'company_id')
  );

CREATE POLICY "Edge function can insert conversation logs"
  ON ai_conversation_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = (auth.jwt()->'app_metadata'->>'company_id')
  );

-- ai_tool_logs: tracks each tool call made during AI conversations
CREATE TABLE IF NOT EXISTS ai_tool_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id text NOT NULL,
  session_id text NOT NULL,
  tool_name text NOT NULL,
  tool_input jsonb NOT NULL DEFAULT '{}'::jsonb,
  tool_output jsonb NOT NULL DEFAULT '{}'::jsonb,
  duration_ms integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_tool_logs_company ON ai_tool_logs (company_id);
CREATE INDEX IF NOT EXISTS idx_ai_tool_logs_session ON ai_tool_logs (session_id);

ALTER TABLE ai_tool_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SA can read all tool logs"
  ON ai_tool_logs FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->'app_metadata'->>'is_super_admin')::boolean = true
  );

CREATE POLICY "SA can insert tool logs"
  ON ai_tool_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt()->'app_metadata'->>'is_super_admin')::boolean = true
  );

CREATE POLICY "Admins can read own tool logs"
  ON ai_tool_logs FOR SELECT
  TO authenticated
  USING (
    company_id = (auth.jwt()->'app_metadata'->>'company_id')
  );
