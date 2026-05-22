/*
  # Create sa_crm_societe_comments table

  1. New Tables
    - `sa_crm_societe_comments`
      - `id` (uuid, primary key) - Unique comment identifier
      - `societe_id` (uuid, NOT NULL, FK -> sa_company_prospects) - The prospect this comment belongs to
      - `content` (text, NOT NULL) - Comment body
      - `created_at` (timestamptz) - Timestamp of creation

  2. Security
    - Enable RLS on `sa_crm_societe_comments`
    - Authenticated users can select, insert, delete comments
    - Cascading delete when the parent prospect is removed

  3. Indexes
    - Index on `societe_id` for fast lookups by prospect
*/

CREATE TABLE IF NOT EXISTS sa_crm_societe_comments (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  societe_id  uuid        NOT NULL REFERENCES sa_company_prospects(id) ON DELETE CASCADE,
  content     text        NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sa_crm_societe_comments ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_sa_crm_societe_comments_societe_id
  ON sa_crm_societe_comments(societe_id);

CREATE POLICY "Authenticated users can view societe comments"
  ON sa_crm_societe_comments
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert societe comments"
  ON sa_crm_societe_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete societe comments"
  ON sa_crm_societe_comments
  FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);
