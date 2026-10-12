/*
  # Vignette du template « Numerologie celeste »

  1. Objectif
     Donner au template sa vignette de bibliotheque. L'image est une CAPTURE DE LA SCENE
     REELLE, prise par scripts/captureVignetteTemplate.mjs via la propre route d'apercu du
     template — pas une illustration, pas une image generee. Si la scene evolue, on relance
     le script et la vignette suit : elle ne peut donc pas mentir sur ce que le template rend.

  2. Chemin
     /site-templates/numerologie-celeste.jpg, servi depuis public/. 1280x720 (le rapport 16/9
     qu'attend la carte de la bibliotheque), 56 ko en JPEG.

  3. Portee — volontairement etroite
     UPDATE sur la SEULE ligne numerologie_celeste, identifiee par sa template_key. Les neuf
     templates existants ne sont pas touches : leur thumbnail_url reste nul, et leur carte
     continue d'afficher son degrade exactement comme avant.
     Aucune autre colonne n'est modifiee. Rien n'est publie : ce template n'est servi par
     aucune page, et la ligne de portee « platform » (la landing de Talvex) n'est pas lue ici.

  4. Reversibilite
     Repasser thumbnail_url a NULL rend a la carte son degrade de repli, sans rien casser.
*/

UPDATE public.site_templates
SET thumbnail_url = '/site-templates/numerologie-celeste.jpg',
    updated_at = now()
WHERE template_key = 'numerologie_celeste';
