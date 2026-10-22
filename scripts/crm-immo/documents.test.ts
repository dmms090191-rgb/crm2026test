/**
 * Tests des DECISIONS du module Documents.
 * Lancer :  npx tsx scripts/crm-immo/documents.test.ts
 *
 * ---------- POURQUOI DE VRAIS TESTS, ET NON UNE LECTURE DE SOURCE ----------
 *
 * Tout ce qui est verifie ici est une fonction pure : reconnaitre un HEIC aux octets,
 * calculer une echelle, decider qu'un canvas est vide, valider un type. On peut donc
 * mesurer le COMPORTEMENT, y compris sur les cas qu'on ne saurait pas provoquer a la
 * main — un AVIF qui se declare compatible HEIF, un nom sans extension, une image de
 * 10000 x 1.
 *
 * ---------- ET POURQUOI CHAQUE CAS A SON TEMOIN NEGATIF ----------
 *
 * Une fonction qui repond << oui >> a tout passerait une batterie de cas positifs. Le
 * defaut de l'AVIF classe en HEIF a ete trouve par un temoin negatif, pas par relecture :
 * sans lui, la detection paraissait parfaite sur dix cas.
 */
import {
  TAILLE_MAX, COTE_MAX, QUALITE_JPEG, TYPES_ACCEPTES,
  ACCEPT_PHOTO, ACCEPT_DOCUMENT,
  extensionDe, typeDeclare, poidsLisible, problemeDeFichier,
  marquesIsoBmff, estHeif, aConvertir, echelleVers, etendueSuffisante,
  problemeDeSignature, signatureVerifiable, typeDesOctets, OCTETS_DEBUT, OCTETS_FIN,
  nomTronque, cheminDocument, extensionPourType, afficheEnMiniature,
} from '../../src/lib/crmImmoDocuments.ts';

let ko = 0, ok = 0;
const t = (nom: string, cond: boolean) => {
  if (cond) { ok++; console.log('  OK    | ' + nom); }
  else { ko++; console.log('  ECHEC | ' + nom); }
};

/** Un en-tete ISO-BMFF fabrique : taille(4) + ftyp + marques. */
const isoBmff = (principale: string, ...compatibles: string[]): Uint8Array => {
  const o: number[] = [0, 0, 0, 0x18];
  for (const mot of ['ftyp', principale, '\0\0\0\0', ...compatibles]) {
    for (const c of mot) o.push(c.charCodeAt(0));
  }
  return new Uint8Array(o);
};

console.log('\n=== 1. LES CONSTANTES VALIDEES PAR DAVID ===');
{
  t('la limite de taille est 15 Mo', TAILLE_MAX === 15 * 1024 * 1024);
  t('le cote long est 2560 px', COTE_MAX === 2560);
  t('la qualite JPEG est 0,85', QUALITE_JPEG === 0.85);
  /* 2560 x 1920 doit rester tres en dessous du plafond de canvas d'iOS, sans quoi tout
     l'edifice de conversion s'ecroule sur un canvas blanc. */
  t('le canvas de sortie reste sous le plafond iOS de 16 777 216 px',
    COTE_MAX * Math.round(COTE_MAX * 3 / 4) < 16_777_216);
}

console.log('\n=== 2. LES TYPES ACCEPTES ===');
{
  for (const attendu of ['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/heif',
                         'application/msword',
                         'application/vnd.openxmlformats-officedocument.wordprocessingml.document']) {
    t(`${attendu} est accepte`, TYPES_ACCEPTES[attendu] !== undefined);
  }
  /* LE POINT DE SECURITE : un SVG ouvert par URL signee executerait ses scripts, dans
     une origine qui porte la session. */
  t('SVG est REFUSE', TYPES_ACCEPTES['image/svg+xml'] === undefined);
  t('un executable est refuse', TYPES_ACCEPTES['application/x-msdownload'] === undefined);
  t('le HTML est refuse', TYPES_ACCEPTES['text/html'] === undefined);
}

