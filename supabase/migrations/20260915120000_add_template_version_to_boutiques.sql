/*
  # `boutiques.template_version` — figer la version du modele utilisee par une boutique

  1. Probleme
     `boutiques` ne porte aujourd'hui que `template_key`. Rien ne dit QUELLE VERSION du modele
     une boutique utilise. Le jour ou « Johanna — Mode Luxe » evoluera — nouveaux assets,
     nouvelle geometrie, nouveau schema de reglages — publier la v2 changerait la scene de
     TOUTES les boutiques deja creees, d'un coup, sans retour arriere possible.

  2. Correctif
     Une colonne, un defaut, une contrainte. Les boutiques existantes basculent en version 1,
     qui est exactement le modele livre aujourd'hui : aucune ne change de comportement.

  3. Ce que la colonne pilote cote web
     Le dossier d'assets servi :
       /boutique3d/modeles/<template_key>/v<template_version>/
     Une v2 se publie donc a cote de la v1, et une boutique n'y passe que si sa ligne est
     mise a jour explicitement.

  4. Portee — volontairement etroite
     - Ajout de colonne uniquement. Aucune policy touchee : les trois policies de `boutiques`
       filtrent sur `company_id` et ignorent cette colonne.
     - `IF NOT EXISTS` : la migration est rejouable sans erreur.
     - Pas de contrainte sur `template_key`, qui reste un text libre. C'est un ecart connu
       (une faute de frappe produit une boutique sans modele) mais il est hors du sujet de
       cette migration, et le corriger demanderait de decider ou vit le catalogue des modeles.
*/

ALTER TABLE public.boutiques
  ADD COLUMN IF NOT EXISTS template_version smallint NOT NULL DEFAULT 1;

ALTER TABLE public.boutiques
  DROP CONSTRAINT IF EXISTS boutiques_template_version_positive;

ALTER TABLE public.boutiques
  ADD CONSTRAINT boutiques_template_version_positive
  CHECK (template_version >= 1);

COMMENT ON COLUMN public.boutiques.template_version IS
  'Version du modele (`template_key`) utilisee par cette boutique. Decide du dossier d''assets '
  'servi : /boutique3d/modeles/<template_key>/v<template_version>/. Une nouvelle version du '
  'modele ne s''applique a une boutique que si cette colonne est mise a jour explicitement.';
