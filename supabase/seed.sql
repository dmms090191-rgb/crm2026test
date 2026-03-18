-- CRM Seed Data
-- Minimal, idempotent seed for a fresh project.
-- Safe to run multiple times (uses INSERT ... ON CONFLICT DO NOTHING).

-- Default lead statuses
INSERT INTO statuts (nom, couleur) VALUES
  ('Nouveau',       '#38bdf8'),
  ('Contacté',      '#f59e0b'),
  ('Intéressé',     '#10b981'),
  ('Non intéressé', '#ef4444'),
  ('RDV planifié',  '#8b5cf6'),
  ('Converti',      '#22c55e'),
  ('Archivé',       '#6b7280')
ON CONFLICT (nom) DO NOTHING;
