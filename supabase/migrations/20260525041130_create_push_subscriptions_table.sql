/*
  # Create push_subscriptions table for Web Push Notifications

  1. New Tables
    - `push_subscriptions`
      - `id` (uuid, primary key) - unique subscription identifier
      - `user_id` (uuid, not null) - references auth.users
      - `role` (text, not null) - user role (super_admin, admin, vendor, client)
      - `company_id` (uuid, nullable) - associated company for scoped notifications
      - `endpoint` (text, not null) - push service endpoint URL
      - `p256dh` (text, not null) - client public key for encryption
      - `auth` (text, not null) - authentication secret
      - `user_agent` (text, default '') - device user agent string
      - `device_type` (text, default 'unknown') - mobile, desktop, tablet
      - `enabled` (boolean, default true) - whether subscription is active
      - `created_at` (timestamptz) - when subscription was created
      - `updated_at` (timestamptz) - last update timestamp
      - `last_used_at` (timestamptz) - last time a push was sent to this subscription

  2. Security
    - Enable RLS on `push_subscriptions` table
    - Users can only view their own subscriptions
    - Users can only insert their own subscriptions
    - Users can only update their own subscriptions
    - Users can only delete their own subscriptions

  3. Indexes
    - Index on user_id for fast lookups when sending notifications
    - Index on endpoint for deduplication

  4. Notes
    - One user can have multiple subscriptions (multiple devices)
    - Subscriptions are tied to auth.uid() for security
*/

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'client',
  company_id uuid,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text NOT NULL DEFAULT '',
  device_type text NOT NULL DEFAULT 'unknown',
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
  ON push_subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions"
  ON push_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions"
  ON push_subscriptions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscriptions"
  ON push_subscriptions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
