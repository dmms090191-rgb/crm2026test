/*
  # Create leads_sans_statut_count view

  ## Summary
  Creates a SQL view that efficiently computes the count of leads without a valid
  status directly in the database, replacing the current client-side approach that
  fetches all leads and all statuts and filters in JavaScript.

  ## New Views
  - `leads_sans_statut_count`
    - `count` (bigint): number of leads whose `statut` field is empty or does not
      match any `nom` in the `statuts` table

  ## Design Notes
  1. Uses a LEFT JOIN between leads and statuts to find non-matching statuts
  2. A lead is considered "sans statut" if its statut field is empty string OR
     there is no matching row in the statuts table (i.e., the statut value is unknown)
  3. This single query replaces two round-trips + client-side filtering, significantly
     reducing network overhead especially with large lead datasets
  4. Grants SELECT to authenticated users to match existing RLS patterns
*/

CREATE OR REPLACE VIEW leads_sans_statut_count AS
SELECT COUNT(*) AS count
FROM leads l
LEFT JOIN statuts s ON s.nom = l.statut
WHERE l.statut = '' OR l.statut IS NULL OR s.nom IS NULL;

GRANT SELECT ON leads_sans_statut_count TO authenticated;
