/**
 * LIRE UN FICHIER CSV SANS RIEN PERDRE.
 *
 * ---------- CE QUE L'ANCIENNE LECTURE PERDAIT ----------
 *
 * `parseCSVText` (csvImportPipeline.ts) coupait le texte en LIGNES avant de regarder les
 * guillemets. Une cellule sur plusieurs lignes — une adresse, une note, un avis client
 * colle depuis Google — ouvrait donc un guillemet sur une ligne et le fermait sur la
 * suivante : la ligne etait coupee en deux enregistrements faux, et toutes les colonnes
 * suivantes glissaient d'un cran. Elle ne connaissait que `,` et `;`, et deux en-tetes
 * identiques s'ecrasaient dans le meme objet (le second gagnait, le premier disparaissait).
 *
 * ---------- CE QUE FAIT CETTE LECTURE ----------
 *
 * Un automate caractere par caractere (RFC 4180) : les guillemets sont lus AVANT les fins
 * de ligne, donc une cellule multiligne reste une cellule. Le separateur est choisi parmi
 * `,` `;` tabulation `|` en comptant HORS guillemets sur le premier enregistrement. Le BOM
 * est retire. Chaque enregistrement garde le numero de la ligne physique ou il commence,
 * pour que les erreurs montrees a l'utilisateur pointent la bonne ligne de son fichier.
 *
 * Elle ne decide RIEN sur les en-tetes (voir entetesImport.ts) : elle rend des tableaux.
 */

export type Separateur = ',' | ';' | '\t' | '|';

export const SEPARATEURS: readonly Separateur[] = [',', ';', '\t', '|'];

export interface EnregistrementCsv {
  /** Numero de la ligne PHYSIQUE (1 = premiere ligne du fichier) ou l'enregistrement commence. */
  ligne: number;
  cellules: string[];
}

export interface AvertissementCsv {
  ligne: number;
  attendu: number;
  trouve: number;
}

export interface LectureCsv {
  separateur: Separateur;
  entetes: string[];
  enregistrements: EnregistrementCsv[];
  /** Enregistrements dont le nombre de cellules differe de celui des en-tetes. */
  avertissements: AvertissementCsv[];
  /** Un guillemet ouvert n'a jamais ete referme : la fin du fichier a ete lue comme une cellule. */
  guillemetNonFerme: boolean;
  /** La ligne ou ce guillemet a ete ouvert (null si tout est referme). */
  ligneGuillemetOuvert: number | null;
  /**
   * Un guillemet FERMANT suivi d'autre chose qu'un separateur ou une fin de ligne (« "abc"de »)
   * viole le format : c'est presque toujours un guillemet ouvert par erreur plus haut, qui a
   * avale les lignes suivantes. La ligne ou la cellule fautive a commence, ou null.
   */
  ligneGuillemetSuspect: number | null;
}

/**
 * Une cellule que la base peut stocker : sans caractere NUL (refuse par jsonb) ni demi-paire
 * de substitution isolee (texte UTF-16 casse), remplacee par le caractere de remplacement.
 */
export function nettoyerCellule(v: string): string {
  /* Une boucle plutot qu'une expression avec assertion arriere : celle-ci fait echouer le
     chargement du module sur les Safari iOS anterieurs a 16.4. */
  let res = '';
  for (let i = 0; i < v.length; i++) {
    const c = v.charCodeAt(i);
    if (c === 0) continue;
    if (c >= 0xd800 && c <= 0xdbff) {
      const d = v.charCodeAt(i + 1);
      if (d >= 0xdc00 && d <= 0xdfff) { res += v[i] + v[i + 1]; i++; } else res += '\ufffd';
      continue;
    }
    if (c >= 0xdc00 && c <= 0xdfff) { res += '\ufffd'; continue; }
    res += v[i];
  }
  return res;
}

/** Le separateur le plus frequent HORS guillemets sur le premier enregistrement. */
export function detecterSeparateur(texte: string): Separateur {
  const compte: Record<Separateur, number> = { ',': 0, ';': 0, '\t': 0, '|': 0 };
  let dansGuillemets = false;
  for (let i = 0; i < texte.length; i++) {
    const c = texte[i];
    if (c === '"') {
      if (dansGuillemets && texte[i + 1] === '"') { i++; continue; }
      dansGuillemets = !dansGuillemets;
      continue;
    }
    if (!dansGuillemets && (c === '\n' || c === '\r')) break;
    if (!dansGuillemets && (c === ',' || c === ';' || c === '\t' || c === '|')) compte[c]++;
  }
  /* A egalite, l'ordre de SEPARATEURS decide : la virgule, puis le point-virgule. */
  let meilleur: Separateur = ',';
  for (const s of SEPARATEURS) if (compte[s] > compte[meilleur]) meilleur = s;
  return meilleur;
}

