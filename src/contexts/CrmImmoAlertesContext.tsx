import { createContext, useContext, type ReactNode } from 'react';
import type { EtatAlertesImmo } from '../pages/admin/views/crm-immo/useCrmImmoAlertes';

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
 */

export interface AlertesImmoPartagees {
  /** L etat complet des alertes, tel que le hook le rend. Null si le module n est pas accorde. */
  etat: EtatAlertesImmo | null;
  /** Le dossier que le hub demande d ouvrir, ou null. */
  dossierAOuvrir: string | null;
  /** Le hub depose une demande ; la page la consomme et appelle ouvertureConsommee(). */
  demanderOuverture: (dossierId: string) => void;
  ouvertureConsommee: () => void;
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
