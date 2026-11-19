import { useSyncExternalStore } from 'react';
import { supabase } from '../lib/supabase';
import { CLE_ONGLET_ACTIF, ONGLET_PRINCIPAL } from '../lib/ongletsLeads';
import { prefCacheKey, readPrefCache, writePrefCache, loadPrefRemote, savePrefRemote } from './actionPrefsStorage';

/**
 * L'ONGLET DE COLONNES ACTIF DU CRM LEADS — un choix PERSONNEL, retenu par compte.
 *
 * Decision de David : l'onglet ouvert est celui du compte CONNECTE (en Visu, le Super Admin
 * garde ses propres choix). Il voyage comme le format des telephones : cache local lu
 * d'abord (aucun saut a l'ouverture), puis `user_preferences.sidebar_orders`, sans table ni
 * colonne. Un magasin au niveau du module : la page d'import peut ouvrir le CRM directement
 * sur l'onglet qu'elle vient de remplir, et le CRM le voit au premier rendu.
 *
 * Une entree par SOCIETE (`<company_id>=<onglet_id>`) : un identifiant d'onglet n'a de sens
 * que dans sa societe, et le Super Admin passe de l'une a l'autre.
 */

interface Etat { proprio: string | null; choix: Record<string, string> }

let etat: Etat = { proprio: null, choix: {} };
const abonnes = new Set<() => void>();
let demarre = false;
/* Chaque choix local incremente ce compteur : une lecture distante partie AVANT un choix ne
   doit pas l'ecraser en revenant (elle porte un etat plus ancien). */
let versionLocale = 0;
const MAX_ENTREES = 30;

const emettre = (s: Etat) => { etat = s; abonnes.forEach(l => l()); };

const versChoix = (l: string[] | null): Record<string, string> => {
  const res: Record<string, string> = {};
  for (const e of l ?? []) {
    const i = e.indexOf('=');
    if (i > 0) res[e.slice(0, i)] = e.slice(i + 1);
  }
  return res;
};
const versListe = (c: Record<string, string>) =>
  Object.entries(c).slice(-MAX_ENTREES).map(([k, v]) => `${k}=${v}`);

function enregistrer(proprio: string, choix: Record<string, string>) {
  const liste = versListe(choix);
  writePrefCache(prefCacheKey(CLE_ONGLET_ACTIF, proprio), liste);
  savePrefRemote(proprio, CLE_ONGLET_ACTIF, liste).catch(() => { /* le cache local tient */ });
}

function changerProprio(proprio: string | null) {
  if (proprio === etat.proprio) return;
  if (!proprio) { emettre({ proprio: null, choix: {} }); return; }
  /* UN CHOIX FAIT AVANT DE CONNAITRE LE COMPTE n'est pas perdu : la page d'import choisit
     l'onglet qu'elle vient de remplir, puis ouvre le CRM — c'est souvent a ce moment que le
     compte devient connu. Sans cette fusion, le cache (plus ancien) ecrasait ce choix et le
     CRM s'ouvrait sur Principal (defaut trouve au harnais le 19/11). */
  const enAttente = etat.proprio === null ? etat.choix : {};
  const choix = { ...versChoix(readPrefCache(prefCacheKey(CLE_ONGLET_ACTIF, proprio))), ...enAttente };
  emettre({ proprio, choix });
  if (Object.keys(enAttente).length > 0) enregistrer(proprio, choix);
  const version = versionLocale;
  loadPrefRemote(proprio, CLE_ONGLET_ACTIF).then(distant => {
    if (!distant || etat.proprio !== proprio || versionLocale !== version) return;
    const fusion = { ...versChoix(distant), ...enAttente };
    writePrefCache(prefCacheKey(CLE_ONGLET_ACTIF, proprio), versListe(fusion));
    emettre({ proprio, choix: fusion });
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

export function choisirOngletActif(companyId: string | null | undefined, ongletId: string) {
  if (!companyId) return;
  demarrer();
  if ((etat.choix[companyId] ?? ONGLET_PRINCIPAL) === ongletId) return;
  /* Retirer puis remettre : l'entree passe en DERNIER, et la liste bornee oublie d'abord
     les societes consultees il y a le plus longtemps. */
  const choix = { ...etat.choix };
  delete choix[companyId];
  choix[companyId] = ongletId;
  versionLocale++;
  emettre({ ...etat, choix });
  if (etat.proprio) enregistrer(etat.proprio, choix);
}

/** L'onglet retenu pour cette societe, ou Principal. Le CRM verifie qu'il existe encore. */
export function useOngletActif(companyId: string | null | undefined) {
  const s = useSyncExternalStore(sabonner, instantane, instantane);
  const ongletId = (companyId && s.choix[companyId]) || ONGLET_PRINCIPAL;
  return { ongletId, choisir: (id: string) => choisirOngletActif(companyId, id) };
}
