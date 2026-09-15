/*
  # Table `boutique_reglages` — les reglages 3D d'une boutique

  1. Objectif
     `boutiques` porte la boutique ; sa migration d'origine (20260914185047) annonce que les
     elements futurs viendront dans des tables ENFANTS referencant `boutique_id`. C'est la
     premiere. Elle porte ce que le PROPRIETAIRE decide et qui vaut pour tous ses visiteurs.

  2. Pourquoi UNE table et un JSONB, et pas cinq tables
     Le besoin mesure dans le moteur est d'environ trente valeurs scalaires plus une petite
     liste de morceaux, par boutique. Cinq tables par domaine demanderaient cinq jointures pour
     afficher une boutique, sans rien apporter, et figeraient un schema sur des fonctionnalites
     qui n'existent pas encore. Le catalogue d'articles, lui, meritera sa table relationnelle —
     quand il existera.

  3. Colonnes
     - `boutique_id` uuid, CLE PRIMAIRE et cle etrangere vers `boutiques(id)`, ON DELETE CASCADE.
       Une boutique a au plus une ligne de reglages ; sa suppression emporte ses reglages.
     - `donnees`     jsonb : sections `playlist`, `musique`, `lumiere`, `televisions`
     - `maj`         timestamptz

  4. CE QUI NE DOIT JAMAIS ENTRER DANS `donnees`
     `preferences` (taille et opacite des manches, disposition posee au doigt, vitesse de
     marche, mesures, panneau replie, categorie courante) et `volume`. Ce sont des reglages de
     l'APPAREIL qui regarde, pas de la boutique regardee : les publier reviendrait a servir a
     tous les visiteurs les reglages tactiles d'un seul. Le moteur fait deja ce tri avant
     d'envoyer ; cette table ne doit pas rouvrir la porte.
*/

CREATE TABLE IF NOT EXISTS public.boutique_reglages (
  boutique_id uuid        PRIMARY KEY REFERENCES public.boutiques(id) ON DELETE CASCADE,
  donnees     jsonb       NOT NULL DEFAULT '{}'::jsonb,
  maj         timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.boutique_reglages IS
  'Reglages 3D d''une boutique : une ligne par boutique. Sections de `donnees` : playlist, '
  'musique, lumiere, televisions. Jamais de section `preferences` ni de champ `volume` : ce '
  'sont des reglages de l''appareil du visiteur, pas de la boutique.';

ALTER TABLE public.boutique_reglages ENABLE ROW LEVEL SECURITY;

/*
  ------------------------------------------------------------------------------------------
  UNE SEULE POLICY, PAR DELEGATION A `boutiques`

  Les autres tables de ce depot ecrivent trois policies, une par role, en relisant le JWT.
  Ici la regle est DEJA ECRITE : elle est dans les policies de `boutiques`. La recopier
  reviendrait a maintenir deux fois la meme logique — et ce depot a deja paye cet ecart : la
  migration 20260914190653 corrige une branche Groupe qui ne s'activait jamais, parce que le
  sous-SELECT sur `companies` etait filtre par la RLS de `companies`. Ce fichier note d'ailleurs
  que `csa_company_statuts` presente encore le meme motif.

  On s'appuie donc sur ce mecanisme au lieu de le contourner : le sous-SELECT sur `boutiques`
  EST filtre par la RLS de `boutiques`, et c'est exactement ce qu'on veut. La regle devient :

      « tu peux lire et ecrire les reglages d'une boutique que tu peux voir »

  juste pour les trois roles sans en nommer aucun, et incapable de deriver — toute evolution
  des policies de `boutiques` s'applique ici automatiquement.

  Verifie avant d'ecrire ceci :
    - les trois policies de `boutiques` sont FOR ALL : quiconque VOIT une boutique peut deja la
      modifier. Deleguer lecture ET ecriture n'accorde donc aucun droit nouveau ;
    - aucune policy de `boutiques` ne reference `boutique_reglages` : pas de recursion ;
    - `is_child_company_of_caller` reste utilisee, indirectement, via `boutiques`.
  ------------------------------------------------------------------------------------------
*/
DROP POLICY IF EXISTS "Reglages des boutiques visibles" ON public.boutique_reglages;
CREATE POLICY "Reglages des boutiques visibles"
  ON public.boutique_reglages AS PERMISSIVE FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.boutiques b
      WHERE b.id = boutique_reglages.boutique_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.boutiques b
      WHERE b.id = boutique_reglages.boutique_id
    )
  );

/*
  Pas de policy `TO anon`, volontairement : aucune boutique n'est consultable sans compte
  aujourd'hui, et `boutiques` elle-meme n'en a pas. Le jour ou une vitrine publique existera,
  il faudra une policy de LECTURE SEULE explicite, ici et sur `boutiques`.
*/