/**
 * Decoupe le texte en enregistrements. Les enregistrements ENTIEREMENT vides (une ligne
 * blanche, ou seulement des separateurs) sont ignores : ce ne sont pas des leads.
 */
export function lireCsv(texteBrut: string, separateurImpose?: Separateur): LectureCsv {
  const texte = texteBrut.charCodeAt(0) === 0xfeff ? texteBrut.slice(1) : texteBrut;
  const sep = separateurImpose ?? detecterSeparateur(texte);

  const bruts: EnregistrementCsv[] = [];
  let cellules: string[] = [];
  let cellule = '';
  let dansGuillemets = false;
  let ligne = 1;
  let debut = 1;
  let enCours = false;
  let ligneOuverture: number | null = null;
  let ligneSuspecte: number | null = null;

  const finCellule = () => { cellules.push(cellule); cellule = ''; };
  const finEnregistrement = () => {
    finCellule();
    bruts.push({ ligne: debut, cellules });
    cellules = [];
    enCours = false;
  };

  for (let i = 0; i < texte.length; i++) {
    const c = texte[i];
    if (!enCours) { enCours = true; debut = ligne; }

    if (dansGuillemets) {
      if (c === '"') {
        if (texte[i + 1] === '"') { cellule += '"'; i++; }
        else {
          dansGuillemets = false;
          const suivant = texte[i + 1];
          if (suivant !== undefined && suivant !== sep && suivant !== '\n' && suivant !== '\r' && ligneSuspecte === null) {
            ligneSuspecte = ligneOuverture;
          }
        }
      } else if (c === '\r') {
        /* `\r\n` compte pour UNE ligne physique, pas deux. */
        ligne++;
        if (texte[i + 1] === '\n') i++;
        cellule += '\n';
      } else {
        if (c === '\n') ligne++;
        cellule += c;
      }
      continue;
    }

    if (c === '"') {
      /* Un guillemet n'ouvre une cellule citee qu'en DEBUT de cellule ; ailleurs (`12" ecran`)
         c'est un caractere comme un autre. */
      if (cellule.trim() === '') { cellule = ''; dansGuillemets = true; ligneOuverture = ligne; }
      else cellule += c;
    } else if (c === sep) {
      finCellule();
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && texte[i + 1] === '\n') i++;
      finEnregistrement();
      ligne++;
    } else {
      cellule += c;
    }
  }
  const guillemetNonFerme = dansGuillemets;
  if (enCours) finEnregistrement();

  /* Les fins de ligne a l'interieur d'une cellule sont ramenees a `\n` : `\r\n` venu d'Excel
     sous Windows n'a pas a voyager jusqu'a la base. */
  const propres = bruts.map(e => ({
    ligne: e.ligne,
    cellules: e.cellules.map(v => nettoyerCellule(v.replace(/\r\n?/g, '\n'))),
  }));
  const nonVides = propres.filter(e => e.cellules.some(v => v.trim() !== ''));
  if (nonVides.length === 0) {
    return { separateur: sep, entetes: [], enregistrements: [], avertissements: [], guillemetNonFerme, ligneGuillemetOuvert: guillemetNonFerme ? ligneOuverture : null, ligneGuillemetSuspect: ligneSuspecte };
  }

  const [tete, ...corps] = nonVides;
  const entetes = tete.cellules.map(v => v.trim());
  /* Des separateurs en trop en fin de ligne d'en-tete (`Nom;Ville;;`) ne sont pas des colonnes. */
  while (entetes.length > 1 && entetes[entetes.length - 1] === '' &&
         corps.every(e => (e.cellules[entetes.length - 1] ?? '').trim() === '')) {
    entetes.pop();
  }

  const avertissements: AvertissementCsv[] = [];
  for (const e of corps) {
    const n = e.cellules.length;
    /* Des cellules vides en trop en fin de ligne ne sont pas un defaut : Excel en ajoute. */
    const utiles = n > entetes.length && e.cellules.slice(entetes.length).every(v => v.trim() === '')
      ? entetes.length : n;
    if (utiles !== entetes.length) avertissements.push({ ligne: e.ligne, attendu: entetes.length, trouve: n });
  }

  return { separateur: sep, entetes, enregistrements: corps, avertissements, guillemetNonFerme, ligneGuillemetOuvert: guillemetNonFerme ? ligneOuverture : null, ligneGuillemetSuspect: ligneSuspecte };
}
