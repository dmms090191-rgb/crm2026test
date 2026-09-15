/**
 * Declaration TypeScript du point d'entree du moteur de boutique 3D.
 *
 * POURQUOI CE FICHIER EXISTE
 * Le moteur vient du projet Johanna 2 et est ecrit en JavaScript / JSX. Vite le compile sans
 * broncher — `.jsx` fait partie des extensions qu'il resout par defaut. Mais `tsconfig.app.json`
 * ne pose pas `allowJs` : pour TypeScript, `./monterBoutique` n'existe pas, et tout `.tsx` qui
 * l'importerait ferait echouer `npm run typecheck` sur un TS2307. Comme rien dans la chaine de
 * deploiement ne lance `tsc` — `vite build` seul, pas de buildCommand cote Vercel, pas de CI —
 * la rupture serait silencieuse en production et permanente en local.
 *
 * Ce fichier la evite, sans toucher a `tsconfig`, sans `allowJs`, et sans porter les 38 modules
 * du moteur en TypeScript. TypeScript trouve ces types, Vite charge le `.jsx` a cote.
 *
 * CONSEQUENCE ASSUMEE : le moteur echappe a ESLint et a l'audit qualite du projet. Il garde en
 * echange ses 17 fichiers de tests Playwright, qui mesurent son comportement reel.
 */
import type { ReactElement } from 'react';

/**
 * Couche de persistance des reglages d'une boutique.
 *
 * Le moteur sait construire la sienne, en `fetch` sur PostgREST. Elle ne convient PAS a Talvex :
 * elle part avec le role anonyme, alors que les politiques de `boutiques` sont `TO authenticated`.
 * On lui passe donc un acces bati sur le client Supabase deja authentifie — voir accesBoutique.ts.
 */
export interface AccesBoutique {
  /**
   * Reglages de cette boutique. TROIS reponses, et elles ne se valent pas :
   *   - un objet   : voici les reglages ;
   *   - `null`     : la boutique n a pas encore de reglages, et c est une reponse SURE ;
   *   - `undefined`: je n ai pas pu savoir (reseau, droits, session absente).
   *
   * Le moteur n ecrit RIEN de la session apres un `undefined` : il ne sait pas ce que la base
   * contient, et y poser l etat local effacerait les reglages du proprietaire. Ne leve jamais.
   */
  lire(boutiqueId: string): Promise<Record<string, unknown> | null | undefined>;
  /** Ecrit les reglages. Rend true seulement si la base a accepte. Ne leve jamais. */
  ecrire(boutiqueId: string, donnees: Record<string, unknown>): Promise<boolean>;
}

export interface OptionsBoutique3D {
  /**
   * Identite de la boutique : elle suffixe les quatre caches locaux et sert de cle a la ligne
   * en base. Dans Talvex, c'est le vrai `boutiques.id`. Null : le moteur retombe sur son
   * identifiant historique, ce qui n'a de sens qu'en mode autonome.
   */
  boutiqueId?: string | null;
  /**
   * Racine des assets du modele, SANS barre oblique finale.
   * Exemple : `/boutique3d/modeles/johanna-mode-luxe/v1`
   * Chaine vide : les assets sont cherches a la racine du domaine.
   */
  baseAssets?: string;
  /** Descripteur de scene deja charge. Absent, le moteur va chercher `boutique.json`. */
  manifeste?: unknown;
  /** Persistance fournie par l'hote. Null : le moteur construit la sienne. */
  acces?: AccesBoutique | null;
}

/** La boutique, en composant React. A monter dans un parent POSITIONNE et de hauteur non nulle. */
export function Boutique3D(props: OptionsBoutique3D): ReactElement;

/**
 * Monte la boutique dans `noeud` et rend la fonction qui la demonte.
 * `noeud` doit etre positionne : c'est la seule chose que le moteur exige de son hote.
 */
export function monterBoutique(
  options: OptionsBoutique3D & { noeud: HTMLElement },
): () => void;

export default monterBoutique;
