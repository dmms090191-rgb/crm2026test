/*
  # Seed default "Nouveau" status for Super Admin prospects

  1. Changes
    - Inserts a default "Nouveau" status into `sa_statuts` if it does not already exist
    - Uses a neutral blue-grey color (#94a3b8) to distinguish from other statuses
  2. Important
    - This is idempotent: if "Nouveau" already exists, nothing is inserted
    - Does not affect any other statuts or tables
*/

INSERT INTO sa_statuts (nom, couleur)
SELECT 'Nouveau', '#94a3b8'
WHERE NOT EXISTS (
  SELECT 1 FROM sa_statuts WHERE nom = 'Nouveau'
);
