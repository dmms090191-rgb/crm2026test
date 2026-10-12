/*
  # Template de site « Numerologie celeste »

  1. Objectif
     Inscrire le template dans la bibliotheque du panel Talvex Administrateur. Le rendu lui-meme
     est du CODE : `template_key` est la cle d'un registre React (templateRegistry.tsx), et c'est
     le composant NumerologieTemplate qui dessine la page. Cette ligne ne fait que rendre le
     template CHOISISSABLE.

  2. Ce que cette migration ne fait PAS, volontairement
     - Elle ne cree aucune page de site : rien n'est publie, aucune URL ne sert ce template.
     - Elle ne touche pas a `company_home_pages`, et surtout pas a la ligne de portee
       `platform` (slug « talvex »), qui porte la landing page de Talvex. Appliquer un template
       a cette ligne REMPLACERAIT la page d'accueil pour tous les visiteurs, bouton de connexion
       compris — c'est interdit par les regles du projet.
     - Elle n'attribue le template a aucune societe (`site_template_assignments` inchangee).

  3. Colonnes
     Seules `slug` et `template_key` sont obligatoires ; les autres ont un defaut. On renseigne
     tout de meme name, description et category, sans quoi la carte s'afficherait sans titre.
     Les libelles sont ecrits SANS accents, comme les neuf lignes deja presentes.

     `config` est volontairement laissee a son defaut `{}` : la colonne existe mais AUCUNE ligne
     du code ne la lit. Y mettre des parametres de scene donnerait l'illusion d'une
     configuration, alors que rien ne la consommerait.

  4. Reversibilite
     Pour retirer le template du choix sans rien casser : passer `is_visible` a false. C'est le
     mecanisme deja utilise pour fitness, immobilier, pompe a chaleur et renovation — un site qui
     utilise un template masque continue de fonctionner, car `active_template_id` est preserve.

  5. Idempotence
     `ON CONFLICT (template_key) DO NOTHING` : la migration peut etre rejouee sans effet de bord,
     et ne touche jamais une ligne existante.
*/

INSERT INTO public.site_templates (name, slug, template_key, description, category, is_default, is_visible)
VALUES (
  'Numerologie celeste',
  'numerologie-celeste',
  'numerologie_celeste',
  'Experience 3D immersive : ciel profond, mer de nuages volumetriques, rayons dores et sanctuaire circulaire a neuf colonnes. Scene chargee a la demande, qualite adaptee a l appareil, repli complet sans WebGL.',
  'Spiritualite',
  false,
  true
)
ON CONFLICT (template_key) DO NOTHING;
