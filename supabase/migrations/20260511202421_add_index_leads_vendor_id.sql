/*
  # Add index on leads.vendor_id

  1. Changes
    - Add B-tree index on `leads.vendor_id` to speed up vendor-specific lead lookups
    - This index accelerates the primary query used in the vendor leads tab

  2. Notes
    - The vendor leads page filters by vendor_id on every load
    - Without this index, PostgreSQL performs a full table scan
*/

CREATE INDEX IF NOT EXISTS idx_leads_vendor_id ON leads (vendor_id);
