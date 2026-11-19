// Releves : lecture CSV sans perte, en-tetes, forme canonique (miroir de la base), liens surs.
// Logique pure, aucun reseau, aucun DOM.
//   node --import tsx --test scripts/crm-leads/lectureEtEntetes.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lireCsv, detecterSeparateur, nettoyerCellule } from '../../src/lib/csvLecture.ts';
import { lireExcelBrut } from '../../src/lib/excelImport.ts';
import { utils, write } from 'xlsx';
import {
  cleCanonique, dedoublonnerEntetes, entetesPourImport, estCleReservee, detecterType,
  correspondancesSysteme, sansAccents, estEnteteEntreprise,
} from '../../src/lib/entetesImport.ts';
import { lienSur } from '../../src/lib/lienSur.ts';
import { normalizePhone } from '../../src/lib/phoneNormalizer.ts';
import { processRows } from '../../src/lib/csvImportPipeline.ts';
import { LONGUEUR_ENTETE_MAX } from '../../src/lib/entetesImport.ts';

const NBSP = String.fromCharCode(0xa0);
const NNBSP = String.fromCharCode(0x202f);
const APOS = String.fromCharCode(0x2019);
const BOM = String.fromCharCode(0xfeff);
const ACCENT_AIGU = String.fromCharCode(0x301);

test('L1 une cellule sur plusieurs lignes reste UNE cellule, et les colonnes ne glissent pas', () => {
  const csv = 'Entreprise;Avis;Ville\r\n"Encre Fictive";"Tres bon accueil.\r\nJe recommande ; vraiment";Rennes\r\nAutre;court;Brest\r\n';
  const r = lireCsv(csv);
  assert.equal(r.separateur, ';');
  assert.deepEqual(r.entetes, ['Entreprise', 'Avis', 'Ville']);
  assert.equal(r.enregistrements.length, 2);
  assert.deepEqual(r.enregistrements[0].cellules, ['Encre Fictive', 'Tres bon accueil.\nJe recommande ; vraiment', 'Rennes']);
  assert.deepEqual(r.enregistrements[1].cellules, ['Autre', 'court', 'Brest']);
  /* Le numero de ligne est celui du FICHIER : la 2e donnee commence ligne 4, pas 3. */
  assert.equal(r.enregistrements[0].ligne, 2);
  assert.equal(r.enregistrements[1].ligne, 4);
  assert.equal(r.avertissements.length, 0);
  assert.equal(r.guillemetNonFerme, false);
});

test('L2 guillemets doubles, separateur dans une cellule, BOM, lignes vides', () => {
  const csv = BOM + 'Nom,Note\n"Le ""Studio""",4.9\n\n"A, B",5\n';
  const r = lireCsv(csv);
  assert.deepEqual(r.entetes, ['Nom', 'Note'], 'le BOM ne doit pas coller au premier en-tete');
  assert.deepEqual(r.enregistrements.map(e => e.cellules), [['Le "Studio"', '4.9'], ['A, B', '5']]);
});

test('L3 les quatre separateurs, comptes HORS guillemets', () => {
  assert.equal(detecterSeparateur('a;b;c\n1;2;3'), ';');
  assert.equal(detecterSeparateur('a\tb\tc\n'), '\t');
  assert.equal(detecterSeparateur('a|b|c\n'), '|');
  assert.equal(detecterSeparateur('"x;y;z",b\n'), ',', 'les ; entre guillemets ne comptent pas');
  assert.equal(lireCsv('a|b\n1|2').enregistrements[0].cellules[1], '2');
});

test('L4 un nombre de cellules different est SIGNALE, pas corrige en silence', () => {
  const r = lireCsv('a;b;c\n1;2\n1;2;3;;\n1;2;3;4\n');
  assert.deepEqual(r.avertissements.map(a => [a.ligne, a.trouve]), [[2, 2], [4, 4]],
    'des cellules VIDES en trop (export Excel) ne sont pas un defaut, une valeur en trop l est');
});

test('L5 un guillemet jamais referme est signale, avec la ligne ou il s ouvre', () => {
  const r = lireCsv('a;b\n1;2\n3;4\n"ouvert;2\n5;6\n');
  assert.equal(r.guillemetNonFerme, true);
  assert.equal(r.ligneGuillemetOuvert, 4);
  assert.equal(lireCsv('a;b\n"x\ny";2\n').ligneGuillemetOuvert, null, 'une cellule multiligne refermee n est pas une erreur');
});

test('L5b un guillemet referme trop loin (« "abc"de ») est signale avec sa ligne d ouverture', () => {
  const r = lireCsv('a;b\n1;2\n"ouvert par erreur;3\n4;5\n"fin"bizarre;6\n');
  assert.equal(r.ligneGuillemetSuspect, 3);
  assert.equal(lireCsv('a;b\n"Le ""Studio""";2\n"x\ny";3\n').ligneGuillemetSuspect, null, 'des guillemets corrects ne sont pas suspects');
});

