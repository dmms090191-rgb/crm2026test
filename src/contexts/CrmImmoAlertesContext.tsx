import { createContext, useContext, type ReactNode } from 'react';
import type { EtatAlertesImmo } from '../pages/admin/views/crm-immo/useCrmImmoAlertes';
import type { CategorieImmo, CompteursImmo } from '../lib/crmImmoEcheancier';

/*
 * LA SOURCE UNIQUE DES ALERTES CRM IMMO.
 *
 * ---------- POURQUOI UN CONTEXTE ----------
 *
 * Les alertes servent maintenant DEUX surfaces :
 *   - le hub Notifications general, dans TopBar : le compteur et la liste ;
 *   - la page du module : la cloche locale, avec ses filtres Actives / Traitees /
 *     Toutes, ses actions << lire >> et << traiter >>, et son historique.
 *
 * Les deux doivent montrer EXACTEMENT la meme chose. Deux appels donneraient deux
 * verites : le compteur du hub et celui de la cloche divergeraient des qu une alerte
 * serait traitee d un cote, et personne ne saurait lequel croire.
 *
 * L appel vit donc UNE SEULE FOIS dans AdminDashboard, et son resultat passe ici.
 * Le hub le recoit en props — il est juste a cote — et la page le lit par ce
 * contexte, pour ne pas traverser CrmImmoGate avec une prop qui ne la concerne pas.
 *
 * ---------- ET L OUVERTURE D UN DOSSIER ----------
 *
 * Un clic sur une alerte du hub doit ouvrir LE BON dossier. Le hub vit dans la barre
 * du haut, la page dans la zone principale : ils ne se connaissent pas. Le contexte
 * porte donc aussi la demande d ouverture — le hub la depose, la page la consomme.
 *
 * ---------- ET LE CLASSEMENT DU TABLEAU DE BORD ----------
 *
 * Depuis le 22 octobre 2026, CHACUNE des sept cartes du dashboard ouvre la page du
 * module sur sa propre liste. Deux choses passent donc par ici :
 *
 *   - le CLASSEMENT lui-meme — quels dossiers appartiennent a quelle categorie. Il est
 *     calcule une seule fois, dans AdminDashboard, par le hook qui alimente deja les
 *     cartes. La page ne le recalcule pas : elle lirait d autres lignes, avec une autre
 *     horloge, et afficherait un autre chiffre que la carte cliquee.
 *   - la DEMANDE de filtre — quelle categorie la carte vient de demander. Meme motif
 *     que l ouverture d un dossier : la carte depose, la page consomme. Le contexte vit
 *     AU-DESSUS d AdminViewRenderer, donc la demande survit au changement de vue, ce
 *     qu une prop ne ferait pas.
 */

export interface AlertesImmoPartagees {
  /** L etat complet des alertes, tel que le hook le rend. Null si le module n est pas accorde. */
  etat: EtatAlertesImmo | null;
  /** Le dossier que le hub demande d ouvrir, ou null. */
  dossierAOuvrir: string | null;
  /** Le hub depose une demande ; la page la consomme et appelle ouvertureConsommee(). */
  demanderOuverture: (dossierId: string) => void;
  ouvertureConsommee: () => void;
  /** La categorie qu une carte du dashboard demande d appliquer a l arrivee, ou null. */
  filtreADemander: CategorieImmo | null;
  /** Une carte depose la demande ; la page la consomme et appelle filtreConsomme(). */
  demanderFiltre: (filtre: CategorieImmo) => void;
  filtreConsomme: () => void;
  /**
   * Le classement du tableau de bord, ou null si la Societe n a pas le module.
   *
   * `chargement` est vrai tant que les periodes et les encaissements ne sont pas
   * revenus : la page affiche alors une attente, et surtout PAS << aucun dossier >>,
   * qui ferait croire que le filtre ne trouve rien.
   */
  tableauDeBord: {
    compteurs: CompteursImmo;
    dossiersParCategorie: Record<CategorieImmo, Set<string>>;
    chargement: boolean;
    /**
     * LE JOUR DE REFERENCE, ET IL EST VIVANT.
     *
     * 'AAAA-MM-JJ' en Asia/Jerusalem, avance par le minuteur du tableau de bord — une
     * seule horloge pour tout le module, depuis le 28/10/2026.
     *
     * POURQUOI IL TRAVERSE. L'echeancier calculait le sien, dans un useMemo dont la seule
     * dependance etait une constante de module : il etait donc FIGE au montage. Une modale
     * laissee ouverte a cheval sur minuit gardait les statuts de la veille, pendant que les
     * cartes, elles, avancaient. Deux horloges, deux verites.
     *
     * Et c'est bien le partage qu'il fallait, pas un second minuteur : une seconde horloge
     * aurait pu franchir minuit a un autre instant que la premiere, et faire dire aux
     * cartes et a la modale deux choses differentes pendant quelques secondes.
     */
    aujourdhui: string;
    /**
     * Relit les periodes et les encaissements tout de suite.
     *
     * Le hook a son propre rythme — cinq minutes, plus le retour de visibilite. Apres
     * un renouvellement ou un encaissement, attendre ce rythme laisserait le dossier
     * dans la mauvaise categorie, et la carte sur un chiffre perime.
     */
    recharger: () => Promise<void>;
  } | null;
}

const Contexte = createContext<AlertesImmoPartagees | null>(null);

export function CrmImmoAlertesProvider(
  { valeur, children }: { valeur: AlertesImmoPartagees; children: ReactNode },
) {
  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

/**
 * Les alertes partagees.
 *
 * Rend null hors du fournisseur plutot que de lever : la page du module n est montee
 * que sous AdminDashboard, mais une vue isolee (un test, un futur panel) ne doit pas
 * planter pour autant.
 */
export function useAlertesImmoPartagees(): AlertesImmoPartagees | null {
  return useContext(Contexte);
}