console.log('\n=== 3. LES DEUX ATTRIBUTS accept ===');
{
  t('le bouton photo accepte les images', ACCEPT_PHOTO.includes('image/*'));
  /* Mesure : `image/*` SEUL prive Chrome Android de camera ; un accept MIXTE la
     retablit. Le champ document doit donc melanger des types non-image. */
  t('le bouton document est mixte (sinon Chrome Android perd la camera)',
    ACCEPT_DOCUMENT.includes('image/*') && ACCEPT_DOCUMENT.includes('application/pdf'));
  /* Mesure : avec `image/heic` dans accept, Safari 17+ renomme un JPEG choisi par
     l'utilisateur en tempImageXXXX.heic et reecrit son type. */
  t('image/heic est ABSENT de accept (piege Safari 17+)',
    !ACCEPT_PHOTO.includes('image/heic') && !ACCEPT_DOCUMENT.includes('image/heic'));
  t('.doc et .docx sont cites en clair', ACCEPT_DOCUMENT.includes('.doc') && ACCEPT_DOCUMENT.includes('.docx'));
}

console.log('\n=== 4. RECONNAITRE UN HEIC AUX OCTETS ===');
{
  t('HEIC d iPhone', estHeif(isoBmff('heic', 'heic', 'mif1')));
  t('sequence hevc', estHeif(isoBmff('hevc', 'hevc')));
  t('HEIF generique mif1', estHeif(isoBmff('mif1', 'mif1', 'heic')));
  t('marque principale inconnue mais compatible heic', estHeif(isoBmff('xxxx', 'heic')));

  /* LE PIEGE MESURE : un AVIF declare tres souvent mif1 en compatible. Se fier aux
     compatibles le classait en HEIF, alors qu'il se decode nativement. */
  t('TEMOIN : un AVIF qui declare mif1 n est PAS du HEIF', !estHeif(isoBmff('avif', 'avif', 'mif1')));
  /*
   * LE CAS QUI ISOLE LE GARDE SUR LA MARQUE PRINCIPALE, et il a ete trouve par mutation.
   *
   * Le cas ci-dessus ne suffit pas : comme il repete `avif` dans ses marques COMPATIBLES,
   * le second garde l'attrape, et retirer le premier ne casse rien. Un AVIF reel peut
   * tres bien n'annoncer que `mif1` en compatible — et la, sans le garde sur la marque
   * principale, il serait pris pour du HEIF et converti pour rien.
   */
  t('TEMOIN : un AVIF dont les compatibles ne portent QUE mif1 n est pas du HEIF',
    !estHeif(isoBmff('avif', 'mif1')));
  t('TEMOIN : un AVIF sans aucune marque compatible non plus', !estHeif(isoBmff('avif')));
  t('TEMOIN : une sequence avis n est pas du HEIF', !estHeif(isoBmff('avis', 'avis', 'mif1')));
  t('TEMOIN : marque inconnue avec avif en compatible n est pas du HEIF',
    !estHeif(isoBmff('xxxx', 'avif', 'mif1')));

  t('TEMOIN : un MP4 n est pas du HEIF', !estHeif(isoBmff('isom', 'isom', 'mp41')));
  /* Un vrai JPEG commence par FFD8FFE0, pas par une boite ftyp. */
  t('TEMOIN : un JPEG n est pas du HEIF',
    !estHeif(new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0, 0x10, 0x4A, 0x46, 0x49, 0x46, 0, 1])));
  t('TEMOIN : un PNG n est pas du HEIF',
    !estHeif(new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0x0D])));
  t('TEMOIN : un fichier tronque ne plante pas et rend faux',
    !estHeif(new Uint8Array([0, 0, 0, 0x18, 0x66, 0x74])));
  t('TEMOIN : un fichier vide rend faux', !estHeif(new Uint8Array([])));

  const m = marquesIsoBmff(isoBmff('heic', 'heic', 'mif1'));
  t('les marques sont lues correctement',
    m !== null && m.principale === 'heic' && m.compatibles.includes('mif1'));
  t('un fichier non ISO-BMFF rend null', marquesIsoBmff(new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0, 0, 0, 0, 0, 0, 0, 0])) === null);
}