test('L5c une cellule que la base refuserait est nettoyee (NUL, demi-paire), une paire valide est gardee', () => {
  const NUL = String.fromCharCode(0);
  const DEMI = String.fromCharCode(0xd83d);
  const EMOJI = String.fromCodePoint(0x1f600);
  assert.equal(nettoyerCellule('a' + NUL + 'b'), 'ab');
  assert.equal(nettoyerCellule('x' + DEMI), 'x' + String.fromCharCode(0xfffd));
  assert.equal(nettoyerCellule('ok ' + EMOJI), 'ok ' + EMOJI);
  assert.equal(lireCsv('a;b\n1' + NUL + ';2\n').enregistrements[0].cellules[0], '1');
});

test('L5d Excel : ce qu Excel affiche, sauf les nombres Standard (entiers) et les dates (jour/mois/annee)', async () => {
  /* Cellules construites a la main : numero de serie 46331 au format date 14 (le 5/11/2026),
     telephone au format a zero de tete, grand nombre au format Standard, decimal. */
  const feuille = {
    '!ref': 'A1:D2',
    A1: { t: 's', v: 'Numero' }, B1: { t: 's', v: 'Date' }, C1: { t: 's', v: 'Tel' }, D1: { t: 's', v: 'Note' },
    A2: { t: 'n', v: 12345678901234 },
    B2: { t: 'n', v: 46331, z: 'm/d/yy' },
    C2: { t: 'n', v: 612345678, z: '0#########' },
    D2: { t: 'n', v: 4.9 },
  };
  const classeur = utils.book_new();
  utils.book_append_sheet(classeur, feuille, 'F');
  const octets = write(classeur, { type: 'array', bookType: 'xlsx' });
  const r = await lireExcelBrut(new File([octets], 't.xlsx'));
  assert.deepEqual(r.entetes, ['Numero', 'Date', 'Tel', 'Note']);
  assert.equal(r.lignes[0].cellules[0], '12345678901234', 'jamais « 1.23457E+13 »');
  assert.equal(r.lignes[0].cellules[1], '05/11/2026', 'jour/mois/annee, sans glisser d un jour');
  assert.equal(r.lignes[0].cellules[2], '0612345678', 'le zero de tete affiche est garde');
  assert.equal(r.lignes[0].cellules[3], '4.9');
});

test('L6 en-tetes : doublons numerotes, vides nommes, rien d ecrase', () => {
  assert.deepEqual(dedoublonnerEntetes(['Téléphone', 'Ville', 'téléphone', '', 'Téléphone']),
    ['Téléphone', 'Ville', 'téléphone (2)', 'Colonne 4', 'Téléphone (3)']);
  assert.deepEqual(dedoublonnerEntetes(['  Site   web ']), ['Site web']);
  /* Une colonne Commentaires du fichier ne peut pas ecraser le FIL des commentaires du lead. */
  assert.deepEqual(entetesPourImport(['Nom', 'Commentaires', 'commentaire']), ['Nom', 'Commentaires (fichier)', 'commentaire (fichier)']);
});

test('L6b un en-tete trop long est raccourci SANS perdre la colonne ni creer de doublon', () => {
  const long = 'Q'.repeat(230);
  const e = entetesPourImport([long, long + ' bis', 'Ville']);
  assert.equal(e.length, 3);
  assert.ok(e.every(h => h.length <= 200), 'la base refuse au-dela de 200');
  assert.equal(e[0].length, LONGUEUR_ENTETE_MAX);
  assert.notEqual(cleCanonique(e[0]), cleCanonique(e[1]), 'deux en-tetes coupes au meme prefixe restent distincts');
  /* Coupe par caracteres : un emoji a la limite ne laisse pas de demi-paire. */
  const avecEmoji = entetesPourImport(['Q'.repeat(189) + String.fromCodePoint(0x1f600) + 'suite'])[0];
  assert.ok(!/[\uD800-\uDBFF]$/.test(avecEmoji), 'aucune demi-paire en fin d en-tete');
  assert.equal(Array.from(avecEmoji).length, LONGUEUR_ENTETE_MAX);
});

test('L6c un email mal ecrit ne fait plus perdre un lead qui a un telephone', () => {
  const m = { email: 'Email', telephone: 'Tel' };
  const [a, b2, c] = processRows([
    { Email: 'pas-un-email', Tel: '06 00 00 00 01' },
    { Email: 'pas-un-email', Tel: '' },
    { Email: 'ok@exemple.fr', Tel: '' },
  ], m);
  assert.equal(a.status, 'valid');
  assert.equal(a.email, null);
  assert.equal(a.raw.Email, 'pas-un-email', 'la saisie du fichier est conservee');
  assert.equal(b2.status, 'error', 'sans autre moyen de contact, la ligne reste refusee');
  assert.equal(c.status, 'valid');
});

