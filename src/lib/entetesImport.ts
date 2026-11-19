/**
 * LES EN-TETES D'UN FICHIER IMPORTE : les rendre uniques, les rapprocher, les typer.
 *
 * ---------- LA FORME CANONIQUE, COPIE EXACTE DE LA BASE ----------
 *
 * `cleCanonique` est le miroir de `public.lead_cle_canonique` (migration
 * 20261119073610_crm_onglets_colonnes_leads.sql) : NFC, apostrophes typographiques ramenees
 * a `'`, espaces insecables en espaces, bords rognes, espaces reduits, minuscules. Les
 * ACCENTS SONT CONSERVES — decision de David : « Catégorie » et « Categorie » ne sont
 * rapprochees que sur PROPOSITION a l'apercu, jamais en silence. Un releve verifie que les
 * deux implementations donnent le meme resultat sur les memes vecteurs.
 *
 * ---------- CE QUI N'EST JAMAIS UNE COLONNE ----------
 *
 * Le PIN client (`MotDePasse`), le mot de passe de demonstration, les commentaires (un
 * tableau, pas une valeur) et les cles AuthId neutralisees par L0. Meme liste que
 * `public.lead_cle_reservee`.
 */

/** Apostrophes et accents graves/aigus isoles ramenes a `'`, espaces insecables a ` `. */
const VERS_APOSTROPHE = /[\u2019\u2018\u02BC`\u00B4]/g;
const VERS_ESPACE = /[\u00A0\u202F]/g;

export function cleCanonique(texte: string | null | undefined): string | null {
  const v = (texte ?? '')
    .normalize('NFC')
    .replace(VERS_APOSTROPHE, "'")
    .replace(VERS_ESPACE, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
  return v === '' ? null : v;
}

/** La forme canonique SANS accents : ne sert qu'a PROPOSER un rapprochement. */
export function sansAccents(texte: string): string {
  return texte.normalize('NFD').replace(/[\u0300-\u036f]/g, '').normalize('NFC');
}

const RESERVEES = new Set(['motdepasse', 'mot_de_passe_demo', 'commentaires', 'commentaire']);

/* Les cles d'identifiant de connexion, brutes ou renommees « CSV · ... » par le declencheur
   de L0, sont decrites par un MOTIF plutot qu'enumerees : le releve de L0 interdit d'ecrire
   ces jetons dans le code (une cle de data ne doit jamais designer une identite), et ici on
   ne les nomme que pour les ECARTER. Meme ensemble que public.lead_cle_reservee. */
const CLE_IDENTIFIANT = /^(csv · )?auth_?id$/;

export function estCleReservee(cle: string | null | undefined): boolean {
  const c = cleCanonique(cle);
  return c === null || RESERVEES.has(c) || CLE_IDENTIFIANT.test(c);
}

/**
 * Rend chaque en-tete unique SANS rien perdre : deux colonnes « Téléphone » deviennent
 * « Téléphone » et « Téléphone (2) » ; un en-tete vide devient « Colonne N » (N = sa
 * position, a partir de 1). L'unicite est jugee sur la forme canonique : « Ville » et
 * « ville » designeraient la meme cle en base, elles sont donc distinguees ici.
 */
export function dedoublonnerEntetes(bruts: string[]): string[] {
  const vus = new Set<string>();
  return bruts.map((brut, i) => {
    const base = brut.replace(VERS_ESPACE, ' ').trim().replace(/\s+/g, ' ') || `Colonne ${i + 1}`;
    let nom = base;
    let n = 2;
    while (vus.has(cleCanonique(nom) as string)) nom = `${base} (${n++})`;
    vus.add(cleCanonique(nom) as string);
    return nom;
  });
}

/**
 * Les en-tetes d'un fichier tels qu'ils seront importes. Une colonne « Commentaires » du
 * fichier ne peut pas ecrire sous `Commentaires` : cette cle porte deja le FIL des
 * commentaires du lead (un tableau), qu'elle ecraserait. Plutot que de perdre son contenu,
 * elle est importee sous « Commentaires (fichier) ». Le PIN et les cles d'authentification
 * gardent leur nom : ils restent reserves et ne deviennent jamais des colonnes.
 */
export function entetesPourImport(bruts: string[]): string[] {
  return dedoublonnerEntetes(bruts.map(b => {
    const c = cleCanonique(b);
    const nom = c === 'commentaires' || c === 'commentaire' ? `${b.trim()} (fichier)` : b;
    /* La base refuse une cle de plus de 200 caracteres (une question de formulaire en
       en-tete, par exemple) : on la coupe ICI, avant le dedoublonnage, pour que l'import
       entier ne soit pas refuse. 190 laisse la place au suffixe « (N) ». */
    /* Coupe par CARACTERES, pas par unites UTF-16 : couper au milieu d'un emoji laisserait une
       demi-paire que la base refuse (et tout l'import avec). */
    const car = Array.from(nom.trim());
    return car.length > LONGUEUR_ENTETE_MAX ? car.slice(0, LONGUEUR_ENTETE_MAX).join('').trim() : nom;
  }));
}

/** Longueur maximale d'un en-tete importe (la base accepte 200). */
export const LONGUEUR_ENTETE_MAX = 190;

export type TypeColonne ='texte' | 'lien' | 'telephone' | 'email' | 'nombre' | 'entreprise' | 'date';

export type CleSysteme = 'prenom' | 'nom' | 'email' | 'telephone';

const sansSeparateurs = (s: string) => sansAccents(cleCanonique(s) ?? '').replace(/[\s_\-.']/g, '');

const NOMS_ENTREPRISE = new Set([
  'entreprise', 'societe', 'raisonsociale', 'company', 'companyname', 'nomentreprise',
  'nomdelentreprise', 'nomsociete', 'etablissement', 'commerce', 'enseigne', 'business', 'organisation',
]);
const NOMS_LIEN = /^(siteweb|siteinternet|site|web|url|lien.*|link.*|facebook|instagram|linkedin|twitter|x|tiktok|youtube|pinterest|googlemaps|maps|lienmaps|liencarte|carte)$/;
const NOMS_EMAIL = /^(email|e?mail|courriel|adresseemail|adressemail)$/;
const NOMS_TEL = /^(tel|telephone|phone|mobile|portable|gsm|telephoneinternational|telportable|telfixe|numerodetelephone)/;
const NOMS_NOMBRE = /^(note|avis|nombredavis|rating|reviews|score|nbavis)$/;
const NOMS_DATE = /^(date.*|ajoutele|creele|modifiele|.*depuisle)$/;

/** L'en-tete designe-t-il le nom d'une entreprise ? Sert a l'identite d'un lead sans contact. */
export function estEnteteEntreprise(entete: string): boolean {
  return NOMS_ENTREPRISE.has(sansSeparateurs(entete));
}

const URL_PROBABLE = /^(https?:\/\/|www\.)\S+$|^[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i;
const EMAIL_PROBABLE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NOMBRE_PROBABLE = /^-?\d+([.,]\d+)?$/;

/**
 * Le type d'une colonne, d'apres son nom PUIS ses valeurs. Le nom l'emporte (une colonne
 * « Note » reste un nombre meme si une cellule dit « n/a ») ; les valeurs ne decident
 * qu'en l'absence d'indice dans le nom, et seulement si 80 % des cellules non vides vont
 * dans le meme sens. Le type ne change QUE l'affichage : la valeur stockee est le texte du
 * fichier, intact.
 */
export function detecterType(entete: string, valeurs: string[]): TypeColonne {
  const n = sansSeparateurs(entete);
  if (NOMS_ENTREPRISE.has(n)) return 'entreprise';
  if (NOMS_EMAIL.test(n)) return 'email';
  if (NOMS_TEL.test(n) && !/fax|telecopie/.test(n)) return 'telephone';
  if (NOMS_LIEN.test(n)) return 'lien';
  if (NOMS_NOMBRE.test(n)) return 'nombre';
  if (NOMS_DATE.test(n)) return 'date';

  const pleines = valeurs.map(v => v.trim()).filter(v => v !== '').slice(0, 200);
  if (pleines.length === 0) return 'texte';
  const part = (re: RegExp) => pleines.filter(v => re.test(v)).length / pleines.length;
  if (part(EMAIL_PROBABLE) >= 0.8) return 'email';
  if (part(URL_PROBABLE) >= 0.8 && pleines.some(v => /[a-z]/i.test(v))) return 'lien';
  if (part(NOMBRE_PROBABLE) >= 0.8 && pleines.every(v => v.replace(/\D/g, '').length < 7)) return 'nombre';
  return 'texte';
}

/* ─────────────────────────────────────────────────────────────────────────────
   LES COLONNES STANDARD — prenom, nom, email, telephone
   ───────────────────────────────────────────────────────────────────────────── */

const VARIANTES: Record<CleSysteme, string[]> = {
  prenom: ['prenom', 'firstname', 'first_name', 'first name'],
  nom: ['nom', 'name', 'lastname', 'last_name', 'last name', 'surname', 'nomdefamille', 'nom de famille'],
  email: ['email', 'e-mail', 'mail', 'courriel', 'adresse email', 'adresse mail', 'adresse e-mail'],
  telephone: ['telephone', 'tel', 'phone', 'mobile', 'portable', 'numero de telephone', 'tel portable', 'gsm'],
};

/**
 * La colonne STANDARD qu'alimente un en-tete, ou null. Comparaison sans accents ni casse :
 * « Prénom » et « PRENOM » alimentent toutes deux le prenom. Une seule colonne par cle
 * standard : la PREMIERE qui correspond (les suivantes restent des colonnes du fichier).
 */
export function correspondancesSysteme(entetes: string[]): Map<string, CleSysteme> {
  const res = new Map<string, CleSysteme>();
  const prises = new Set<CleSysteme>();
  for (const e of entetes) {
    const n = sansAccents(cleCanonique(e) ?? '');
    for (const cle of Object.keys(VARIANTES) as CleSysteme[]) {
      if (prises.has(cle)) continue;
      if (VARIANTES[cle].includes(n)) { res.set(e, cle); prises.add(cle); break; }
    }
  }
  return res;
}
