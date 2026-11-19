import type { TypeColonne } from './entetesImport';

/**
 * LES ONGLETS DE COLONNES DU CRM LEADS — types et regles partagees (aucun acces reseau ici).
 *
 * Un onglet = un jeu de colonnes + un groupe de leads (table `lead_onglets`). « Principal »
 * n'est PAS une ligne en base : c'est l'onglet virtuel de tous les leads, avec les colonnes
 * standards du CRM. Son identifiant cote client est la sentinelle `ONGLET_PRINCIPAL`.
 *
 * Une colonne d'onglet est soit STANDARD (`cle_systeme` : nom, telephone, statut...), soit
 * DYNAMIQUE (`colonne_id` vers le registre `lead_colonnes`, dont `cle_data` est la cle
 * exacte de la valeur dans `leads.data`). Dans le tableau, une colonne dynamique a pour cle
 * `dyn:<colonne_id>` — un prefixe qui ne peut entrer en collision avec aucune cle standard.
 */

export const ONGLET_PRINCIPAL = 'principal';

/** La cle de preference (sidebar_orders) qui retient l'onglet actif de CHAQUE compte. */
export const CLE_ONGLET_ACTIF = 'crm_leads_onglet_actif';

export const PREFIXE_DYN = 'dyn:';
export const cleDyn = (colonneId: string) => PREFIXE_DYN + colonneId;
export const estCleDyn = (cle: string) => cle.startsWith(PREFIXE_DYN);

/** La colonne virtuelle montree pendant une recherche globale : les onglets du lead. */
export const CLE_COLONNE_ONGLETS = 'onglets';

export type CleSystemeOnglet =
  | 'hash' | 'nom' | 'prenom' | 'email' | 'telephone' | 'date_ajout'
  | 'statut' | 'actions' | 'acces' | 'ia' | 'vendeur';

export const CLES_SYSTEME: readonly CleSystemeOnglet[] = [
  'hash', 'nom', 'prenom', 'email', 'telephone', 'date_ajout', 'statut', 'actions', 'acces', 'ia', 'vendeur',
];

/** Statut et Actions sont les colonnes de TRAVAIL : jamais masquees (contrainte en base aussi). */
export const CLES_TOUJOURS_VISIBLES: readonly CleSystemeOnglet[] = ['statut', 'actions'];

export const LIBELLES_SYSTEME: Record<CleSystemeOnglet, string> = {
  hash: '#', nom: 'Nom', prenom: 'Prenom', email: 'Email', telephone: 'Telephone',
  date_ajout: "Date d'ajout", statut: 'Statut', actions: 'Actions', acces: 'Acces', ia: 'IA', vendeur: 'Vendeur',
};

export interface Onglet {
  id: string;
  nom: string;
  origine: 'manuel' | 'import';
  position: number;
  archive_le: string | null;
}

export interface ColonneRegistre {
  id: string;
  cle_data: string;
  cle_canonique: string;
  libelle: string;
  type: TypeColonne;
}

export interface ColonneOnglet {
  id: string;
  onglet_id: string;
  colonne_id: string | null;
  cle_systeme: CleSystemeOnglet | null;
  position: number;
  visible: boolean;
  libelle: string | null;
}

/** Une colonne prete a etre rendue dans le tableau ou sur une carte. */
export interface ColonneAffichee {
  /** Cle du tableau : une cle standard, ou `dyn:<colonne_id>`. */
  cle: string;
  libelle: string;
  systeme: CleSystemeOnglet | null;
  /** Pour une colonne dynamique : la cle exacte de la valeur dans `leads.data`. */
  cleData: string | null;
  type: TypeColonne;
  visible: boolean;
  /** Identifiant de la ligne `lead_onglet_colonnes` (absent pour Principal). */
  idLigne: string | null;
}

/**
 * Les colonnes d'un onglet, dans l'ordre, avec leur libelle et leur type resolus. Une
 * colonne dynamique dont le registre est introuvable (cas qui ne devrait pas exister : la
 * base cascade) est ecartee plutot que rendue vide.
 */
export function colonnesDeLOnglet(lignes: ColonneOnglet[], registre: Map<string, ColonneRegistre>): ColonneAffichee[] {
  const res: ColonneAffichee[] = [];
  for (const l of [...lignes].sort((a, b) => a.position - b.position || a.id.localeCompare(b.id))) {
    if (l.cle_systeme) {
      res.push({
        cle: l.cle_systeme, libelle: l.libelle ?? LIBELLES_SYSTEME[l.cle_systeme], systeme: l.cle_systeme,
        cleData: null, type: l.cle_systeme === 'telephone' ? 'telephone' : l.cle_systeme === 'email' ? 'email' : 'texte',
        visible: l.visible, idLigne: l.id,
      });
    } else if (l.colonne_id) {
      const r = registre.get(l.colonne_id);
      if (!r) continue;
      res.push({
        cle: cleDyn(r.id), libelle: l.libelle ?? r.libelle, systeme: null, cleData: r.cle_data,
        type: r.type, visible: l.visible, idLigne: l.id,
      });
    }
  }
  return res;
}

/**
 * LES ONGLETS D'UN COMMERCIAL : pour chaque onglet, combien de SES leads y sont rattaches.
 *
 * Le commercial ne cree aucun onglet : ses onglets sont ceux des leads qu'on lui attribue, et
 * le compte est le SIEN (un onglet de 500 leads dont il a 25 compte 25 chez lui). Un onglet
 * absent de la table n'a aucun de ses leads : il disparait de son selecteur, sans que rien
 * ne change cote Societe.
 */
export function comptesParOnglet(
  leadIds: Iterable<string>,
  appartenances: ReadonlyMap<string, readonly string[]>,
): Map<string, number> {
  const m = new Map<string, number>();
  for (const id of leadIds) for (const o of appartenances.get(id) ?? []) m.set(o, (m.get(o) ?? 0) + 1);
  return m;
}

/**
 * L'onglet a MONTRER au commercial : son choix retenu tant que cet onglet contient au moins
 * un de ses leads, sinon Principal. Le choix retenu n'est pas efface : si des leads de cet
 * onglet lui sont de nouveau attribues, il y revient. Tant que la lecture n'est pas finie
 * (`pret` faux), on garde le choix — sinon Principal clignoterait a chaque ouverture.
 */
export function ongletEffectif(choisi: string, comptes: ReadonlyMap<string, number>, pret: boolean): string {
  if (choisi === ONGLET_PRINCIPAL || !pret) return choisi;
  return (comptes.get(choisi) ?? 0) > 0 ? choisi : ONGLET_PRINCIPAL;
}

/** « Onglet : X » ou « Onglets : X, Y » — ce qu'affiche la recherche globale pour un lead. */
export function libelleOnglets(noms: string[]): string {
  if (noms.length === 0) return 'Principal';
  return (noms.length > 1 ? 'Onglets : ' : 'Onglet : ') + noms.join(', ');
}

/** La valeur d'une colonne dynamique pour un lead : le texte du fichier, rogne, ou ''. */
export function valeurDyn(data: Record<string, unknown> | null | undefined, cleData: string | null): string {
  if (!data || !cleData) return '';
  const v = data[cleData];
  return typeof v === 'string' ? v.trim() : '';
}