test('L7 forme canonique : memes resultats que public.lead_cle_canonique (rejeu du 19/11)', () => {
  /* Vecteurs passes en base le 19/11/2026 (rejeu annule, role postgres) :
     ["catégorie","site web","dans l'étape","code postal",null,null,true]. */
  assert.equal(cleCanonique('Catégorie'), 'catégorie', 'les accents sont CONSERVES');
  assert.equal(cleCanonique('  Site   Web '), 'site web');
  assert.equal(cleCanonique('Dans l' + APOS + 'étape'), "dans l'étape");
  assert.equal(cleCanonique('Code' + NBSP + 'postal'), 'code postal');
  assert.equal(cleCanonique('Code' + NNBSP + 'postal'), 'code postal');
  assert.equal(cleCanonique('   '), null);
  assert.equal(cleCanonique(null), null);
  assert.equal(cleCanonique('E' + ACCENT_AIGU + 'tape'), cleCanonique('Étape'), 'NFD et NFC donnent la meme cle');
  assert.notEqual(cleCanonique('Categorie'), cleCanonique('Catégorie'), 'pas de rapprochement silencieux par les accents');
  assert.equal(sansAccents(cleCanonique('Catégorie') as string), cleCanonique('Categorie'), 'mais une PROPOSITION est possible');
});

test('L8 cles reservees : meme liste que public.lead_cle_reservee', () => {
  for (const k of ['MotDePasse', ' motdepasse ', 'mot_de_passe_demo', 'Commentaires', 'commentaire', 'AuthId', 'auth_id', 'CSV · AuthId', '', '  ']) {
    assert.equal(estCleReservee(k), true, k);
  }
  for (const k of ['Mot de passe client', 'Commentaires (fichier)', 'Nom', 'Entreprise']) assert.equal(estCleReservee(k), false, k);
});

test('L9 types de colonne : le nom d abord, les valeurs ensuite', () => {
  assert.equal(detecterType('Entreprise', []), 'entreprise');
  assert.equal(detecterType('Site web', ['n/a']), 'lien');
  assert.equal(detecterType('Facebook', []), 'lien');
  assert.equal(detecterType('Lien carte', []), 'lien');
  assert.equal(detecterType('Note', ['4,9', 'n/a']), 'nombre');
  assert.equal(detecterType('Téléphone international', []), 'telephone');
  assert.notEqual(detecterType('Fax', ['0299 00 00 00']), 'telephone', 'un fax n est pas un numero d appel');
  assert.equal(detecterType('Ajouté le', []), 'date');
  assert.equal(detecterType("Dans l'étape depuis le", []), 'date');
  assert.equal(detecterType('Contact', ['a@b.fr', 'c@d.com']), 'email');
  assert.equal(detecterType('Divers', ['www.a.fr', 'b.com/x']), 'lien');
  assert.equal(detecterType('Code', ['35000', '29200']), 'nombre');
  assert.equal(detecterType('Ville', ['Rennes']), 'texte');
  assert.equal(estEnteteEntreprise('Raison sociale'), true);
  assert.equal(estEnteteEntreprise('Société'), true);
});

test('L10 colonnes standard : sans accents ni casse, une seule par cle', () => {
  const m = correspondancesSysteme(['Entreprise', 'Téléphone', 'PRÉNOM', 'Email', 'Téléphone international', 'tel']);
  assert.deepEqual([...m.entries()], [['Téléphone', 'telephone'], ['PRÉNOM', 'prenom'], ['Email', 'email']]);
});

test('L11 liens : http(s) seulement, jamais javascript: ni data:', () => {
  assert.deepEqual(lienSur('https://www.encre-fictive.fr/contact'), { href: 'https://www.encre-fictive.fr/contact', libelle: 'encre-fictive.fr' });
  assert.equal(lienSur('www.exemple.fr')?.href, 'https://www.exemple.fr/');
  assert.equal(lienSur('exemple.fr/page')?.href, 'https://exemple.fr/page');
  assert.equal(lienSur('HTTPS://EXEMPLE.FR')?.libelle, 'exemple.fr');
  assert.equal(lienSur('https://www.instagram.com/encre.fictive/')?.libelle, 'instagram.com/encre.fictive');
  for (const mauvais of ['javascript:alert(1)', 'JavaScript:alert(1)', 'data:text/html,<b>x</b>', 'mailto:a@b.fr',
    'ftp://exemple.fr', 'vbscript:x', 'exemple', 'deux mots.fr', '', 'https://moi:secret@exemple.fr', 'http://localhost']) {
    assert.equal(lienSur(mauvais), null, mauvais);
  }
});

test('L12 telephone : memes resultats que public.lead_tel_canonique (rejeu du 19/11)', () => {
  /* Vecteurs passes en base : ["+33600000001","+33600000001",null,"+33600000001",null,"+33600000001","+33600000001"]. */
  const c = (v: string) => normalizePhone(v).canonical;
  assert.equal(c('06 00 00 00 01'), '+33600000001');
  assert.equal(c('0033 6 00 00 00 01'), '+33600000001');
  assert.equal(c('12'), null);
  assert.equal(c('06.00.00.00.01'), '+33600000001');
  assert.equal(c('+33 (0)6 00'), null);
  assert.equal(c('33600000001'), '+33600000001');
  assert.equal(c('06' + NBSP + '00 00 00 01'), '+33600000001');
  /* « +33 (0)6 » : le zero garde derriere l indicatif est retire (meme regle en base). */
  assert.equal(c('+33 (0)6 00 00 00 01'), '+33600000001');
  assert.equal(c('0033 (0)6 00 00 00 01'), '+33600000001');
});
