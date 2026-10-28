-- Le telephone du PROPRIETAIRE.
--
-- Le module suivait deja quatre champs de personne, mais un seul telephone — celui du
-- LOCATAIRE (colonne `telephone`, saisie sous « Telephone » dans le formulaire). Le
-- proprietaire avait un nom et un prenom, et aucun moyen de l'appeler.
--
-- ---------- POURQUOI UNE VRAIE COLONNE, ET PAS UNE COLONNE PERSONNALISEE ----------
--
-- Le module sait deja porter des colonnes personnalisees (table crm_immo_colonnes,
-- valeurs rangees dans crm_immo_dossiers.valeurs). Ce n'est pourtant pas la bonne
-- place, pour deux raisons mesurees :
--
--   1. Une colonne personnalisee appartient a UNE Societe (crm_immo_colonnes.company_id).
--      Chaque agence devrait donc la recreer chez elle, avec son propre nom, et deux
--      agences finiraient avec « Tel proprio » et « Numero du proprietaire ». Le telephone
--      du proprietaire est un champ du METIER, pas une preference d'affichage.
--   2. C'est exactement le chemin inverse de celui qu'a pris `mode_paiement` le
--      23/10/2026 : il VIVAIT en colonne personnalisee, et la migration 20261023000021 l'a
--      promu en vraie colonne « pour qu'il n'y ait qu'UNE source de verite ».
--
-- ---------- POURQUOI AUCUNE CONTRAINTE ----------
--
-- `telephone` n'en porte aucune, et c'est deliberement le meme choix. Un numero se saisit
-- avec ou sans indicatif, avec des espaces, des points ou des tirets, et une agence qui
-- travaille a l'international en verra de toutes les formes. Un CHECK sur un format
-- refuserait un numero valide, et le refus de Postgres arriverait sous une forme que
-- personne ne comprend. La seule regle utile — ne pas stocker de chaine vide — est
-- appliquee cote interface, qui transforme un champ vide en NULL comme pour tous les
-- autres champs.
--
-- ---------- REVERSIBLE EN UNE LIGNE ----------
--
--   alter table public.crm_immo_dossiers drop column if exists telephone_proprietaire;
--
-- Rien d'autre a defaire : aucune contrainte, aucun index, aucune policy. Les policies de
-- la table sont au niveau de la LIGNE (company_id) et ne nomment aucune colonne, donc le
-- cloisonnement multi-tenant couvre cette colonne sans un mot de plus.

alter table public.crm_immo_dossiers
  add column if not exists telephone_proprietaire text;

comment on column public.crm_immo_dossiers.telephone_proprietaire is
  'Telephone du PROPRIETAIRE, ou NULL si non renseigne. A ne pas confondre avec `telephone`, qui est celui du LOCATAIRE. Rappel du piege de cette table : `locataire` porte le NOM du proprietaire et `proprietaire` son PRENOM.';
