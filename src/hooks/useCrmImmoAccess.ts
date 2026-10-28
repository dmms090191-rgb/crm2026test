import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { demanderAcces, decrireErreur, type EtatAcces, type DetailErreur } from '../lib/crmImmoAccess';

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
  /* Ce que l'ecran affichera si la porte se ferme sur une panne : code et message REELS.
     Sans cela, « la verification a echoue » ne distingue pas un droit refuse d'un reseau
     qui renonce — et c'est ce qui a coute une heure de diagnostic le 26/10/2026. */
  const [detail, setDetail] = useState<DetailErreur | null>(null);
  /* Le compteur annule les reponses d'un company_id qui n'est plus celui
     affiche : en Visu, on peut changer de Societe sans demonter le panel.
     Il couvre aussi le RECUL du reessai : si la Societe change pendant les
     2,5 secondes d'attente, la reponse tardive est rejetee a l'arrivee. */
  const demande = useRef(0);

  const interroger = useCallback(() => {
    if (!companyId) {
      /* Pas encore de company_id : la question n'a pas de sens, on reste en
         attente. Repondre 'refuse' ici ferait clignoter un refus a chaque
         montage, avant meme que la session soit lue. */
      setEtat('inconnu');
      setDetail(null);
      return;
    }
    const n = ++demande.current;
    setEtat('inconnu');
    setDetail(null);
    /*
     * La SEQUENCE vit dans demanderAcces, pas ici : un seul reessai, reserve au cas ou la
     * reponse n'est jamais arrivee. La raison est mesuree (voir src/lib/crmImmoAccess.ts) —
     * la requete aboutit cote serveur, mais met parfois 23 secondes, et le navigateur du
     * telephone renonce avant. Reessayer un REFUS serait absurde, et reessayer en boucle
     * aggraverait la file d'attente qui cause la panne.
     *
     * L'appel est enveloppe dans une fonction async plutot que passe tel quel : le
     * constructeur de requete de supabase-js est « thenable » sans etre une vraie promesse,
     * et c'est exactement le genre d'objet qui se comporte autrement qu'il n'en a l'air.
     */
    demanderAcces(
      async () => {
        const { data, error } = await supabase
          .rpc('has_crm_immo_access', { p_company_id: companyId });
        return { data, error };
      },
      (ms) => new Promise<void>((resoudre) => { setTimeout(resoudre, ms); }),
    ).then(({ etat: resolu, detail: info }) => {
      if (n !== demande.current) return;
      setEtat(resolu);
      setDetail(info);
    }).catch((leve: unknown) => {
      /*
       * LE FILET, ET IL N'EST PAS DECORATIF.
       *
       * postgrest-js ne REJETTE pas : il attrape la panne de fetch et rend un objet error.
       * Mais « ne rejette pas aujourd'hui » n'est pas « ne rejettera jamais » — et le prix
       * d'un rejet non attrape ici serait exactement celui deja paye le 25/10/2026 sur le
       * coffre Capacitor : setEtat n'est jamais appele, l'etat reste 'inconnu', et la Porte
       * affiche un rond qui tourne INDEFINIMENT. Une panne silencieuse et sans fin est pire
       * qu'une panne nommee.
       *
       * On conclut donc toujours, meme sur un chemin qu'on croit impossible.
       */
      if (n !== demande.current) return;
      setEtat('erreur');
      setDetail(decrireErreur(leve) ?? {
        code: null, message: 'Erreur inattendue', transport: true,
      });
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

  return { etat, detail, recharger: interroger };
}
