import type { ReactNode } from 'react';

/**
 * Une categorie du hub Notifications, quel que soit le panel.
 *
 * Le hub ne sait rien du metier : il recoit des cartes deja construites, avec
 * leur compteur. C'est le panel qui decide de ce qu'une categorie represente,
 * d'ou viennent ses donnees et de ce que le clic ouvre.
 */
export interface HubCardDef {
  /** Identifiant technique, stable. Sert de cle d'ordre et de masquage. */
  key: string;
  icon: ReactNode;
  /** Libelle PAR DEFAUT. Un renommage utilisateur le remplace a l'affichage. */
  label: string;
  desc: string;
  accent: string;
  accentBg: string;
  /** Nombre reel de notifications non lues. Jamais une valeur inventee. */
  count: number;
}
