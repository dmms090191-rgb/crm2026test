/*
  # Seed checklist items for Page d'accueil

  Inserts initial checklist items for the "page-accueil" page key,
  based on the real analysis of App.tsx, LoginModal.tsx, and RegisterModal.tsx.

  Sections:
    - ui: visual/layout items
    - fonctionnalites: functional behavior items
    - tests: testing items
    - ux-design: user experience / design items

  All items are non-custom (is_custom = false) and unchecked by default.
  Uses INSERT ... ON CONFLICT DO NOTHING to be safe on re-runs.
*/

INSERT INTO crm_page_checklist_items (page_key, section, label, position, is_custom) VALUES
  ('page-accueil', 'ui', 'Header avec logo Novigo 3D et bouton Connexion', 0, false),
  ('page-accueil', 'ui', 'Hero section avec titre, sous-titre et CTA', 1, false),
  ('page-accueil', 'ui', 'Footer avec copyright', 2, false),
  ('page-accueil', 'ui', 'Gradient de fond slate-900 vers slate-800', 3, false),
  ('page-accueil', 'ui', 'Badge "Intelligence Artificielle" au-dessus du titre', 4, false),
  ('page-accueil', 'ui', 'Gradient orange-pink sur le texte "en 3D"', 5, false),
  ('page-accueil', 'ui', 'Modale de connexion (email + PIN 6 chiffres)', 6, false),
  ('page-accueil', 'ui', 'Modale d''inscription (prenom, nom, email, PIN, telephone)', 7, false),

  ('page-accueil', 'fonctionnalites', 'Connexion via supabase.auth.signInWithPassword', 0, false),
  ('page-accueil', 'fonctionnalites', 'Detection du role (admin/vendor/client) via app_metadata', 1, false),
  ('page-accueil', 'fonctionnalites', 'Redirection vers le bon dashboard selon le role', 2, false),
  ('page-accueil', 'fonctionnalites', 'Inscription avec insertion dans la table registrations', 3, false),
  ('page-accueil', 'fonctionnalites', 'Sauvegarde des emails recents dans localStorage', 4, false),
  ('page-accueil', 'fonctionnalites', 'Auto-completion des emails sur le champ de login', 5, false),
  ('page-accueil', 'fonctionnalites', 'Navigation PIN avec fleches et backspace', 6, false),
  ('page-accueil', 'fonctionnalites', 'Son de clic sur saisie du PIN', 7, false),
  ('page-accueil', 'fonctionnalites', 'Bouton afficher/masquer le PIN', 8, false),
  ('page-accueil', 'fonctionnalites', 'Deconnexion (supabase.auth.signOut)', 9, false),
  ('page-accueil', 'fonctionnalites', 'Ecoute onAuthStateChange pour mise a jour du role', 10, false),

  ('page-accueil', 'tests', 'Tester connexion admin avec bonnes credentials', 0, false),
  ('page-accueil', 'tests', 'Tester connexion vendor avec bonnes credentials', 1, false),
  ('page-accueil', 'tests', 'Tester connexion client avec bonnes credentials', 2, false),
  ('page-accueil', 'tests', 'Tester erreur de connexion (mauvais PIN)', 3, false),
  ('page-accueil', 'tests', 'Tester inscription avec tous les champs remplis', 4, false),
  ('page-accueil', 'tests', 'Tester inscription avec email duplique', 5, false),
  ('page-accueil', 'tests', 'Tester la deconnexion et retour a la landing', 6, false),
  ('page-accueil', 'tests', 'Verifier la persistance du session/token', 7, false),
  ('page-accueil', 'tests', 'Tester le responsive mobile', 8, false),

  ('page-accueil', 'ux-design', 'Contraste texte suffisant sur fond sombre', 0, false),
  ('page-accueil', 'ux-design', 'Feedback visuel sur erreur de connexion', 1, false),
  ('page-accueil', 'ux-design', 'Etat loading sur les boutons Valider / S''inscrire', 2, false),
  ('page-accueil', 'ux-design', 'Message de succes apres inscription', 3, false),
  ('page-accueil', 'ux-design', 'Navigation clavier fluide sur les champs PIN', 4, false),
  ('page-accueil', 'ux-design', 'Fermeture modale au clic sur le X', 5, false),
  ('page-accueil', 'ux-design', 'Transition entre modale login et inscription', 6, false),
  ('page-accueil', 'ux-design', 'Spinner de chargement pendant la detection du role', 7, false)
ON CONFLICT DO NOTHING;
