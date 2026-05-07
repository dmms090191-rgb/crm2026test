/*
  # Change rdv_proposals.lead_id FK to ON DELETE CASCADE

  1. Modified Tables
    - `rdv_proposals`
      - Changed foreign key constraint on `lead_id` from ON DELETE SET NULL to ON DELETE CASCADE

  2. Behavior Change
    - Previously: deleting a lead would set rdv_proposals.lead_id to NULL (orphan records)
    - Now: deleting a lead automatically deletes all associated rdv_proposals rows

  3. Important Notes
    - This ensures no orphan appointment records remain after lead deletion
    - The denormalized fields (lead_name, lead_phone, lead_email) are no longer needed for orphan readability
*/

ALTER TABLE rdv_proposals
  DROP CONSTRAINT IF EXISTS rdv_proposals_lead_id_fkey;

ALTER TABLE rdv_proposals
  ADD CONSTRAINT rdv_proposals_lead_id_fkey
  FOREIGN KEY (lead_id)
  REFERENCES leads(id)
  ON DELETE CASCADE;
