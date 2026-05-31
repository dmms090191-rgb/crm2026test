/*
  # Seed Builder Ready template

  1. New Data
    - Inserts a new `builder_ready` template into `site_templates`
    - Name: "Builder Ready"
    - Category: "Universel"
    - Description: Template mobile-first universel concu pour l'editeur Talvex
    - Not set as default

  2. Notes
    - Uses ON CONFLICT to avoid duplicate insertion
    - Template is visible and available for selection
*/

INSERT INTO site_templates (name, slug, template_key, description, category, is_default)
VALUES (
  'Builder Ready',
  'builder-ready',
  'builder_ready',
  'Template universel mobile-first, concu specialement pour l''editeur Talvex. Responsive a 100%, securise et adaptable a tous les metiers.',
  'Universel',
  false
)
ON CONFLICT (slug) DO NOTHING;