console.log('\n=== 5. QUOI CONVERTIR ===');
{
  t('un HEIC est a convertir', aConvertir('image/heic'));
  t('un HEIF est a convertir', aConvertir('image/heif'));
  t('un JPEG est a traiter aussi (il peut etre trop grand)', aConvertir('image/jpeg'));
  t('TEMOIN : un PDF n est pas a convertir', !aConvertir('application/pdf'));
  t('TEMOIN : un DOCX n est pas a convertir',
    !aConvertir('application/vnd.openxmlformats-officedocument.wordprocessingml.document'));
}

console.log('\n=== 6. L ECHELLE ===');
{
  const p = echelleVers(3024, 4032);
  t('une photo 12 Mpx est ramenee a 2560 de cote long', Math.max(p.largeur, p.hauteur) === 2560);
  t('et ses proportions sont gardees', Math.abs(p.largeur / p.hauteur - 3024 / 4032) < 0.01);
  t('le resultat tient sous le plafond iOS', p.largeur * p.hauteur < 16_777_216);

  /*
   * 8064 x 6048, c'est le capteur 48 Mpx d'un iPhone recent : 48,8 Mpx en entree, soit
   * presque TROIS FOIS le plafond de canvas d'iOS (16 777 216 px), au-dela duquel le
   * canvas rend du blanc sans lever d'exception. C'est ce rapport qui rend la reduction
   * obligatoire, et non souhaitable.
   *
   * On n'en fait PAS une assertion : comparer deux litteraux est une tautologie, que le
   * lint signale a juste titre. Le fait appartient au commentaire ; ce qui se verifie,
   * c'est la SORTIE.
   */
  const grand = echelleVers(8064, 6048);
  t('une photo 48 Mpx aussi', Math.max(grand.largeur, grand.hauteur) === 2560);
  t('et sa sortie tient tres en dessous du plafond iOS',
    grand.largeur * grand.hauteur < 5_000_000);

  const petit = echelleVers(800, 600);
  t('TEMOIN : une image deja petite n est PAS agrandie',
    petit.largeur === 800 && petit.hauteur === 600);
  const pile = echelleVers(2560, 1000);
  t('TEMOIN : une image pile a la limite est laissee telle quelle',
    pile.largeur === 2560 && pile.hauteur === 1000);
  const fil = echelleVers(10000, 1);
  t('un format extreme ne rend jamais une dimension nulle', fil.hauteur >= 1 && fil.largeur === 2560);
  const vide = echelleVers(0, 0);
  t('TEMOIN : des dimensions nulles ne plantent pas', vide.largeur === 0 && vide.hauteur === 0);
}

console.log('\n=== 7. LE GARDE-FOU ANTI-CANVAS-BLANC ===');
{
  /* Mesure reelle : etendue 253 (min 2, max 255) sur une image de document reduite en
     32x32 ; etendue 0 sur un canvas vide passe par la meme voie. */
  t('une image reelle est acceptee (etendue mesuree 253)', etendueSuffisante(2, 255));
  t('TEMOIN : un canvas vide est REFUSE (etendue mesuree 0)', !etendueSuffisante(0, 0));
  t('TEMOIN : un canvas uniformement blanc est refuse', !etendueSuffisante(255, 255));
  t('TEMOIN : un canvas uniformement noir est refuse', !etendueSuffisante(0, 0));
  t('une image tres peu contrastee passe quand meme', etendueSuffisante(120, 140));
  t('TEMOIN : un bruit insignifiant est refuse', !etendueSuffisante(127, 134));
}

