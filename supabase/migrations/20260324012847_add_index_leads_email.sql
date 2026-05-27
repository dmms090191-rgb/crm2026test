/*
  # Add explicit B-tree index on leads.email

  1. Changes
    - Creates a non-unique B-tree index `idx_leads_email` on `leads.email`
    - Covers all lookups including NULL / empty values (the existing partial unique
      index only covers non-null, non-empty rows)

  2. Notes
    - Uses IF NOT EXISTS to be safe for re-runs
    - No data is modified
    - Minimal, targeted change for the performance audit item
*/

CREATE INDEX IF NOT EXISTS idx_leads_email ON leads (email);
