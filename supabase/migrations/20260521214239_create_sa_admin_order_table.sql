/*
  # Create sa_admin_order table

  Stores the manual display order of admins as chosen by the Super Admin.

  1. New Tables
    - `sa_admin_order`
      - `admin_id` (uuid, primary key) - References the admin user in auth.users
      - `position` (integer, NOT NULL, default 0) - Display order (lower = first)
      - `created_at` (timestamptz) - Row creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `sa_admin_order`
    - Authenticated users can select, insert, update, delete
    - Super admin only table (no company_id scoping needed)

  3. Indexes
    - Index on `position` for fast ordering queries
*/

CREATE TABLE IF NOT EXISTS sa_admin_order (
  admin_id   uuid        PRIMARY KEY,
  position   integer     NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sa_admin_order ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_sa_admin_order_position
  ON sa_admin_order(position);

CREATE POLICY "Authenticated users can view admin order"
  ON sa_admin_order
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert admin order"
  ON sa_admin_order
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update admin order"
  ON sa_admin_order
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete admin order"
  ON sa_admin_order
  FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);
