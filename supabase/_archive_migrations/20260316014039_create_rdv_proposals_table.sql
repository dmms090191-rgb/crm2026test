/*
  # Create rdv_proposals table

  1. New Tables
    - `rdv_proposals`
      - `id` (uuid, primary key)
      - `vendor_id` (uuid, references vendors)
      - `lead_id` (uuid, references leads, nullable)
      - `lead_name` (text) - contact name for the rdv
      - `lead_phone` (text) - contact phone
      - `lead_email` (text) - contact email
      - `proposed_date` (date) - proposed date
      - `proposed_time` (text) - proposed time slot
      - `notes` (text) - additional notes
      - `status` (text) - pending / confirmed / cancelled / done
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `rdv_proposals` table
    - Authenticated users can read all rdv_proposals
    - Authenticated users can insert/update/delete rdv_proposals
*/

CREATE TABLE IF NOT EXISTS rdv_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES vendors(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  lead_name text NOT NULL DEFAULT '',
  lead_phone text NOT NULL DEFAULT '',
  lead_email text NOT NULL DEFAULT '',
  proposed_date date NOT NULL,
  proposed_time text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE rdv_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read rdv_proposals"
  ON rdv_proposals FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert rdv_proposals"
  ON rdv_proposals FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update rdv_proposals"
  ON rdv_proposals FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete rdv_proposals"
  ON rdv_proposals FOR DELETE
  TO authenticated
  USING (true);
