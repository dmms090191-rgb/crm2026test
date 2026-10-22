import type { DossierImmo } from '../pages/admin/views/crm-immo/crmImmoTypes';
import { cleColonne, type Colonne } from './crmImmoColonnes';
import type { CategorieImmo } from './crmImmoEcheancier';

/*
 * Recherche, tri et filtres du tableau CRM Immo — module PUR.
 *
 * Tout se fait sur les lignes DEJA chargees : une Societe immobiliere gere des dizaines
 * ou des centaines de dossiers, pas des millions. Un aller-retour reseau par frappe
 * serait plus lent que de filtrer en memoire, et rendrait la recherche inutilisable sur
 * une connexion mediocre.
 *
 * Le jour ou le volume le justifiera, c'est ce module qu'il faudra remplacer par des
 * `.ilike()` et `.order()` cote base — et ses tests diront si le comportement a change.
 */

/** La valeur affichable d'une colonne pour un dossier, systeme ou personnalisee. */
export function valeurAffichee(dossier: DossierImmo, colonne: Colonne): string {
  if (colonne.famille === 'systeme') {
    const v = (dossier as unknown as Record<string, unknown>)[colonne.cle];
    return v === null || v === undefined ? '' : String(v);
  }
  const v = dossier.valeurs?.[colonne.id];
  if (v === null || v === undefined) return '';
  if (typeof v === 'boolean') return v ? 'Oui' : 'Non';
  return String(v);
}

/**
 * Normalise pour comparer : minuscules, et accents retires.
 *
 * Sans ca, chercher << perrin >> ne trouverait pas << Perrin >>, et << proprietaire >>
 * ne trouverait pas << propriétaire >>. Les deux arrivent tous les jours dans un CRM
 * francais.
 */
