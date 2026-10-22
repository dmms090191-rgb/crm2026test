/**
 * LES DECISIONS DU MODULE DOCUMENTS — toutes mesurables, aucune dans un composant.
 *
 * ---------- POURQUOI UN FICHIER SEPARE ----------
 *
 * Valider un type, calculer une echelle, reconnaitre un HEIC, decider qu'un canvas est
 * vide : ce sont des fonctions pures. Les laisser dans le composant les rendrait
 * intestables sans navigateur, et c'est exactement la famille de defauts que ce module
 * ne peut pas se permettre — une conversion qui rate en silence fait perdre un document.
 *
 * Le hook et le composant ne font donc QUE de l'entree-sortie : ils appellent ces
 * fonctions, ils n'en reimplementent aucune.
 */

/** 15 Mo. Mesure : un A4 photographie en 12 Mpx pese 1,3 a 2,5 Mo en JPEG, un PDF scanne
 *  d'une vingtaine de pages quelques Mo, et une photo de telephone non convertie jusqu'a
 *  une dizaine. Au-dela, l'envoi devient penible sur un reseau mobile. La meme borne est
 *  posee trois fois : ici, dans le CHECK de la table, et sur le bucket. */
export const TAILLE_MAX = 15_728_640;

/** Le cote long apres conversion. Mesure : 2560 px sur un A4, c'est environ 220 dpi —
 *  confortablement lisible pour du texte (un A4 numerise a 200 dpi fait 3,9 Mpx). Et
 *  2560 x 1920 = 4,9 Mpx, tres en dessous du plafond de canvas d'iOS (16 777 216 px),
 *  au-dela duquel le canvas rend du BLANC sans lever d'exception. */
export const COTE_MAX = 2560;

/** Mesure du compromis sur un document texte bruite, le pire cas pour le JPEG :
 *  q 0,92 -> 1001 Ko et 98,2 % des contours de lettres ; q 0,85 -> 707 Ko et 97,2 % ;
 *  q 0,75 -> 511 Ko et 95,1 %. Monter a 0,92 coute 294 Ko pour un point ; descendre a
 *  0,75 economise 196 Ko pour en perdre deux. 0,85 est le coude de la courbe. */
export const QUALITE_JPEG = 0.85;

/**
 * Les types acceptes, et l'extension qu'on leur donne dans Storage.
 *
 * SVG est volontairement ABSENT : un SVG ouvert par une URL signee executerait ses
 * scripts, dans une origine qui porte la session de l'utilisateur.
 */
export const TYPES_ACCEPTES: Readonly<Record<string, string>> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/webp': 'webp',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};

/** Les extensions reconnues quand le navigateur ne dit rien du type — ce qui arrive. */
const TYPE_PAR_EXTENSION: Readonly<Record<string, string>> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg', jpeg: 'image/jpeg',
  png: 'image/png',
  heic: 'image/heic', heif: 'image/heif',
  webp: 'image/webp',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

/**
 * L'attribut `accept` du bouton << Prendre une photo >>.
 *
 * `image/*` et non une liste fine : un accept trop etroit empeche certains Android
 * d'ouvrir la camera.
 */
export const ACCEPT_PHOTO = 'image/*';

/**
 * L'attribut `accept` du bouton << Ajouter un document >>.
 *
 * MIXTE, et c'est mesure : `image/*` SEUL prive Chrome Android de camera, et un accept
 * melangeant des types non-image la retablit. Le chat du projet le fait deja.
 *
 * `image/heic` en est volontairement ABSENT : avec lui, Safari 17+ renomme un JPEG choisi
 * par l'utilisateur en << tempImageXXXX.heic >> et reecrit son type. Consequence assumee :
 * sur un ordinateur, le selecteur ne proposera pas les .heic. Les extensions .doc/.docx
 * sont citees en clair parce que leurs types MIME officiels ne sont pas toujours connus
 * du systeme.
 */
