-- =============================================================================
-- CRM Immo : deux colonnes CANONIQUES de nom complet
-- =============================================================================
--
-- Le module affichait un nom de personne en le COMPOSANT de deux colonnes, a dix
-- endroits et dans deux ordres. David veut un seul champ a remplir : << Nom prenom
-- locataire >> et << Nom prenom proprietaire >>.
--
-- ---------- POURQUOI DE VRAIES COLONNES, ET PAS UNE REECRITURE DES ANCIENNES ----------
--
-- Parce que decouper est MESURE FAUX, et faux en silence. Mesure du 28/10/2026, role
-- postgres, RLS ignoree : sur les deux dossiers existants, un porte DEUX mots dans
-- `locataire` ET DEUX mots dans `proprietaire`. La frontiere reelle y est 2|2 ; toute
-- regle au premier espace rendrait 1|3, toute regle au dernier espace rendrait 3|1.
-- Pire : la chaine RECOMPOSEE apres une recoupe fautive reste identique au caractere
-- pres, donc ni le tableau, ni les cartes, ni la recherche, ni le tri ne verraient la
-- corruption. Elle serait invisible exactement la ou on la chercherait.
--
-- Et parce que la seule colonne ou le nom complet du LOCATAIRE pourrait loger sans
-- nouvelle colonne est `nom`, qui est NOT NULL avec un CHECK de non-vacuite. `prenom`
-- resterait alors soit divergent — deux sources de verite — soit vide, ce qui est une
-- perte sur la totalite du stock. Reutiliser les anciennes colonnes est sur du cote
-- proprietaire et fautif du cote locataire : la solution ne pouvait pas etre symetrique.
--
-- ---------- CE QUE CETTE MIGRATION NE FAIT PAS ----------
--
-- AUCUN BACKFILL. Les deux colonnes naissent NULLES sur tout le stock, et c'est le
-- choix de David. L'affichage retombe alors sur la composition des anciennes colonnes,
-- donc l'ecran est STRICTEMENT celui d'avant. La precedence vit dans
-- src/lib/crmImmoIdentite.ts (nomCanonique) et nulle part ailleurs.
--
-- AUCUNE CONTRAINTE, aucun NOT NULL, aucun CHECK, aucun index, aucune policy touchee.
-- Mesure prealable (role postgres) : 18 colonnes, 9 contraintes, 5 index, 3 declencheurs,
-- 3 policies, 0 vue dependante, 0 grant au niveau COLONNE, 0 colonne generee. Aucune
-- contrainte ne nomme une colonne de personne hors `nom`. Les policies filtrent la LIGNE
-- par company_id : le cloisonnement multi-tenant couvre donc les colonnes neuves sans
-- une instruction de plus.
--
-- NI NOT NULL NI CHECK, ET C'EST DELIBERE. Une canonique NOT NULL ferait lever 23502 a
-- la restauration d'une sauvegarde anterieure a cette migration, puisque
-- crm_immo_restaurer_lot derive ses colonnes de la PREMIERE LIGNE du lot : une colonne
-- absente de ce lot n'entre ni dans l'INSERT ni dans le ON CONFLICT DO UPDATE SET.
--
-- ---------- LES ANCIENNES COLONNES RESTENT, ET ON NE LES RENOMME JAMAIS ----------
--
-- `locataire` porte le NOM du proprietaire et `proprietaire` son PRENOM. Ces deux cles
-- mentent sur leur contenu depuis l'origine. Les renommer casserait les sauvegardes
-- deja prises. Les deux cles AJOUTEES ici, elles, disent ce qu'elles portent.
--
-- ---------- ANNULATION ----------
--
--   alter table public.crm_immo_dossiers drop column if exists nom_complet_locataire;
--   alter table public.crm_immo_dossiers drop column if exists nom_complet_proprietaire;
--
-- Sans CASCADE, sans objet a recreer. CE QU'ON PERDRAIT NOMMEMENT : toute saisie de nom
-- faite APRES cette migration sur un dossier ANCIEN — ses quatre anciennes colonnes
-- portent encore la valeur d'avant, donc la composition reviendrait silencieusement au
-- nom pre-migration. Les dossiers CREES apres, eux, ne perdraient rien : la canonique y
-- est recopiee verbatim dans `nom` (et dans `locataire`).
-- =============================================================================

alter table public.crm_immo_dossiers
  add column if not exists nom_complet_locataire text;

alter table public.crm_immo_dossiers
  add column if not exists nom_complet_proprietaire text;

comment on column public.crm_immo_dossiers.nom_complet_locataire is
  'Nom complet du LOCATAIRE, tel que saisi dans le champ unique. Source de verite de '
  'l''affichage quand elle est renseignee ; sinon l''interface compose nom + prenom, dans '
  'cet ordre. JAMAIS decoupee : la frontiere nom/prenom n''est pas deductible des espaces '
  '(mesure du 28/10/2026 : faux sur 1 dossier sur 2). Nullable et sans contrainte a '
  'dessein — une canonique NOT NULL ferait echouer la restauration d''une sauvegarde '
  'anterieure a cette migration.';

comment on column public.crm_immo_dossiers.nom_complet_proprietaire is
  'Nom complet du PROPRIETAIRE, tel que saisi dans le champ unique. Repli de composition '
  'sur locataire + proprietaire, dans cet ordre — rappel : `locataire` porte le NOM du '
  'proprietaire et `proprietaire` son PRENOM, et ces deux cles ne se renomment jamais. '
  'Memes regles que nom_complet_locataire : jamais decoupee, nullable, sans contrainte.';