export function normaliser(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Les dossiers qui contiennent le terme, cherche dans TOUTES les colonnes visibles.
 *
 * Chercher dans les colonnes masquees serait deroutant : on trouverait une ligne sans
 * voir pourquoi elle correspond.
 */
export function rechercher(dossiers: DossierImmo[], terme: string, colonnes: Colonne[]): DossierImmo[] {
  const t = normaliser(terme);
  if (!t) return dossiers;
  const mots = t.split(/\s+/).filter(Boolean);
  /*
   * LE COMMENTAIRE SORT DU FOIN, depuis que sa colonne affiche un bouton.
   *
   * La regle de cette fonction est ecrite trois lignes plus haut : ne pas chercher dans
   * ce qui n'est pas visible, parce qu'on trouverait une ligne sans voir pourquoi elle
   * correspond. La colonne `commentaire` est devenue exactement ce cas : elle est encore
   * dans la liste des colonnes visibles, mais sa cellule ne montre plus son texte.
   *
   * Et ce texte est doublement trompeur : c'est l'ANCIEN champ unique, que l'interface
   * n'alimente plus. L'historique vit maintenant dans crm_immo_commentaires, une autre
   * table, que cette recherche ne lit pas. Chercher le vieux champ reviendrait a filtrer
   * sur une donnee morte en ignorant la vivante.
   */
  const cherchables = colonnes.filter(c => !(c.famille === 'systeme' && c.cle === 'commentaire'));
  return dossiers.filter(d => {
    const foin = normaliser(cherchables.map(c => valeurAffichee(d, c)).join(' '));
    /* Tous les mots doivent etre presents, pas forcement cote a cote : taper
       << dupont cohen >> trouve le dossier dont le locataire est Dupont et le
       proprietaire Cohen. */
    return mots.every(m => foin.includes(m));
  });
}

export type Sens = 'asc' | 'desc';

/** Compare deux valeurs d'une colonne, en tenant compte de son type. */
function comparer(a: string, b: string, type: Colonne['type']): number {
  /* Le vide va toujours a la fin, dans les deux sens : une ligne sans valeur n'est pas
     << la plus petite >>, elle est absente de ce classement. */
  if (a === '' && b === '') return 0;
  if (a === '') return 1;
  if (b === '') return -1;

  if (type === 'nombre') {
    const x = Number(a.replace(',', '.')); const y = Number(b.replace(',', '.'));
    if (Number.isFinite(x) && Number.isFinite(y)) return x - y;
  }
  if (type === 'date') {
    /* Les dates sont en 'AAAA-MM-JJ' : l'ordre alphabetique EST l'ordre chronologique.
       Les comparer comme des nombres ou via new Date() serait plus fragile. */
    return a.localeCompare(b);
  }
  return a.localeCompare(b, 'fr', { numeric: true, sensitivity: 'base' });
}

/**
 * Trie les dossiers sur une colonne.
 *
 * Le tri est STABLE a egalite : on retombe sur la date de creation, puis sur l'id. Sans
 * ce dernier recours, deux lignes equivalentes pourraient s'echanger d'un rendu a
 * l'autre et le tableau semblerait bouger tout seul.
 */
export function trier(dossiers: DossierImmo[], colonne: Colonne | null, sens: Sens): DossierImmo[] {
  if (!colonne) return dossiers;
  const signe = sens === 'asc' ? 1 : -1;
  return [...dossiers].sort((d1, d2) => {
    const c = comparer(valeurAffichee(d1, colonne), valeurAffichee(d2, colonne), colonne.type);
    if (c !== 0) return c * signe;
    return d2.created_at.localeCompare(d1.created_at) || d1.id.localeCompare(d2.id);
  });
}

/**
 * Les filtres de la liste : << Tous >>, plus LES SEPT CATEGORIES DU TABLEAU DE BORD.
 *
 * Le vocabulaire n'est pas recopie, il est IMPORTE de crmImmoEcheancier. Ajouter une
 * categorie la-bas ajoute un filtre ici, et le compilateur reclame son libelle.
 */
export type FiltreDossiers = 'tous' | CategorieImmo;

/**
 * Applique un filtre.
 *
 * ---------- CE MODULE NE CALCULE PLUS AUCUNE DATE ----------
 *
 * Jusqu'au 22 octobre 2026, le filtre << Fin proche >> refaisait son propre calcul de
 * preavis, avec sa propre constante de 30 jours et l'horloge de la page — gelee au
 * montage. Le tableau de bord, lui, calculait avec la sienne, rafraichie toutes les
 * 60 s. Mesure du jour : la carte << Contrats a renouveler >> affichait 0, et le clic
 * ouvrait une liste d'UNE ligne. Deux verites, aucun moyen de savoir laquelle croire.
 *
 * Desormais le classement est fait UNE fois, par classerTableauDeBord, a partir de
 * crm_immo_contrats et des encaissements, avec l'horloge du tableau de bord. Ce module
 * ne fait plus que lire l'appartenance. Il ne peut plus se tromper de date, puisqu'il
 * n'en lit plus aucune.
 *
 * @param classement Les dossiers de chaque categorie, ou null tant que le classement
 *                   n'est pas charge. Null rend une liste VIDE pour une categorie —
 *                   jamais la liste entiere, qui ferait croire que tout correspond.
 */
export function filtrerDossiers(
  dossiers: DossierImmo[],
  filtre: FiltreDossiers,
  classement: Record<CategorieImmo, Set<string>> | null,
): DossierImmo[] {
  if (filtre === 'tous') return dossiers;
  if (!classement) return [];
  const vises = classement[filtre];
  if (!vises) return [];
  return dossiers.filter(d => vises.has(d.id));
}

/** Le pipeline complet, dans l'ordre : filtre, puis recherche, puis tri. */
export function preparerLignes(params: {
  dossiers: DossierImmo[];
  terme: string;
  colonnes: Colonne[];
  triSur: Colonne | null;
  sens: Sens;
  filtre: FiltreDossiers;
  classement: Record<CategorieImmo, Set<string>> | null;
}): DossierImmo[] {
  const { dossiers, terme, colonnes, triSur, sens, filtre, classement } = params;
  return trier(rechercher(filtrerDossiers(dossiers, filtre, classement), terme, colonnes), triSur, sens);
}

/** Retrouve une colonne par sa cle, pour restaurer un tri apres rechargement. */
export function colonneParCle(colonnes: Colonne[], cle: string | null): Colonne | null {
  if (!cle) return null;
  return colonnes.find(c => cleColonne(c) === cle) ?? null;
}
