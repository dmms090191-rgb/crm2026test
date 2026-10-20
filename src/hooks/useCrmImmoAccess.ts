import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { lireReponseAcces, type EtatAcces } from '../lib/crmImmoAccess';

/*
 * Le droit d'ouvrir CRM Immo, demande UNE SEULE FOIS par montage du panel.
 *
 * ---------- POURQUOI LA RPC ET NON UN SELECT ----------
 *
 * crm_immo_acces porte une colonne `active` : retirer le module passe `active` a
 * false SANS supprimer la ligne, pour garder la trace de qui l'avait accorde et
 * quand. Un SELECT ecrit sans `.eq('active', true)` ramenerait donc toujours la
 * ligne — onglet visible, cloche qui compte — et le refus n'arriverait qu'a la
 * premiere ecriture, sous la forme d'un 42501 incomprehensible.
 *
 * has_crm_immo_access teste `a.active`, exactement comme le font les 12 policies
 * des tables de donnees. Passer par elle rend la divergence impossible : ce que
 * l'interface croit et ce que la base autorise viennent de la MEME expression.
 *
 * Elle ne repond d'ailleurs qu'a qui a le droit de savoir — la Societe
 * elle-meme, son Groupe parent, ou Talvex — et n'est pas executable par anon.
 *
 * ---------- POURQUOI UN SEUL APPEL, DESCENDU EN PROP ----------
 *
 * La barre laterale et la Porte du renderer ont besoin du MEME verdict. Deux
 * appels donneraient deux verites, donc une panne intermittente ou l'onglet
 * existe sans que la vue s'ouvre, ou l'inverse. Ce hook est donc appele une
 * fois dans AdminDashboard et son etat descend aux deux.
 *
 * ---------- LE company_id EST CELUI DE LA SOCIETE VISITEE ----------
 *
 * useCompanyId() rend `overrideCompanyId ?? authCompanyId` (CompanyIdContext).
 * En Visu, Talvex et un Groupe voient donc le droit de la Societe qu'ils
 * VISITENT, pas le leur. C'est le comportement voulu, et il ne demande aucune
 * ligne de code en plus : chez Bellisimmo l'onglet est la, chez Torah il ne
 * l'est pas, pour tout le monde de la meme facon.
 */
export function useCrmImmoAccess(companyId: string | null) {
  const [etat, setEtat] = useState<EtatAcces>('inconnu');
  /* Le compteur annule les reponses d'un company_id qui n'est plus celui
     affiche : en Visu, on peut changer de Societe sans demonter le panel. */
  const demande = useRef(0);

  const interroger = useCallback(() => {
    if (!companyId) {
      /* Pas encore de company_id : la question n'a pas de sens, on reste en
         attente. Repondre 'refuse' ici ferait clignoter un refus a chaque
         montage, avant meme que la session soit lue. */
      setEtat('inconnu');
      return;
    }
    const n = ++demande.current;
    setEtat('inconnu');
    supabase
      .rpc('has_crm_immo_access', { p_company_id: companyId })
      .then(({ data, error }) => {
        if (n !== demande.current) return;
        setEtat(lireReponseAcces(data, error));
      });
  }, [companyId]);

  /*
   * Pas de fonction de nettoyage qui toucherait `demande` : le compteur suffit deja.
   * Chaque appel d'interroger() l'incremente, donc une reponse en vol pour un ANCIEN
   * company_id est rejetee par la comparaison a l'arrivee. Et sur demontage, un
   * setState tardif est sans effet depuis React 18.
   *
   * Lire une ref dans un nettoyage serait d'ailleurs signale par react-hooks :
   * sa valeur au moment du nettoyage n'est pas celle qu'on croit capturer.
   */
  useEffect(() => { interroger(); }, [interroger]);

  return { etat, recharger: interroger };
}
