/*
  # Template de site « ישראל חיה »

  Experience 3D cinematographique en six chapitres, pilotee par le defilement, en hebreu RTL.
  Quatre chapitres sont des films generes, scrubes par le scroll ; deux sont en temps reel
  (le mecanisme d'anneaux numerologiques et l'arbre de vie).

  Comme pour « numerologie_celeste », la cle `israel_haya` est celle d'un registre React :
  c'est le composant IsraelHayaTemplate qui dessine la page, via un hote paresseux. Cette
  ligne ne fait que rendre le template choisissable dans la bibliotheque.

  Ce qu'elle ne fait PAS : aucune page de site n'est creee, rien n'est publie, et la ligne de
  portee « platform » (la landing de Talvex) n'est ni lue ni ecrite.

  Reversible : passer is_visible a false retire le template du choix sans rien casser.
  Idempotent : ON CONFLICT (template_key) DO NOTHING.
*/

INSERT INTO public.site_templates (name, slug, template_key, description, category, is_default, is_visible, thumbnail_url)
VALUES (
  'Israel Haya',
  'israel-haya',
  'israel_haya',
  'Voyage 3D cinematographique en six chapitres, pilote par le defilement, en hebreu RTL : la descente de la colombe, les portes de Jerusalem, le mecanisme des nombres, l arbre de vie, le cabinet et la carte. Films scrubes au scroll et scenes temps reel.',
  'Spiritualite',
  false,
  true,
  '/site-templates/israel-haya.jpg'
)
ON CONFLICT (template_key) DO NOTHING;
