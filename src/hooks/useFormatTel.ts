import { useSyncExternalStore } from 'react';
import { supabase } from '../lib/supabase';
import { FORMAT_TEL_DEFAUT, estFormatTel, type FormatTel } from '../lib/formatTel';
import { prefCacheKey, readPrefCache, writePrefCache, loadPrefRemote, savePrefRemote } from './actionPrefsStorage';

/**
 * LE FORMAT D'AFFICHAGE DES NUMEROS — un reglage, partage par toute l'application.
 *
 * ---------- POURQUOI UN MAGASIN EXTERNE ET NON UN `useState` PAR COMPOSANT ----------
 *
 * Le reglage est GLOBAL : on clique une fois sur `+33`, puis on appelle dix prospects sans y
 * revenir. Or le selecteur vit dans la barre et les numeros dans les lignes et les cartes :
 * des etats locaux se seraient ignores, et cliquer sur un bouton n'aurait rien change au
 * tableau. Un magasin au niveau du module, lu par `useSyncExternalStore`, fait que TOUS les
 * abonnes changent dans le meme rendu. C'est le motif deja utilise par `useTalixySound`.
 *
 * ---------- LE PROPRIETAIRE EST LE COMPTE CONNECTE, PAS L'ENTITE REGARDEE ----------
 *
 * `useActionOrder` prend l'entite VISUALISEE, parce que l'ordre des actions est un reglage de
 * cette entite. Ici c'est l'inverse : la facon d'ecrire un numero est le reglage de la
 * PERSONNE qui lit l'ecran et compose le numero. On prend donc `auth.uid()`, comme
 * `useTalixySound`. La RLS de `user_preferences` le confirme — `auth.uid() = user_id` sur les
 * trois operations — donc ecrire sa propre preference marche pour tous les roles, sans
 * dependre des politiques `super_admin`.
 *
 * ---------- CE QUI PERSISTE, ET OU ----------
 *
 * Aucune table, aucune colonne, aucune migration : une cle de plus dans le dictionnaire jsonb
 * `user_preferences.sidebar_orders`, double d'un cache `localStorage` pour la lecture
 * instantanee. Le choix survit donc au rechargement, A LA DECONNEXION, et suit le compte d'un
 * appareil a l'autre. Aucun numero n'est touche : l'ecriture porte sur les preferences, jamais
 * sur `leads`.
 */

/** La cle de CE concept dans `sidebar_orders`. Une seule, partagee Societe et Vendeur. */
export const CLE_FORMAT_TEL = 'crm_format_tel';

interface EtatFormat { proprio: string | null; format: FormatTel }

let etat: EtatFormat = { proprio: null, format: FORMAT_TEL_DEFAUT };
const abonnes = new Set<() => void>();
let demarre = false;

function emettre(suivant: EtatFormat) {
  etat = suivant;
  abonnes.forEach(l => l());
}

/* Le mecanisme de stockage manipule des LISTES de chaines — c'est ce que `sidebar_orders`
   contient partout ailleurs. Un format unique y voyage donc comme liste d'un seul element :
   on reutilise le mecanisme sans le detourner, et sans ajouter de validation a part. */
const lireListe = (l: string[] | null): FormatTel | null =>
  l && l.length > 0 && estFormatTel(l[0]) ? l[0] : null;

function changerProprio(proprio: string | null) {
  if (proprio === etat.proprio) return;
  if (!proprio) { emettre({ proprio: null, format: FORMAT_TEL_DEFAUT }); return; }

  /* Le cache local peint tout de suite ; la base fait autorite juste apres. Meme ordre que
     `useActionOrder`, pour la meme raison : sans lui, on verrait le format par defaut le temps
     d'un aller-retour reseau, et les numeros changeraient de forme sous les yeux. */
  const duCache = lireListe(readPrefCache(prefCacheKey(CLE_FORMAT_TEL, proprio)));
  emettre({ proprio, format: duCache ?? FORMAT_TEL_DEFAUT });

  loadPrefRemote(proprio, CLE_FORMAT_TEL).then(distant => {
    const f = lireListe(distant);
    /* Le compte a pu changer pendant l'aller-retour : on jette une reponse qui n'est plus la
       bonne, sinon le reglage d'un compte s'appliquerait au suivant. */
    if (!f || etat.proprio !== proprio) return;
    writePrefCache(prefCacheKey(CLE_FORMAT_TEL, proprio), [f]);
    emettre({ proprio, format: f });
  }).catch(() => { /* le cache local tient */ });
}

function demarrer() {
  if (demarre) return;
  demarre = true;
  supabase.auth.getSession().then(({ data }) => changerProprio(data.session?.user.id ?? null), () => {});
  supabase.auth.onAuthStateChange((_e, session) => changerProprio(session?.user.id ?? null));
}

function sabonner(l: () => void) {
  demarrer();
  abonnes.add(l);
  return () => { abonnes.delete(l); };
}

const instantane = () => etat;

function choisir(format: FormatTel) {
  if (format === etat.format) return;
  const { proprio } = etat;
  emettre({ ...etat, format });
  if (!proprio) return;
  writePrefCache(prefCacheKey(CLE_FORMAT_TEL, proprio), [format]);
  savePrefRemote(proprio, CLE_FORMAT_TEL, [format]).catch(() => { /* le cache local tient */ });
}

export function useFormatTel() {
  const s = useSyncExternalStore(sabonner, instantane, instantane);
  return { format: s.format, choisir };
}