console.log('\n=== 8. LE TYPE QUAND LE NAVIGATEUR SE TAIT ===');
{
  /* Mesure : file.type est VIDE sur certains .heic d iOS. Le patron du chat
     (`file.type.startsWith('image/')`) classerait alors la photo en document. */
  t('un .heic sans type est reconnu par son extension', typeDeclare('IMG_0042.HEIC', '') === 'image/heic');
  t('un .pdf sans type aussi', typeDeclare('bail.pdf', '') === 'application/pdf');
  t('un .docx sans type aussi',
    typeDeclare('bail.docx', '') === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  t('un type annonce valide est respecte', typeDeclare('photo.jpg', 'image/jpeg') === 'image/jpeg');
  t('TEMOIN : une extension inconnue sans type ne fabrique rien', typeDeclare('chose.xyz', '') === '');
  t('l extension est lue en minuscules', extensionDe('BAIL.PDF') === 'pdf');
  t('TEMOIN : un nom sans extension rend une chaine vide', extensionDe('bail') === '');
  t('TEMOIN : un nom finissant par un point rend une chaine vide', extensionDe('bail.') === '');
  t('TEMOIN : un fichier cache n est pas une extension', extensionDe('.gitignore') === '');
}

console.log('\n=== 9. CE QUI FAIT REFUSER UN FICHIER ===');
{
  const bon = { name: 'bail.pdf', type: 'application/pdf', size: 1000 };
  t('un PDF normal est accepte', problemeDeFichier(bon) === '');
  t('un fichier vide est refuse', problemeDeFichier({ ...bon, size: 0 }) !== '');
  t('un fichier de 16 Mo est refuse', problemeDeFichier({ ...bon, size: 16 * 1024 * 1024 }) !== '');
  t('et le message dit le poids ET la limite',
    problemeDeFichier({ ...bon, size: 16 * 1024 * 1024 }).includes('15,0 Mo'));
  t('TEMOIN : pile 15 Mo passe', problemeDeFichier({ ...bon, size: TAILLE_MAX }) === '');
  t('TEMOIN : un octet de trop est refuse', problemeDeFichier({ ...bon, size: TAILLE_MAX + 1 }) !== '');
  t('un SVG est refuse', problemeDeFichier({ name: 'x.svg', type: 'image/svg+xml', size: 100 }) !== '');
  t('un .exe est refuse', problemeDeFichier({ name: 'x.exe', type: 'application/x-msdownload', size: 100 }) !== '');
  /* Un .exe renomme en .pdf passe la validation du navigateur : c'est assume, et c'est
     pourquoi le bucket est prive et ne sert jamais de HTML. Le test fige ce fait au lieu
     de laisser croire a une protection. */
  t('un .exe renomme en .pdf passe la validation cliente (limite connue, assumee)',
    problemeDeFichier({ name: 'piege.pdf', type: 'application/pdf', size: 100 }) === '');
  t('un HEIC sans type annonce est accepte', problemeDeFichier({ name: 'IMG.HEIC', type: '', size: 100 }) === '');
  t('le message de format cite les formats acceptes',
    problemeDeFichier({ name: 'x.zip', type: 'application/zip', size: 10 }).includes('PDF'));
}

console.log('\n=== 10. LE POIDS LISIBLE ===');
{
  t('des octets', poidsLisible(512) === '512 o');
  t('des kilo-octets', poidsLisible(2048) === '2 Ko');
  t('des mega-octets avec une virgule francaise', poidsLisible(1_572_864) === '1,5 Mo');
  t('la limite se lit 15,0 Mo', poidsLisible(TAILLE_MAX) === '15,0 Mo');
}

console.log('\n=== 11. LE NOM TRONQUE GARDE L EXTENSION ===');
{
  const long = 'Contrat de location Michel Vidal signe le 12 mars.pdf';
  const court = nomTronque(long, 32);
  t('un nom long est raccourci', court.length <= 32);
  /* LE POINT : truncate en CSS coupe par la fin et masque l extension — on ne distingue
     plus un .pdf d un .docx. */
  t('et l extension reste VISIBLE', court.endsWith('.pdf'));
  t('et le debut reste reconnaissable', court.startsWith('Contrat'));
  t('TEMOIN : un nom court n est pas touche', nomTronque('bail.pdf', 32) === 'bail.pdf');
  t('TEMOIN : un nom pile a la limite n est pas touche',
    nomTronque('a'.repeat(28) + '.pdf', 32) === 'a'.repeat(28) + '.pdf');
  t('un nom sans extension est quand meme raccourci', nomTronque('x'.repeat(50), 20).length <= 20);
  t('une limite absurde ne plante pas', nomTronque(long, 3).length <= 3);
  t('deux noms differents restent differents apres troncature',
    nomTronque('Contrat Michel Vidal 2026 janvier.pdf', 24) !== nomTronque('Contrat Michel Vidal 2026 fevrier.pdf', 24));
}

console.log('\n=== 12. LE CHEMIN STORAGE ===');
{
  const c = cheminDocument('87875350-40c8-4ee5-be3b-9398fa4106bf', 'a0f395b2-63e8-4ebf-94d4-7dd2a92b607c', 'd1d1d1d1-0000-0000-0000-000000000001', 'pdf');
  /* LE POINT DE SECURITE : les quatre policies du bucket lisent foldername(name)[1]. */
  t('le premier segment est le company_id', c.split('/')[0] === '87875350-40c8-4ee5-be3b-9398fa4106bf');
  t('le second est le dossier_id', c.split('/')[1] === 'a0f395b2-63e8-4ebf-94d4-7dd2a92b607c');
  t('le nom technique est l id du document', c.split('/')[2] === 'd1d1d1d1-0000-0000-0000-000000000001.pdf');
  t('le chemin a exactement trois segments', c.split('/').length === 3);

  /* DEUX FICHIERS DU MEME NOM AFFICHE : David veut qu ils coexistent. C est le cas par
     construction, puisque le chemin ne contient jamais le nom affiche. */
  const un = cheminDocument('c', 'd', 'id-1', 'pdf');
  const deux = cheminDocument('c', 'd', 'id-2', 'pdf');
  t('deux documents nommes Contrat.pdf ont des chemins distincts', un !== deux);
  t('le nom affiche n entre JAMAIS dans le chemin', !cheminDocument('c', 'd', 'id', 'pdf').includes('Contrat'));
  t('une extension vide ne produit pas un chemin finissant par un point',
    !cheminDocument('c', 'd', 'id', '').endsWith('.'));
  t('l extension est mise en minuscules', cheminDocument('c', 'd', 'id', 'PDF').endsWith('.pdf'));

  t('un PDF prend l extension pdf', extensionPourType('application/pdf') === 'pdf');
  t('un JPEG prend jpg', extensionPourType('image/jpeg') === 'jpg');
  t('TEMOIN : un type inconnu prend bin', extensionPourType('application/zip') === 'bin');
}

console.log('\n=== 13. CE QUI S AFFICHE EN MINIATURE ===');
{
  t('un JPEG s affiche', afficheEnMiniature('image/jpeg'));
  t('un PNG s affiche', afficheEnMiniature('image/png'));
  /* Mesure avec temoin : Chromium REFUSE de decoder un HEIC (un PNG minimal se decode,
     un HEIC et un HEIF declenchent onerror). Une miniature HEIC serait une vignette
     cassee et muette. */
  t('TEMOIN : un HEIC ne s affiche PAS en miniature', !afficheEnMiniature('image/heic'));
  t('TEMOIN : un HEIF non plus', !afficheEnMiniature('image/heif'));
  t('TEMOIN : un PDF non plus', !afficheEnMiniature('application/pdf'));
  t('TEMOIN : un DOCX non plus',
    !afficheEnMiniature('application/vnd.openxmlformats-officedocument.wordprocessingml.document'));
}

console.log('\n=== 14. LES OCTETS DOIVENT CONFIRMER LE TYPE ANNONCE ===');
{
  /** Fabrique un tampon a partir d'octets et de textes melanges. */
  const oct = (...morceaux: (number | string)[]): Uint8Array => {
    const o: number[] = [];
    for (const m of morceaux) {
      if (typeof m === 'number') o.push(m);
      else for (const c of m) o.push(c.charCodeAt(0));
    }
    return new Uint8Array(o);
  };
  const vide = new Uint8Array(0);
  /** Un ZIP minimal dont on choisit les noms d'entrees. */
  const zip = (...noms: string[]) => oct(0x50, 0x4B, 0x03, 0x04, ...noms.flatMap(n => [n]));

  const PDF = oct('%PDF-1.7\n%\xe2\xe3\xcf\xd3\n');
  const JPEG = oct(0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 'JFIF');
  const PNG = oct(0x89, 'PNG', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0x0D);
  const WEBP = oct('RIFF', 0x24, 0, 0, 0, 'WEBP', 'VP8 ');
  const HEIC = oct(0, 0, 0, 0x18, 'ftyp', 'heic', 0, 0, 0, 0, 'heic', 'mif1');
  const DOCX = zip('[Content_Types].xml', 'word/document.xml');
  const DOC = oct(0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1);
  const RTF = oct('{\\rtf1\\ansi');
  /* Les faux : un executable Windows, une page HTML, une archive quelconque. */
  const EXE = oct('MZ', 0x90, 0, 0x03, 0, 0, 0);
  const HTML = oct('<!DOCTYPE html>\n<html><body>');
  const XLSX = zip('[Content_Types].xml', 'xl/workbook.xml');
  const ZIP_NU = zip('photos/vacances.jpg');

  const DOCX_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  /* --- les vrais passent --- */
  t('un vrai PDF passe', problemeDeSignature('application/pdf', PDF, vide) === '');
  t('un vrai JPEG passe', problemeDeSignature('image/jpeg', JPEG, vide) === '');
  t('un vrai PNG passe', problemeDeSignature('image/png', PNG, vide) === '');
  t('un vrai WEBP passe', problemeDeSignature('image/webp', WEBP, vide) === '');
  t('un vrai HEIC passe', problemeDeSignature('image/heic', HEIC, vide) === '');
  t('un vrai DOCX passe', problemeDeSignature(DOCX_TYPE, DOCX, vide) === '');
  t('un vrai DOC (OLE2) passe', problemeDeSignature('application/msword', DOC, vide) === '');
  /* Word enregistre aussi du RTF sous l'extension .doc, et il sait le relire. */
  t('un .doc qui est en realite du RTF passe', problemeDeSignature('application/msword', RTF, vide) === '');

  /* --- LE POINT QUE DAVID REFUSAIT DE LAISSER PASSER --- */
  const refusExe = problemeDeSignature('application/pdf', EXE, vide);
  t('un .exe renomme .pdf est REFUSE', refusExe !== '');
  t('et le message dit que le fichier a ete renomme', /renomm/i.test(refusExe));
  t('et il nomme le type attendu', /PDF/.test(refusExe));
  t('une page HTML renommee .pdf est refusee', problemeDeSignature('application/pdf', HTML, vide) !== '');
  t('un JPEG renomme .png est refuse', problemeDeSignature('image/png', JPEG, vide) !== '');
  t('un PNG renomme .jpg est refuse', problemeDeSignature('image/jpeg', PNG, vide) !== '');
  t('un PDF renomme .heic est refuse', problemeDeSignature('image/heic', PDF, vide) !== '');
  t('un .exe renomme .doc est refuse', problemeDeSignature('application/msword', EXE, vide) !== '');

  /* --- LE CAS SUBTIL : un ZIP qui n'est pas un DOCX --- */
  t('un XLSX renomme .docx est REFUSE (c est un ZIP, mais sans word/)',
    problemeDeSignature(DOCX_TYPE, XLSX, vide) !== '');

  /*
   * MEME PIEGE POUR LE WEBP, et il a fallu une mutation pour le voir.
   *
   * RIFF est un conteneur generique : un WAV, un AVI et un WEBP commencent tous par
   * RIFF. C'est la marque a l'offset 8 qui distingue. Sans ce temoin, retirer le controle
   * de cette marque ne cassait aucune assertion.
   */
  const WAV = oct('RIFF', 0x24, 0, 0, 0, 'WAVE', 'fmt ');
  const AVI = oct('RIFF', 0x24, 0, 0, 0, 'AVI ', 'LIST');
  t('un WAV renomme .webp est REFUSE (RIFF, mais pas WEBP)',
    problemeDeSignature('image/webp', WAV, vide) !== '');
  t('un AVI renomme .webp est refuse aussi',
    problemeDeSignature('image/webp', AVI, vide) !== '');
  /* Et l inverse : la marque WEBP sans le conteneur RIFF n est pas un WEBP valide.
     Sans ce temoin, retirer le controle de RIFF ne cassait rien. */
  const FAUX_WEBP = oct('XXXX', 0x24, 0, 0, 0, 'WEBP');
  t('TEMOIN : la marque WEBP sans conteneur RIFF est refusee',
    problemeDeSignature('image/webp', FAUX_WEBP, vide) !== '');
  t('une archive ZIP quelconque renommee .docx est refusee',
    problemeDeSignature(DOCX_TYPE, ZIP_NU, vide) !== '');
  t('un .exe renomme .docx est refuse', problemeDeSignature(DOCX_TYPE, EXE, vide) !== '');

  /* --- la tolerance voulue, et seulement elle --- */
  /* Les lecteurs de PDF acceptent du rebut avant %PDF-, et des fichiers reels en portent.
     Refuser un PDF que tout le monde ouvre serait un defaut, pas une rigueur. */
  const pdfDecale = oct('\n\n\n   ', '%PDF-1.4\n');
  t('un PDF avec un peu de rebut avant %PDF- passe', problemeDeSignature('application/pdf', pdfDecale, vide) === '');
  /* Mais pas au-dela de 1024 octets : la tolerance est bornee. */
  const pdfTresLoin = oct(...Array.from({ length: 1100 }, () => 0x20), '%PDF-1.4');
  t('TEMOIN : au-dela de 1024 octets de rebut, il est refuse',
    problemeDeSignature('application/pdf', pdfTresLoin, vide) !== '');

  /* --- un DOCX dont le mot-cle n'est que dans le CATALOGUE, a la fin --- */
  /* C'est le cas reel : les noms d'entrees figurent a la fin du ZIP, dans le catalogue
     central. Un gros DOCX peut n'avoir que `[Content_Types].xml` dans ses 4 premiers Ko. */
  const docxTeteSeule = zip('[Content_Types].xml');
  const docxQueue = oct('PK\x01\x02', 'word/document.xml', 'PK\x05\x06');
  t('un DOCX reconnu seulement par son catalogue de fin passe',
    problemeDeSignature(DOCX_TYPE, docxTeteSeule, docxQueue) === '');
  t('TEMOIN : le meme ZIP sans word/ nulle part est refuse',
    problemeDeSignature(DOCX_TYPE, docxTeteSeule, oct('PK\x01\x02', 'xl/workbook.xml')) !== '');

  /* --- les bornes --- */
  t('un fichier vide est refuse pour tous les types verifiables',
    ['application/pdf', 'image/jpeg', 'image/png', 'image/heic', DOCX_TYPE, 'application/msword']
      .every(ty => problemeDeSignature(ty, vide, vide) !== ''));
  t('un fichier tronque a 2 octets est refuse',
    problemeDeSignature('application/pdf', oct(0x25, 0x50), vide) !== '');
  /* Un type hors liste a deja ete refuse par problemeDeFichier : ne rien dire ici evite
     de refuser deux fois pour la meme raison. */
  t('TEMOIN : un type inconnu ne declenche pas un second refus',
    problemeDeSignature('application/zip', EXE, vide) === '');

  /* --- ce qui est verifiable, et ce qui ne l'est pas --- */
  for (const ty of ['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/heif',
                    'image/webp', 'application/msword', DOCX_TYPE]) {
    t(`${ty.split('/').pop()?.slice(0, 18)} est annonce comme verifiable`, signatureVerifiable(ty));
  }
  t('TEMOIN : un type hors liste n est pas annonce comme verifiable', !signatureVerifiable('application/zip'));

  /*
   * LES DEUX TAILLES DE LECTURE, et pourquoi elles sont epinglees ICI.
   *
   * Elles ne gouvernent pas la logique de cette fonction — qui recoit deja des tampons —
   * mais la LECTURE du fichier par le hook. Une mutation les ramenant a zero survivait
   * donc a tout ce qui precede : la fonction aurait recu des tampons vides et refuse
   * TOUS les fichiers, y compris les bons. Le seuil est donc borne par le bas.
   */
  t('la tete lue couvre la tolerance de 1024 octets du PDF', OCTETS_DEBUT >= 1024);
  t('et laisse de la place pour les noms d entrees d un ZIP', OCTETS_DEBUT >= 4096);
  t('la queue lue couvre un catalogue ZIP realiste', OCTETS_FIN >= 16384);

  /* LA LIMITE, FIGEE ICI POUR QU ELLE NE SE PERDE PAS : la signature OLE2 est commune
     a .doc, .xls et .ppt. Un classeur Excel renomme .doc passe donc ce controle. */
  const XLS = oct(0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1, 0, 0, 0, 0, 'Workbook');
  t('LIMITE CONNUE : un .xls renomme .doc passe (signature OLE2 commune)',
    problemeDeSignature('application/msword', XLS, vide) === '');

  console.log('\n=== 15. CE SONT LES OCTETS QUI DISENT LE TYPE ===');
  /*
   * LE CAS QUI IMPOSE typeDesOctets, et il vient d'un vrai comportement d'iOS.
   *
   * Un iPhone peut livrer un JPEG en gardant le nom `IMG_0042.HEIC`, avec un file.type
   * VIDE. Deduire le type de l'extension donnerait << HEIC >>, les octets diraient
   * << JPEG >>, et le fichier serait REFUSE — un faux refus, qui fait perdre un document
   * parfaitement valide. C'est l'inverse exact de ce qu'on cherche.
   */
  t('un JPEG nomme .HEIC est reconnu comme JPEG', typeDesOctets(JPEG, vide) === 'image/jpeg');
  t('et l extension ne le ferait pas', typeDeclare('IMG_0042.HEIC', '') === 'image/heic');
  /* Donc : la chaine doit prendre le type des OCTETS, pas celui du nom. */
  t('les deux ne concordent pas, et c est bien le piege',
    typeDesOctets(JPEG, vide) !== typeDeclare('IMG_0042.HEIC', ''));

  t('un PDF est reconnu', typeDesOctets(PDF, vide) === 'application/pdf');
  t('un PNG est reconnu', typeDesOctets(PNG, vide) === 'image/png');
  t('un WEBP est reconnu', typeDesOctets(WEBP, vide) === 'image/webp');
  t('un HEIC est reconnu', typeDesOctets(HEIC, vide) === 'image/heic');
  t('un DOCX est reconnu', typeDesOctets(DOCX, vide) === DOCX_TYPE);
  t('un DOCX reconnu par son catalogue de fin aussi',
    typeDesOctets(docxTeteSeule, docxQueue) === DOCX_TYPE);
  t('un DOC OLE2 est reconnu', typeDesOctets(DOC, vide) === 'application/msword');
  t('un RTF est reconnu comme .doc', typeDesOctets(RTF, vide) === 'application/msword');

  /* --- ce qui NE doit rien rendre : les octets ne mentent pas a notre place --- */
  t('TEMOIN : un .exe ne rend aucun type', typeDesOctets(EXE, vide) === '');
  t('TEMOIN : du HTML non plus', typeDesOctets(HTML, vide) === '');
  t('TEMOIN : un XLSX non plus (ZIP sans word/)', typeDesOctets(XLSX, vide) === '');
  t('TEMOIN : une archive ZIP quelconque non plus', typeDesOctets(ZIP_NU, vide) === '');
  t('TEMOIN : un WAV non plus', typeDesOctets(WAV, vide) === '');
  t('TEMOIN : un fichier vide non plus', typeDesOctets(vide, vide) === '');
  t('TEMOIN : deux octets non plus', typeDesOctets(oct(0x25, 0x50), vide) === '');

  /* L AVIF doit sortir AVANT le HEIF, sans quoi il serait pris pour du HEIC et converti
     pour rien. Le garde de estHeif s en charge, et ce temoin le prouve ici aussi. */
  const AVIF = oct(0, 0, 0, 0x18, 'ftyp', 'avif', 0, 0, 0, 0, 'mif1');
  t('TEMOIN : un AVIF n est pas annonce comme HEIC', typeDesOctets(AVIF, vide) !== 'image/heic');

  /* Tout type rendu par typeDesOctets DOIT etre un type accepte : rendre un type que la
     suite refuserait serait un piege a retardement. */
  const rendus = [PDF, JPEG, PNG, WEBP, HEIC, DOCX, DOC, RTF].map(o => typeDesOctets(o, vide));
  t('tout type rendu figure dans la liste des types acceptes',
    rendus.every(ty => ty !== '' && TYPES_ACCEPTES[ty] !== undefined));
  t('et chacun est verifiable par signature', rendus.every(ty => signatureVerifiable(ty)));
}

console.log(`\n=== RESULTAT : ${ok} OK, ${ko} ECHEC ===\n`);
process.exit(ko === 0 ? 0 : 1);
