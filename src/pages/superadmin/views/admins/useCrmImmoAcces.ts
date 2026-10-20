import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../../lib/supabase';

/*
 * Quelles Societes possedent CRM Immo — vu depuis le panel Talvex.
 *
 * ---------- POURQUOI UNE REQUETE A PART, ET NON UN CHAMP DE list-admins ----------
 *
 * La liste des Societes vient de la fonction edge `list-admins`, qui ne renvoie
 * pas crm_immo_acces. Attendre un champ d'elle laisserait `enabled` a undefined
 * pour TOUT LE MONDE, et la bascule afficherait << desactive >> partout — en
 * silence, sans erreur, et avec l'air de marcher. On lit donc la table
 * directement : une seule requete pour toute la liste, pas une par ligne.
 *
 * Un super_admin a le droit de tout lire ici (policy << SA manage all crm immo
 * access >>, FOR ALL). Aucune jointure sur public.companies : sa RLS ne rendrait
 * qu'une ligne a un company_super_admin et viderait le resultat en silence. Les
 * noms de Societe, la liste les a deja.
 *
 * On ne garde que les lignes ACTIVES : retirer le module passe `active` a false
 * sans supprimer la ligne, pour conserver qui l'a accorde et quand. Une Societe
 * dont la ligne existe mais dort n'a PAS le module — c'est exactement ce que
 * teste has_crm_immo_access, et les deux doivent dire la meme chose.
 */
export function useCrmImmoAcces() {
  const [actives, setActives] = useState<Set<string>>(new Set());
  const [charge, setCharge] = useState(false);

  const recharger = useCallback(async () => {
    const { data, error } = await supabase
      .from('crm_immo_acces')
      .select('company_id')
      .eq('active', true);
    if (error) {
      /* On ne vide pas la liste sur une panne : afficher << personne n'a le
         module >> serait un mensonge, et un clic sur une bascule ainsi remise a
         zero accorderait le module a la place de le retirer. */
      setCharge(true);
      return;
    }
    setActives(new Set((data ?? []).map(l => l.company_id as string)));
    setCharge(true);
  }, []);

  useEffect(() => { void recharger(); }, [recharger]);

  return { actives, charge, recharger };
}
