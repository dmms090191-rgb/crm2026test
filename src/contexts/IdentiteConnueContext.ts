import { createContext, useContext } from 'react';

/**
 * L'IDENTIFIANT DU COMPTE CONNECTE, TEL QU'APP LE CONNAIT DEJA (19/11/2026).
 *
 * Au demarrage, App rend l'ecran puis lance refreshSession() sans l'attendre : ce rafraichissement
 * tient le verrou global d'auth-js (jusqu'a 46 s mesures). Tout getSession attend derriere lui.
 * La navigation mobile du panel Talvex (mini arc sous 768 px, barre de la coquille telephone)
 * redemandait ainsi une identite qu'App avait deja, et peignait les onglets PAR DEFAUT pendant
 * toute l'attente : la cle de son cache (sbl2:<panel>:<id>) n'existe pas sans identifiant.
 *
 * AppShell pose ici le `knownUserId` qu'il recoit, et rien d'autre. App ne le renseigne que pour
 * le Talvex Administrateur (saUserId, pose avec role = 'super_admin') ; aucune Visu ne le recoit,
 * et pour tout autre role la valeur reste nulle : le comportement d'avant, a l'identique.
 * C'est la MEME valeur que les graines initialUserId du menu du bureau (SuperAdminSidebar),
 * qui la recoivent par props depuis la meme source.
 *
 * C'est une valeur INITIALE : le getSession de chaque consommateur reste en place et la confirme.
 */
export const IdentiteConnueContext = createContext<string | null>(null);

export function useIdentiteConnue(): string | null {
  return useContext(IdentiteConnueContext);
}
