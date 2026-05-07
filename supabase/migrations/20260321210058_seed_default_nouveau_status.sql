/*
  # Seed default "Nouveau" status

  1. Changes
    - Inserts the default "Nouveau" status into the `statuts` table
    - Uses ON CONFLICT to avoid errors if it already exists
    - Color: #38bdf8 (sky blue, matching the CRM theme)

  2. Purpose
    - Ensures the CRM works out of the box without manual configuration
    - The leads table defaults new leads to statut = 'Nouveau'
    - This migration guarantees that "Nouveau" exists in the statuts table
      so it appears correctly in filters, badges, and the CRM views
*/

INSERT INTO statuts (nom, couleur)
VALUES ('Nouveau', '#38bdf8')
ON CONFLICT (nom) DO NOTHING;