export const ACCEPT_DOCUMENT = 'image/*,application/pdf,.doc,.docx';

/** L'extension d'un nom de fichier, en minuscules, sans le point. '' si aucune. */
export function extensionDe(nom: string): string {
  const i = nom.lastIndexOf('.');
  if (i <= 0 || i === nom.length - 1) return '';
  return nom.slice(i + 1).toLowerCase();
}

/**
 * Le type d'un fichier, en se mefiant de ce que dit le navigateur.
 *
 * `file.type` est vide sur certains .heic d'iOS, et le patron du chat
 * (`file.type.startsWith('image/')`) classerait alors la photo en document. On retombe
 * donc sur l'extension, qui est la seule autre indication disponible AVANT lecture.
 */
export function typeDeclare(nom: string, type: string): string {
  if (type !== '' && TYPES_ACCEPTES[type] !== undefined) return type;
  const parExtension = TYPE_PAR_EXTENSION[extensionDe(nom)];
  return parExtension ?? type;
}

/** Un poids en octets, lisible. 1 Ko = 1024, comme partout ailleurs dans l'outil. */
export function poidsLisible(octets: number): string {
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${Math.round(octets / 1024)} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`;
}

/**
 * Ce qui empeche d'accepter ce fichier, ou '' s'il est acceptable.
 *
 * Valider ici ne dispense pas la base et le bucket de valider : cela remplace un message
 * Postgres ou un 413 que personne ne comprend par une phrase lisible, AVANT que le
 * fichier ne traverse le reseau.
 */
export function problemeDeFichier(f: { name: string; type: string; size: number }): string {
  if (f.size === 0) return 'Ce fichier est vide.';
  if (f.size > TAILLE_MAX) {
    return `Ce fichier pèse ${poidsLisible(f.size)}, au-delà de la limite de ${poidsLisible(TAILLE_MAX)}.`;
  }
  const type = typeDeclare(f.name, f.type);
  if (TYPES_ACCEPTES[type] === undefined) {
    return 'Ce format n’est pas accepté. Formats acceptés : PDF, JPG, PNG, HEIC, WEBP, DOC, DOCX.';
  }
  return '';
}

/* ---------------------------------------------------------------------------
 * RECONNAITRE UN HEIC AUX OCTETS
 * ------------------------------------------------------------------------- */

/** Les marques principales d'un fichier HEIF/HEIC. */
const MARQUES_HEIF = new Set(['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs', 'mif1', 'msf1']);
/** Les marques d'un AVIF, qui se decode nativement et ne doit donc PAS etre converti. */
const MARQUES_AVIF = new Set(['avif', 'avis']);

export interface MarquesIsoBmff {
  principale: string;
  compatibles: string[];
}

/**
 * Les marques d'un conteneur ISO-BMFF, ou null si ce n'en est pas un.
 *
 * Forme : taille(4) + "ftyp"(4) + marque principale(4) + version(4) + marques
 * compatibles(4 chacune). On s'arrete a 64 octets : au-dela on sort de la boite ftyp.
 */
export function marquesIsoBmff(octets: Uint8Array): MarquesIsoBmff | null {
  if (octets.length < 12) return null;
  const mot = (n: number) => String.fromCharCode(...octets.subarray(n, n + 4));
  if (mot(4) !== 'ftyp') return null;
  const compatibles: string[] = [];
  for (let i = 16; i + 4 <= Math.min(octets.length, 64); i += 4) {
    const m = mot(i);
    /* Une marque est faite de caracteres imprimables. Des octets quelconques signalent
       qu'on a quitte la liste. */
    if (!/^[\x20-\x7e]{4}$/.test(m)) break;
    compatibles.push(m);
  }
  return { principale: mot(8), compatibles };
}

/**
 * Vrai si ces octets sont du HEIF/HEIC.
 *
 * ---------- LA MARQUE PRINCIPALE TRANCHE, ET C'EST MESURE ----------
 *
 * Un AVIF declare tres souvent `mif1` dans ses marques COMPATIBLES, parce que les deux
 * formats sont des conteneurs d'image ISO-BMFF. Se fier aux compatibles classait donc
 * l'AVIF en HEIF — defaut trouve par un temoin negatif, et pas par relecture. On ne
 * descend aux compatibles que si la marque principale est inconnue, et jamais vers HEIF
 * si `avif` y figure.
 */
export function estHeif(octets: Uint8Array): boolean {
  const m = marquesIsoBmff(octets);
  if (m === null) return false;
  if (MARQUES_AVIF.has(m.principale)) return false;
  if (MARQUES_HEIF.has(m.principale)) return true;
  if (m.compatibles.some(c => MARQUES_AVIF.has(c))) return false;
  return m.compatibles.some(c => MARQUES_HEIF.has(c));
}

/* ---------------------------------------------------------------------------
 * LES OCTETS DOIVENT CONFIRMER LE TYPE ANNONCE
 * ------------------------------------------------------------------------- */

/**
 * Combien d'octets il faut lire a chaque bout du fichier pour decider.
 *
 * Le DEBUT porte la signature de tous les formats. La FIN est necessaire pour le seul
 * DOCX : un ZIP range son catalogue central a la fin, et c'est la que vivent les noms de
 * toutes ses entrees. 64 Ko suffisent largement pour le catalogue d'un document Word.
 */
export const OCTETS_DEBUT = 4096;
export const OCTETS_FIN = 65536;

const commence = (o: Uint8Array, motif: number[], depuis = 0): boolean => {
  if (o.length < depuis + motif.length) return false;
  for (let i = 0; i < motif.length; i++) if (o[depuis + i] !== motif[i]) return false;
  return true;
};

/** Cherche une suite d'octets ASCII dans un tampon. Rend -1 si absente. */
const chercher = (o: Uint8Array, texte: string): number => {
  if (o.length < texte.length) return -1;
  const premier = texte.charCodeAt(0);
  for (let i = 0; i <= o.length - texte.length; i++) {
    if (o[i] !== premier) continue;
    let bon = true;
    for (let j = 1; j < texte.length; j++) {
      if (o[i + j] !== texte.charCodeAt(j)) { bon = false; break; }
    }
    if (bon) return i;
  }
  return -1;
};

/* Le PDF n'a pas sa constante d'octets : sa signature %PDF- est CHERCHEE dans la tete,
   et non exigee a l'offset zero — voir plus bas. */
const SIGNATURE_JPEG = [0xFF, 0xD8, 0xFF];
const SIGNATURE_PNG = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
const SIGNATURE_ZIP = [0x50, 0x4B, 0x03, 0x04];                             // PK\x03\x04
const SIGNATURE_OLE2 = [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1];    // .doc, .xls, .ppt
const SIGNATURE_RTF = [0x7B, 0x5C, 0x72, 0x74, 0x66];                       // {\rtf

/**
 * Ce qui empeche de croire que ces octets sont bien du type annonce, ou '' s'ils le sont.
 *
 * ---------- POURQUOI CE CONTROLE EXISTE ----------
 *
 * `allowed_mime_types` de Supabase compare le Content-Type ANNONCE par le client, jamais
 * les octets : un .exe renomme .pdf passait donc entierement. Ce n'est pas une frontiere
 * de securite, et il ne faut pas la presenter comme telle.
 *
 * ---------- ET POURQUOI CE N'EST PAS UN ANTIVIRUS ----------
 *
 * On verifie une SIGNATURE, pas un contenu. Un PDF veritable mais malveillant passera, et
 * c'est hors de portee de ce controle — ce qui protege la, c'est que le bucket est prive,
 * qu'aucune URL permanente n'existe, et que SVG est exclu de la liste de types. L'objet
 * ici est d'arreter les faux types EVIDENTS, et de le dire clairement a l'utilisateur.
 *
 * @param type   le type retenu par typeDeclare()
 * @param debut  les premiers OCTETS_DEBUT octets du fichier
 * @param fin    les derniers OCTETS_FIN octets — necessaires au seul DOCX
 */
export function problemeDeSignature(type: string, debut: Uint8Array, fin: Uint8Array): string {
  const faux = (quoi: string) =>
    `Ce fichier annonce ${quoi}, mais son contenu n’en est pas un. Il a probablement été renommé.`;

  switch (type) {
    case 'application/pdf':
      /* La specification place %PDF- au tout debut, mais les lecteurs tolerent jusqu'a
         1024 octets de rebut avant lui, et des fichiers reels en portent. On cherche donc
         dans la tete plutot que d'exiger l'offset zero : refuser un PDF que tout le monde
         ouvre serait un defaut, pas une rigueur. */
      return chercher(debut.subarray(0, 1024), '%PDF-') >= 0 ? '' : faux('un PDF');

    case 'image/jpeg':
      return commence(debut, SIGNATURE_JPEG) ? '' : faux('une image JPEG');

    case 'image/png':
      return commence(debut, SIGNATURE_PNG) ? '' : faux('une image PNG');

    case 'image/webp':
      /* RIFF....WEBP : la taille occupe les quatre octets du milieu. */
      return commence(debut, [0x52, 0x49, 0x46, 0x46]) && commence(debut, [0x57, 0x45, 0x42, 0x50], 8)
        ? '' : faux('une image WEBP');

    case 'image/heic':
    case 'image/heif':
      /* Meme lecture que pour la conversion : la marque principale tranche, et un AVIF
         n'est pas du HEIF meme s'il se declare compatible mif1. */
      return estHeif(debut) ? '' : faux('une photo HEIC');

    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      if (!commence(debut, SIGNATURE_ZIP)) return faux('un document Word (.docx)');
      /*
       * UN DOCX EST UN ZIP, ET PAS N'IMPORTE LEQUEL.
       *
       * On exige la trace du dossier `word/`, la ou vivent document.xml et ses voisins.
       * Les noms d'entrees ne sont jamais compresses : ils figurent en clair dans l'entete
       * local de chaque entree ET dans le catalogue central, a la fin du fichier. On
       * regarde donc les deux bouts. Sans ce second controle, n'importe quelle archive
       * ZIP — un .zip renomme, un .jar, un .xlsx — passerait pour un document Word.
       */
      return chercher(debut, 'word/') >= 0 || chercher(fin, 'word/') >= 0
        ? '' : faux('un document Word (.docx)');

    case 'application/msword':
      /*
       * L'ANCIEN .doc EST UN CONTENEUR OLE2. Un .doc enregistre en RTF par une vieille
       * version de Word est aussi legitime, et Word l'ouvre : on l'accepte.
       *
       * LIMITE ASSUMEE, ET ELLE EST REELLE : la signature OLE2 est commune a .doc, .xls
       * et .ppt. Un classeur Excel renomme .doc passera donc ce controle. Distinguer
       * Word demanderait de parcourir le repertoire OLE pour y trouver le flux
       * << WordDocument >>, soit un lecteur de format a ecrire et a maintenir — hors de
       * proportion avec l'objet, qui est d'arreter les faux types evidents.
       */
      return commence(debut, SIGNATURE_OLE2) || commence(debut, SIGNATURE_RTF)
        ? '' : faux('un document Word (.doc)');

    default:
      /* Un type hors de la liste a deja ete refuse par problemeDeFichier. Ne rien dire
         ici evite de refuser deux fois pour la meme raison. */
      return '';
  }
}

/**
 * LE TYPE QUE LES OCTETS DECLARENT, ou '' quand ils ne disent rien de reconnaissable.
 *
 * ---------- POURQUOI LES OCTETS FONT FOI, ET PAS LE NOM ----------
 *
 * Le cas qui impose cette fonction : un iPhone peut livrer un JPEG en gardant le nom
 * `IMG_0042.HEIC`, avec un `file.type` VIDE. Deduire le type de l'extension donnerait
 * alors << HEIC >>, les octets diraient << JPEG >>, et le fichier serait REFUSE — un
 * faux refus, qui fait perdre un document parfaitement valide. C'est exactement ce qu'on
 * cherche a eviter.
 *
 * On lit donc le type dans le contenu, et le nom ne sert plus qu'a departager ce que le
 * contenu ne peut pas dire. L'ordre des controles compte : le PNG et le JPEG ont des
 * signatures sans ambiguite, l'AVIF doit sortir avant le HEIF, et un ZIP n'est un DOCX
 * que s'il porte la trace de `word/`.
 */
export function typeDesOctets(debut: Uint8Array, fin: Uint8Array): string {
  if (commence(debut, SIGNATURE_PNG)) return 'image/png';
  if (commence(debut, SIGNATURE_JPEG)) return 'image/jpeg';
  if (chercher(debut.subarray(0, 1024), '%PDF-') >= 0) return 'application/pdf';
  if (commence(debut, [0x52, 0x49, 0x46, 0x46]) && commence(debut, [0x57, 0x45, 0x42, 0x50], 8)) {
    return 'image/webp';
  }
  if (estHeif(debut)) return 'image/heic';
  if (commence(debut, SIGNATURE_ZIP)) {
    /* Un ZIP sans trace de `word/` n'est pas un document Word : ni .xlsx, ni .jar, ni une
       archive quelconque renommee. On rend '' plutot que de mentir. */
    return chercher(debut, 'word/') >= 0 || chercher(fin, 'word/') >= 0
      ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      : '';
  }
  if (commence(debut, SIGNATURE_OLE2) || commence(debut, SIGNATURE_RTF)) return 'application/msword';
  return '';
}

/** Vrai si ce type est verifiable par signature. Sert a le DIRE dans le compte rendu. */
export function signatureVerifiable(type: string): boolean {
  return type === 'application/pdf' || type === 'image/jpeg' || type === 'image/png'
    || type === 'image/webp' || type === 'image/heic' || type === 'image/heif'
    || type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    || type === 'application/msword';
}

/* ---------------------------------------------------------------------------
 * LA CONVERSION : CE QUI SE DECIDE SANS NAVIGATEUR
 * ------------------------------------------------------------------------- */

/** Vrai si ce type merite une tentative de conversion vers JPEG. */
export function aConvertir(type: string): boolean {
  /* Un PDF, un DOC : rien a convertir. Un JPEG deja au bon format n'a besoin que d'etre
     reduit s'il est trop grand, ce que decide echelleVers. */
  return type === 'image/heic' || type === 'image/heif' || type === 'image/png'
    || type === 'image/webp' || type === 'image/jpeg';
}

/**
 * La taille de sortie pour un cote long donne, en gardant les proportions.
 *
 * Rend les dimensions d'origine quand l'image est deja assez petite : reencoder une
 * image de 800 px pour la << reduire >> a 2560 ne ferait que perdre de la qualite.
 */
export function echelleVers(largeur: number, hauteur: number, cote: number = COTE_MAX): { largeur: number; hauteur: number } {
  if (largeur <= 0 || hauteur <= 0) return { largeur: 0, hauteur: 0 };
  const plusGrand = Math.max(largeur, hauteur);
  if (plusGrand <= cote) return { largeur, hauteur };
  const f = cote / plusGrand;
  /* Au moins 1 px : une image de 10000 x 1 ne doit pas donner une hauteur de 0. */
  return { largeur: Math.max(1, Math.round(largeur * f)), hauteur: Math.max(1, Math.round(hauteur * f)) };
}

/**
 * LE GARDE-FOU. Vrai si une image reduite porte vraiment du contenu.
 *
 * ---------- POURQUOI L'ETENDUE, ET NON DES SONDES DE PIXELS ----------
 *
 * Au-dela de son plafond, le canvas d'iOS rend du BLANC sans lever d'exception : on
 * reencoderait un JPEG vide et le document serait PERDU en silence. Il faut donc verifier
 * le resultat, pas faire confiance a l'absence d'erreur.
 *
 * La premiere version de ce controle echantillonnait des points sur une grille reguliere,
 * et elle a declare << vide >> une image parfaitement bonne : pour une hauteur de 4031 px,
 * `floor(4031 * j / 12) mod 48` vaut 47 pour les onze sondes, qui tombaient donc toutes
 * dans la meme bande d'un damier de 48 px. Un faux << conversion echouee >> fait refuser
 * un document valide, ce qui est aussi grave que l'inverse.
 *
 * La REDUCTION, elle, moyenne les pixels : elle ne peut pas rater du contenu par
 * alignement. Mesure avec temoin : etendue 253 sur une image reelle, 0 sur un canvas vide.
 * Le seuil de 8 laisse passer une image tres peu contrastee tout en rejetant l'uniforme.
 */
export function etendueSuffisante(minimum: number, maximum: number): boolean {
  return maximum - minimum > 8;
}

/* ---------------------------------------------------------------------------
 * NOMS ET CHEMINS
 * ------------------------------------------------------------------------- */

/**
 * Un nom long, raccourci EN GARDANT L'EXTENSION visible.
 *
 * `truncate` en CSS coupe par la fin : << Contrat de location Michel Vi... >> ne dit plus
 * si c'est un PDF ou un DOCX. Ici on coupe au MILIEU, parce que la fin porte
 * l'information de format. Le projet n'avait aucun utilitaire de ce genre.
 */
export function nomTronque(nom: string, maxi = 32): string {
  if (nom.length <= maxi) return nom;
  const ext = extensionDe(nom);
  const suffixe = ext === '' ? '' : '.' + ext;
  /* Sans place pour une queue lisible, on coupe simplement par la fin. */
  if (maxi <= suffixe.length + 4) return nom.slice(0, Math.max(1, maxi - 1)) + '…';
  const base = nom.slice(0, nom.length - suffixe.length);
  const place = maxi - suffixe.length - 1;
  const tete = Math.ceil(place / 2);
  const queue = place - tete;
  return base.slice(0, tete) + '…' + (queue > 0 ? base.slice(base.length - queue) : '') + suffixe;
}

/**
 * Le chemin Storage d'un document.
 *
 * {company_id}/{dossier_id}/{document_id}.{ext}
 *
 * Le premier segment DOIT etre le company_id : les quatre policies du bucket lisent
 * storage.foldername(name)[1], et aucune migration ne pourrait recloisonner apres coup
 * des objets deposes a plat. Le nom technique est l'id du document, donc deux fichiers
 * nommes << Contrat.pdf >> coexistent sans s'ecraser — par construction, et non par
 * precaution d'appelant.
 */
export function cheminDocument(companyId: string, dossierId: string, documentId: string, extension: string): string {
  const ext = extension === '' ? 'bin' : extension.toLowerCase();
  return `${companyId}/${dossierId}/${documentId}.${ext}`;
}

/** L'extension a donner dans Storage pour un type accepte. */
export function extensionPourType(type: string): string {
  return TYPES_ACCEPTES[type] ?? 'bin';
}

/** Vrai si ce type peut raisonnablement s'afficher en miniature dans un navigateur. */
export function afficheEnMiniature(type: string): boolean {
  /* HEIC et HEIF en sont exclus : mesure faite avec temoin, Chromium les REFUSE
     (un PNG minimal se decode, un HEIC et un HEIF declenchent onerror). Une miniature
     HEIC serait une vignette cassee et muette. L'interface retombe de toute facon sur
     une icone via onError, ce qui couvre aussi les formats futurs. */
  return type === 'image/jpeg' || type === 'image/png' || type === 'image/webp';
}
