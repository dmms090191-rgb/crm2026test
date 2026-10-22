/**
 * Tests du TABLEAU DE BORD CRM IMMO — le cablage, pas le calcul.
 * Lancer :  npx tsx scripts/crm-immo/tableauDeBord.test.ts
 *
 * ---------- CE QUI EST EN JEU ----------
 *
 * Le calcul des sept compteurs est tenu ailleurs, par echeancier.test.ts, qui le fait
 * travailler sur des jeux d'epreuve. Ici on tient les QUATRE promesses faites a David,
 * celles qu'aucun test de calcul ne peut voir :
 *
 *   1. le remplacement est commande par le DROIT, jamais par un nom de Societe ;
 *   2. une Societe sans le module garde EXACTEMENT ses six compteurs d'avant ;
 *   3. il n'existe pas un second calcul quelque part ;
 *   4. l'affichage ne laisse pas croire que deux compteurs sont disjoints quand ils
 *      ne le sont pas.
 *
 * Ce sont des tests de SOURCE : ils lisent les fichiers. C'est volontaire — ces
 * promesses portent sur la facon dont le code est ecrit, et un test de rendu ne les
 * verrait pas.
 */
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

let ko = 0, ok = 0;
const test = (nom: string, fn: () => void) => {
  try { fn(); ok++; console.log('  OK    | ' + nom); }
  catch (e) { ko++; console.log('  ECHEC | ' + nom + '\n          ' + (e as Error).message); }
};

const lire = (p: string) => readFileSync(p, 'utf8');

const GRILLE = lire('src/pages/admin/views/SocieteKpiGrid.tsx');
const VUE = lire('src/pages/admin/views/VueEnsemble.tsx');
const HOOK = lire('src/pages/admin/views/crm-immo/useCrmImmoTableauDeBord.ts');
const DASH = lire('src/pages/admin/AdminDashboard.tsx');
const RENDERER = lire('src/pages/admin/dashboard/AdminViewRenderer.tsx');
const PAGE = lire('src/pages/admin/views/CrmImmo.tsx');
const CONTEXTE = lire('src/contexts/CrmImmoAlertesContext.tsx');
const CLOCHE = lire('src/pages/admin/views/crm-immo/useCrmImmoAlertes.ts');

/*
 * Le CORPS d'une fonction nommee, accolades equilibrees. Sert a ne pas confondre le
 * jeu generique avec le jeu CRM Immo : les deux vivent dans le meme fichier.
 *
 * On ne peut pas prendre la premiere accolade apres le nom : ce serait la
 * DESTRUCTURATION des parametres — `{ values, tokens: t }` — et le corps serait vide.
 * On cherche donc le `) {` qui ferme la liste des parametres.
 */
function corpsDe(src: string, nom: string): string {
  const i = src.indexOf(nom);
  assert.ok(i >= 0, `fonction ${nom} introuvable`);
  const apres = /\)\s*\{/.exec(src.slice(i));
  assert.ok(apres, `liste de parametres introuvable pour ${nom}`);
  const debut = i + apres.index + apres[0].length - 1;
  let profondeur = 0;
  for (let j = debut; j < src.length; j++) {
    if (src[j] === '{') profondeur++;
    else if (src[j] === '}') { profondeur--; if (profondeur === 0) return src.slice(debut, j + 1); }
  }
  throw new Error(`accolades desequilibrees dans ${nom}`);
}

/*
 * LE CODE SEUL, SANS LES COMMENTAIRES.
 *
 * Indispensable pour les assertions << ce motif ne doit PAS apparaitre >>. Les
 * commentaires de ce projet EXPLIQUENT les pieges, donc ils citent le code a ne pas
 * ecrire : le commentaire du hook dit noir sur blanc pourquoi `toISOString().slice`
 * serait faux. Sans ce nettoyage, un test interdisant ce motif tombe sur la prose qui
 * l'interdit — ce qui s'est produit du premier coup.
 */
function sansCommentaires(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

const DOSSIER_MODULE = 'src/pages/admin/views/crm-immo';
const CODE_HOOK = sansCommentaires(HOOK);
const CORPS_GENERIQUE = corpsDe(GRILLE, 'export default function SocieteKpiGrid');
const CORPS_IMMO = corpsDe(GRILLE, 'export function SocieteKpiGridImmo');

console.log('\n=== 1. AUCUNE SOCIETE EN DUR ===');

test("A1 — aucun nom ni identifiant de Societe n'apparait dans le code du tableau de bord", () => {
  /*
   * David, deux fois : << Ne code surtout pas Ruth ou Bellisimmo en dur. >>
   *
   * Une seule Societe possede le module aujourd'hui, et son admin s'appelle Ruth. La
   * tentation d'ecrire `if (companyName === 'Bellisimmo')` est donc tres concrete, et
   * elle marcherait — jusqu'a la deuxieme Societe. Ce test ferme la porte.
   *
   * L'UUID est teste aussi : un identifiant en dur est pire qu'un nom, parce qu'il est
   * illisible et que personne ne le reconnaitra en relecture.
   */
  const interdits = [/ruth/i, /bellisimmo/i, /87875350-40c8-4ee5-be3b-9398fa4106bf/i];
  for (const [nom, src] of Object.entries({ GRILLE, VUE, HOOK, RENDERER, PAGE, CONTEXTE })) {
    for (const motif of interdits) {
      assert.ok(!motif.test(src), `${nom} contient ${motif} : une Societe est codee en dur`);
    }
  }
});

test('A2 — la bascule est commandee par has_crm_immo_access, via le droit deja calcule', () => {
  /*
   * Le droit vient de useCrmImmoAccess -> has_crm_immo_access(company_id), appele UNE
   * fois dans AdminDashboard. `crmImmoOuvert` en est le resultat booleen, et c'est LUI
   * qui decide si le dashboard recoit les compteurs ou null.
   *
   * Mesure du 22 octobre 2026 sous le JWT reel de l'admin Bellisimmo, role
   * `authenticated` : has_crm_immo_access rend `true`. En `postgres` sans JWT elle rend
   * `false`, car elle est portee par l'appelant — ce n'est pas une panne.
   */
  assert.match(DASH, /useCrmImmoTableauDeBord\(crmImmoOuvert\)/,
    'le chargeur partage doit etre arme par le DROIT');
  assert.match(DASH, /useCrmImmoAlertes\([\s\S]{0,120}?tableauImmo\.aujourdhui,[\s\S]{0,60}?tableauImmo\.periodes,/,
    'la cloche doit recevoir le jour ET les periodes du chargeur partage, pas les relire');
  assert.match(DASH, /immoDashboard=\{crmImmoOuvert \?/,
    'le dashboard ne doit recevoir les compteurs que si le droit est accorde');
});

console.log('\n=== 2. LES AUTRES SOCIETES NE BOUGENT PAS ===');

test('B1 — sans le module, la Vue d ensemble rend la grille GENERIQUE', () => {
  /*
   * << Societe sans crm_immo_acces = garde exactement les 6 compteurs actuels. >>
   *
   * La bascule doit etre un ternaire sur `immo`, et la branche `else` doit etre le
   * composant d'origine avec ses six valeurs. On verifie les deux branches, pas
   * seulement la presence du nouveau composant.
   */
  assert.match(VUE, /\{immo \?/, 'la bascule doit tenir en une condition sur `immo`');
  assert.match(VUE, /<SocieteKpiGridImmo/, 'la branche AVEC module doit rendre la grille Immo');
  assert.match(VUE, /<SocieteKpiGrid\b[\s\S]{0,400}?values=\{\{/,
    'la branche SANS module doit rendre la grille generique avec ses `values`');
  assert.match(VUE, /immo = null/, '`immo` doit valoir null par defaut : aucun changement implicite');
});

test('B2 — les six compteurs generiques sont intacts, cles et libelles', () => {
  /*
   * Le fichier a ete reorganise pour partager la coquille des cartes. Une
   * reorganisation est exactement le moment ou un libelle se perd en silence. On fige
   * donc les six, dans l'ordre, avec leur sous-titre.
   */
  const attendus: [string, string, string][] = [
    ['leads', 'Leads actifs', 'Dans votre CRM'],
    ['sans', 'Sans statut', 'À qualifier'],
    ['vendeurs', 'Vendeurs', 'Votre équipe'],
    ['messages', 'Messages', 'Conversations à ouvrir'],
    ['rdv', 'Rendez-vous', 'À traiter'],
    ['attente', 'Inscriptions', 'En attente'],
  ];
  const cles = [...CORPS_GENERIQUE.matchAll(/key: '([^']+)'/g)].map(m => m[1]);
  assert.deepEqual(cles, attendus.map(a => a[0]), 'les six cles generiques ont change');
  for (const [cle, libelle, sous] of attendus) {
    const carte = CORPS_GENERIQUE.match(new RegExp(`key: '${cle}'[^}]*`))?.[0] ?? '';
    assert.ok(carte.includes(`label: '${libelle}'`), `le libelle de ${cle} n'est plus « ${libelle} »`);
    assert.ok(carte.includes(`sublabel: '${sous}'`), `le sous-titre de ${cle} n'est plus « ${sous} »`);
  }
});

test('B3 — le clic « Sans statut » ouvre toujours sa modale', () => {
  /* Le seul compteur generique cliquable. Il doit survivre au partage de la coquille. */
  assert.match(CORPS_GENERIQUE, /key: 'sans'[^}]*onClick: onSansStatutClick/,
    'la carte Sans statut a perdu son clic vers la modale');
  assert.match(VUE, /onSansStatutClick=\{\(\) => setModalOpen\(true\)\}/,
    'la Vue d ensemble ne branche plus la modale Sans statut');
});

console.log('\n=== 3. LES SEPT COMPTEURS, ET RIEN DE PLUS ===');

test('C1 — exactement sept cartes, et leur cle EST celle du calcul', () => {
  /*
   * La cle de la carte, la cle du filtre et la cle du calcul sont LE MEME MOT.
   *
   * C'est ce qui fait qu'un clic ne peut pas atterrir sur la mauvaise liste : il n'y a
   * aucune table de traduction entre les trois, donc rien a desaligner. On compare donc
   * aux cles exportees par le noyau, pas a une liste recopiee ici.
   */
  const noyau = lire('src/lib/crmImmoEcheancier.ts');
  const bloc = noyau.match(/export const CATEGORIES_IMMO[^=]*=\s*\[([\s\S]*?)\]/)?.[1] ?? '';
  const attendues = [...bloc.matchAll(/'([a-z-]+)'/g)].map(m => m[1]);
  assert.equal(attendues.length, 7, 'le calcul ne declare plus sept categories');

  const cles = [...CORPS_IMMO.matchAll(/key: '([^']+)'/g)].map(m => m[1]);
  assert.deepEqual(cles, attendues,
    'les cles des cartes ne sont plus celles du calcul, dans le meme ordre');
});

test('C2 — les sept champs de CompteursImmo sont tous affiches, aucun oublie', () => {
  /*
   * Un champ ajoute au calcul et oublie a l'affichage ne casse aucun type : la carte
   * manque, simplement. On compare donc les deux listes.
   */
  const noyau = lire('src/lib/crmImmoEcheancier.ts');
  const bloc = noyau.match(/export interface CompteursImmo \{([\s\S]*?)\}/)?.[1] ?? '';
  const champs = [...bloc.matchAll(/(\w+):\s*number/g)].map(m => m[1]).sort();
  const affiches = [...CORPS_IMMO.matchAll(/v\(c\.(\w+)\)/g)].map(m => m[1]).sort();
  assert.deepEqual(affiches, champs,
    `affiches : ${affiches.join(',')} || attendus : ${champs.join(',')}`);
});

test('C3 — pendant le chargement, un tiret et non des zeros', () => {
  /*
   * compterTableauDeBord rend sept zeros quand il n'a rien a compter. Les montrer
   * pendant la premiere requete dirait << aucun loyer en retard >> a une Societe qui en
   * a trois — un mensonge qui dure le temps du reseau.
   */
  assert.match(CORPS_IMMO, /const v = \(n: number\) => \(chargement \? null : n\)/,
    'les valeurs doivent passer par un tiret pendant le chargement');
  assert.match(GRILLE, /k\.value === null \? '—' : k\.value/,
    'la carte doit rendre un tiret pour une valeur nulle');
  assert.match(VUE, /chargement=\{immo\.chargement\}/,
    'la Vue d ensemble doit transmettre l etat de chargement');
});

console.log('\n=== 4. L HONNETETE DE L AFFICHAGE ===');

test('D1 — les deux cartes de bail actif annoncent leur borne, et non un recouvrement', () => {
  /*
   * CE TEST A ETE RETOURNE LE 22 OCTOBRE 2026.
   *
   * Il exigeait l'inverse : que la carte << Contrats a renouveler >> dise << deja
   * comptes en cours >>, parce que les deux categories se recouvraient. David a tranche
   * le soir meme : << Je veux une partition stricte. Un contrat ne doit apparaitre que
   * dans UNE seule de ces quatre categories. >>
   *
   * La phrase est donc devenue un mensonge, et ce test la lui interdit desormais.
   *
   * Ce qu'il faut a la place : chacune des deux cartes de bail ACTIF doit dire sa
   * borne. Sans cela, << Dossiers en cours >> est lu comme un total, et l'utilisateur
   * se demande pourquoi il n'y retrouve pas un bail qui se termine dans vingt jours.
   */
  const renouveler = CORPS_IMMO.match(/key: 'contrats-a-renouveler'[^}]*/)?.[0] ?? '';
  const enCours = CORPS_IMMO.match(/key: 'dossiers-en-cours'[^}]*/)?.[0] ?? '';

  assert.ok(!/déjà comptés en cours/.test(CORPS_IMMO),
    'une carte affirme encore le recouvrement, qui n existe plus');
  assert.ok(/sublabel: '[^']*sous 30 jours[^']*'/.test(renouveler),
    '« Contrats a renouveler » doit annoncer sa borne de 30 jours');
  assert.ok(/sublabel: '[^']*au-delà de 30 jours[^']*'/.test(enCours),
    '« Dossiers en cours » doit dire qu il EXCLUT les fins sous 30 jours');
});

test('D1 bis — le calcul lui-meme est une chaine, pas quatre tests independants', () => {
  /*
   * La partition ne tient pas parce qu'on y fait attention : elle tient parce que la
   * structure l'impose. Un `if / else if / else if / else` fait sortir la periode a la
   * premiere branche vraie ; quatre `if` separes la compteraient plusieurs fois.
   *
   * echeancier.test.ts mesure le resultat sur un jeu d'epreuve ; ici on fige la FORME,
   * parce qu'un jeu d'epreuve ne couvre jamais toutes les combinaisons de bornes.
   */
  const noyau = lire('src/lib/crmImmoEcheancier.ts');
  /* Du premier test de la chaine jusqu'a la fermeture de sa derniere branche. */
  const bloc = noyau.match(
    /if \(p\.fin < aujourdhui\) \{[\s\S]*?dossiers\['dossiers-en-cours'\]\.add\(p\.dossier_id\);\s*\n\s*\}/,
  )?.[0] ?? '';
  assert.ok(bloc !== '', 'la chaine des quatre categories est introuvable');
  assert.equal((bloc.match(/\belse if \(/g) ?? []).length, 2,
    'les quatre categories doivent etre une chaine if / else if / else if / else');
  assert.equal((bloc.match(/(^|\n)\s*if \(/g) ?? []).length, 1,
    'un second `if` independant a ete ajoute : le recouvrement est revenu');
  assert.ok(/\} else \{\s*\n\s*c\.dossiersEnCours\+\+;/.test(bloc),
    '« Dossiers en cours » doit etre la branche par elimination, la derniere');
  /* Et les quatre compteurs sont bien tous dans CETTE chaine, aucun ailleurs. */
  for (const champ of ['bauxExpires', 'bauxAVenir', 'contratsARenouveler', 'dossiersEnCours']) {
    assert.equal((noyau.match(new RegExp(`c\\.${champ}\\+\\+`, 'g')) ?? []).length, 1,
      `${champ} est incremente a plus d un endroit : la partition ne tient plus`);
    assert.ok(bloc.includes(`c.${champ}++`), `${champ} n est pas dans la chaine`);
  }
});

test('D2 — « Encaisses ce mois » annonce l argent recu, pas les echeances du mois', () => {
  /*
   * David : << Je veux compter tous les encaissements reellement recus pendant le mois
   * courant. Donc on se base sur encaisse_le, pas sur le mois de l'echeance. >>
   *
   * Le chiffre est donc une vue de CAISSE. Le sous-titre doit l'annoncer, sinon un
   * loyer de janvier regle en octobre ressemble a une erreur de comptage.
   */
  const carte = CORPS_IMMO.match(/key: 'encaisses-ce-mois'[^}]*/)?.[0] ?? '';
  assert.ok(/sublabel: '[^']*toute échéance[^']*'/.test(carte),
    'le sous-titre doit dire que toute echeance compte, pourvu que l argent soit rentre ce mois');
});

test('D3 — l ecart d unite entre la carte et la liste est dit a voix haute', () => {
  /*
   * Neuf loyers en retard peuvent n'appartenir qu'a UN dossier : la carte affiche 9, la
   * liste montre 1 ligne. Les deux disent vrai — le compteur compte des echeances, la
   * liste des dossiers — mais sans explication l'utilisateur lit un bug.
   *
   * La barre de filtres affiche donc les deux nombres, et uniquement pour les trois
   * categories ou l'unite differe. Pour les quatre categories de contrat, l'index
   * partiel unique de la base garantit l'egalite, donc il n'y a rien a dire.
   */
  const barre = lire('src/pages/admin/views/crm-immo/CrmImmoFilters.tsx');
  assert.match(barre, /CATEGORIES_EN_ECHEANCES = new Set<string>\(\[\s*\n?\s*'loyers-en-retard', 'loyers-a-encaisser', 'encaisses-ce-mois',/,
    'les trois categories comptees en echeances doivent etre nommees');
  assert.match(barre, /compteurCategorie !== affiches/,
    'les deux nombres ne doivent s afficher que lorsqu ils different');
  assert.match(barre, /data-testid="crm-immo-ecart-unite"/,
    'l ecart doit etre rendu, et reperable');
  assert.match(PAGE, /compteurCategorie=\{compteurCategorie\}/,
    'la page doit transmettre le compteur de la carte a la barre');
});

console.log('\n=== 5. AUCUN SECOND CALCUL, AUCUNE SECONDE HORLOGE ===');

test('E1 — le hook ne compte rien lui-meme : tout passe par classerTableauDeBord', () => {
  /*
   * David : << Meme source de verite que CRM Immo et l'echeancier, pas de deuxieme
   * logique parallele. >> classerTableauDeBord passe elle-meme par construireEcheancier
   * et statutDe — les memes fonctions que l'onglet Echeancier loyers et que la
   * numerotation des notifications.
   *
   * Le hook ne doit donc contenir AUCUNE arithmetique de date ni aucun comptage.
   *
   * Et il delegue le CLASSEMENT, pas seulement le comptage : les compteurs des cartes
   * et les ensembles qui alimentent les filtres sortent du meme parcours, donc une
   * carte ne peut pas annoncer un chiffre que sa liste contredirait.
   */
  assert.match(HOOK, /classerTableauDeBord\(\{ periodes, encaissements, aujourdhui \}\)/,
    'le hook doit deleguer le classement a classerTableauDeBord');
  assert.match(HOOK, /dossiersParCategorie: classement\.dossiers/,
    'le hook doit rendre les ensembles de dossiers, sinon la page refera le calcul');
  assert.ok(!/getMonth|getFullYear|setDate|setMonth|\+ 1 \* 86|86_400_000/.test(CODE_HOOK),
    'le hook fait de l arithmetique de date : c est un second calcul');
  assert.ok(!/\.filter\([^)]*(?:retard|echeance >|echeance <)/.test(CODE_HOOK),
    'le hook trie des echeances lui-meme : c est un second calcul');
});

test('E2 — une seule horloge dans toute l application, et elle vit ici', () => {
  /*
   * LE SENS DE CETTE GARDE A CHANGE LE 22 OCTOBRE 2026, SA RAISON NON.
   *
   * Deux horloges, c'est le 1er du mois ou la cloche et le dashboard ne sont pas
   * d'accord sur le mois courant — et personne ne sait lequel croire.
   *
   * L'horloge etait dans le hook des alertes, qui la pretait a celui-ci. La regle des
   * impayes anciens a inverse la dependance : ce hook charge desormais les PERIODES, et
   * la cloche les recoit — elle ne peut donc plus fournir la date sans creer un cycle.
   * L'horloge a suivi les donnees.
   *
   * Ce qui compte reste : il n'y en a qu'UNE, et la cloche ne s'en refabrique pas.
   */
  assert.match(HOOK, /export function useCrmImmoTableauDeBord\(actif: boolean\)/,
    'le chargeur partage ne doit plus recevoir le jour : il le porte');
  assert.match(HOOK, /const \[aujourdhui, setAujourdhui\] = useState\(\(\) => journeeDeReference/,
    'le jour de reference doit etre un etat de ce hook');
  assert.match(HOOK, /setInterval\(\(\) => setAujourdhui\(journeeDeReference\(new Date\(\), fuseau\)\), RYTHME_DERIVATION\)/,
    'le jour doit avancer tout seul, sans aucune requete');

  const cloche = sansCommentaires(lire(DOSSIER_MODULE + '/useCrmImmoAlertes.ts'));
  assert.ok(!/journeeDeReference\(new Date\(\)/.test(cloche),
    'la cloche s est refabrique une horloge : elle divergera du tableau de bord');
  assert.ok(!/setAujourdhui/.test(cloche),
    'la cloche fait avancer sa propre date : une seconde horloge');
  assert.match(cloche, /aujourdhui: string,/,
    'la cloche doit RECEVOIR le jour');
});

test('E3 — encaisse_le est ramene au jour du poste, jamais a l UTC', () => {
  /*
   * encaisse_le est un timestamptz. Un encaissement enregistre le 1er novembre a
   * 00 h 30 a Paris est bien de novembre ; `toISOString().slice(0,10)` le rangerait en
   * octobre, et le compteur se tromperait de mois une nuit par mois.
   */
  assert.match(HOOK, /encaisseLeJour: journeeDeReference\(new Date\(r\.encaisse_le\), fuseau\)/,
    'encaisse_le doit passer par journeeDeReference');
  assert.ok(!/toISOString\(\)\.slice/.test(CODE_HOOK),
    'un toISOString().slice(0,10) ferait basculer de mois les encaissements de nuit');
});

console.log('\n=== 6. LA SOURCE LUE EST LA BONNE ===');

test('F1 — le hook lit crm_immo_contrats, et uniquement les periodes NON cloturees', () => {
  /*
   * POURQUOI LES CONTRATS ET NON LES TROIS COLONNES DU DOSSIER.
   *
   * Mesure du 22 octobre 2026, en faisant travailler les declencheurs puis en annulant
   * la transaction :
   *   A) un dossier complet cree bien UNE periode, aux memes dates ;
   *   B) modifier la periode fait suivre le dossier ;
   *   C) modifier le dossier fait suivre la periode ;
   *   D) VIDER date_fin_contrat laisse la periode INTACTE.
   *
   * Apres D, le dossier dit << pas de date de fin >> pendant que crm_immo_contrats
   * tient toujours 2026-03-10..2027-03-09. Les deux sources divergent, et c'est la
   * table des contrats que David a designee : << crm_immo_contrats doit contenir TOUTES
   * les periodes. >>
   *
   * ---------- ET DESORMAIS, TOUTES LES PERIODES ----------
   *
   * Le filtre `cloture_le is null` a ete RETIRE de la requete le soir du 22 octobre.
   * David : << Une echeance reelle comprise dans un ancien contrat et toujours non
   * encaissee doit continuer a apparaitre. Le renouvellement ne doit jamais faire
   * disparaitre une dette reelle. >>
   *
   * Le tri ne se fait donc plus a la lecture mais au CLASSEMENT, sur le drapeau
   * `cloturee` : les quatre categories de contrat ignorent les periodes cloturees, les
   * trois categories de loyer les prennent toutes. Les ecarter ici les perdrait pour
   * les deux.
   */
  const tables = [...HOOK.matchAll(/\.from\('([^']+)'\)/g)].map(m => m[1]);
  assert.deepEqual([...new Set(tables)].sort(), ['crm_immo_contrats', 'crm_immo_loyers'],
    `le hook interroge ${tables.join(', ')}`);
  assert.ok(!/from\('crm_immo_contrats'\)[\s\S]{0,300}?\.is\('cloture_le', null\)/.test(HOOK),
    'le hook ecarte encore les periodes cloturees : les dettes anciennes disparaitraient');
  assert.match(HOOK, /cloturee: r\.cloture_le !== null/,
    'le hook doit porter le drapeau `cloturee` jusqu au calcul');
  assert.match(HOOK, /from\('crm_immo_loyers'\)[\s\S]{0,300}?\.is\('annule_le', null\)/,
    'un encaissement annule serait compte comme encaisse');

  /*
   * ET LES DEUX LECTURES SONT PAGINEES.
   *
   * PostgREST tronque au-dela de son plafond sans erreur : la reponse est simplement
   * plus courte. crm_immo_loyers gagne une ligne par mois et par dossier — cent
   * dossiers et la table passe le millier en moins d'un an. Les compteurs se
   * mettraient alors a oublier les plus anciens loyers, en silence.
   *
   * `.order(...)` n'est pas decoratif : sans ordre TOTAL, deux pages successives
   * peuvent trier differemment deux lignes ex aequo, et on en saute ou on en repete.
   */
  assert.equal((HOOK.match(/lireToutesLesLignes</g) ?? []).length, 2,
    'les DEUX lectures doivent etre paginees');
  assert.equal((HOOK.match(/\{ count: 'exact' \}/g) ?? []).length, 2,
    'chaque lecture doit annoncer son total, sinon la troncature reste invisible');
  assert.equal((HOOK.match(/\.order\('id'\)\.range\(de, a\)/g) ?? []).length, 2,
    'chaque page doit etre bornee ET trier sur une colonne unique');
  assert.ok(!/date_fin_contrat|date_entree/.test(CODE_HOOK),
    'le hook lit les colonnes du dossier : elles peuvent diverger de la periode');

  /* Et c'est bien le CLASSEMENT qui fait le tri, pas la requete. */
  const noyau = lire('src/lib/crmImmoEcheancier.ts');
  assert.match(noyau, /for \(const p of periodes\) \{\s*\n\s*if \(p\.cloturee\) continue;/,
    'les categories de contrat doivent ignorer les periodes cloturees');
});

test('F2 — les deux requetes sont cloisonnees par company_id', () => {
  /*
   * La RLS cloisonne deja. Le `.eq('company_id', ...)` n'est donc pas la securite :
   * c'est la lisibilite de l'intention, et le filet si une policy est un jour relachee.
   * Les deux requetes doivent le porter.
   */
  const requetes = HOOK.split('.from(').slice(1);
  assert.equal(requetes.length, 2, 'le hook doit faire exactement deux requetes');
  for (const r of requetes) {
    assert.match(r.slice(0, 260), /\.eq\('company_id', companyId\)/,
      'une requete du hook ne filtre pas sur company_id');
  }
});

test('F3 — la cloche du module, elle, ne lit toujours PAS les contrats', () => {
  /*
   * La decision d'avant tient : les alertes lisent les trois colonnes du dossier,
   * parce qu'elles ne s'interessent qu'a la periode EN COURS et que les relire dans
   * les contrats serait une seconde source pour la meme verite.
   *
   * Le dashboard, lui, a besoin des periodes PASSEES et FUTURES — qu'un dossier ne
   * peut pas porter, puisqu'il n'en reflete qu'une. Les deux hooks lisent donc
   * differemment, et c'est la bonne raison, pas une incoherence.
   */
  const tables = [...CLOCHE.matchAll(/\.from\('([^']+)'\)/g)].map(m => m[1]);
  assert.ok(!tables.includes('crm_immo_contrats'),
    'la cloche s est mise a lire les contrats : seconde source pour la periode en cours');
});

test('F4 — rien n est demande a une Societe qui n a pas le module', () => {
  /*
   * AdminDashboard est monte pour TOUTES les Societes de Talvex, et une seule possede
   * le module. Sans cette garde, chacune paierait deux requetes inutiles a chaque
   * ouverture de panel. La RLS rendrait bien 0 ligne — ce n'est pas une question de
   * securite, c'est une question de ne pas demander ce qu'on sait absent.
   */
  assert.match(HOOK, /if \(!actif \|\| !companyId\) \{[\s\S]{0,200}?return;/,
    'le hook doit sortir sans requete quand le module n est pas accorde');
});

console.log('\n=== 7. LA NAVIGATION DEPUIS CHAQUE CARTE ===');

test('G1 — CHAQUE carte mene a SA propre categorie, aucune a « Tous »', () => {
  /*
   * David, le 22 octobre 2026 : << Je ne veux pas qu'une carte ouvre simplement Tous si
   * un filtre precis peut etre applique. >>
   *
   * Avant ce jour, cinq des sept cartes ouvraient la liste complete et deux partageaient
   * le meme filtre << Fin proche >>. Mesure du matin : la carte << Contrats a
   * renouveler >> affichait 0 et son clic ouvrait une liste d'UNE ligne.
   *
   * On verifie donc que chaque carte demande sa cle, et pas celle d'une voisine.
   */
  const cartes = [...CORPS_IMMO.matchAll(/key: '([^']+)'[^}]*/g)];
  assert.equal(cartes.length, 7, 'il doit y avoir sept cartes');
  for (const [carte, cle] of cartes.map(m => [m[0], m[1]] as const)) {
    assert.ok(carte.includes(`onClick: vers('${cle}')`),
      `la carte ${cle} ne mene pas a sa propre categorie`);
  }
  assert.ok(!/onClick: ouvrir\b|ouvrirFinProche/.test(CORPS_IMMO),
    'une carte mene encore a la liste complete ou a l ancien filtre « Fin proche »');
});

test('G2 — la page offre un filtre pour chacune des sept categories, plus « Tous »', () => {
  /*
   * L'autre moitie du contrat : une carte peut demander sa categorie, encore faut-il
   * que la page sache l'appliquer. Les libelles sont construits a partir de
   * CATEGORIES_IMMO, donc le compilateur reclame une entree des qu'une categorie
   * apparait dans le calcul — mais rien n'empeche de retirer un bouton de la BARRE.
   */
  const barre = lire('src/pages/admin/views/crm-immo/CrmImmoFilters.tsx');
  const cles = [...(barre.match(/const LIBELLES: Record<CategorieImmo, string> = \{([\s\S]*?)\};/)?.[1] ?? '')
    .matchAll(/'([a-z-]+)':/g)].map(m => m[1]);
  const cartes = [...CORPS_IMMO.matchAll(/key: '([^']+)'/g)].map(m => m[1]);
  assert.deepEqual(cles.slice().sort(), cartes.slice().sort(),
    'les filtres de la page et les cartes du dashboard ne couvrent pas les memes categories');
  assert.match(barre, /\{ valeur: 'tous', libelle: 'Tous' \}/,
    '« Tous » doit rester : David l a demande explicitement');
});

test('G3 — la demande de filtre est deposee, puis consommee une seule fois', () => {
  /*
   * Le dashboard et la page du module ne se connaissent pas : au moment du clic, la
   * page n'est meme pas montee. Le contexte, qui vit AU-DESSUS du renderer, porte donc
   * la demande — le meme motif deja utilise pour l'ouverture d'un dossier.
   *
   * La consommation est obligatoire : sans elle, le filtre se reappliquerait a chaque
   * rendu et l'utilisateur ne pourrait plus revenir a << Tous >>.
   */
  assert.match(CONTEXTE, /filtreADemander: CategorieImmo \| null/, 'le contexte doit porter la demande');
  assert.match(DASH, /demanderFiltre: \(f: CategorieImmo\) => setFiltreImmoADemander\(f\)/,
    'AdminDashboard doit fournir le depot');
  assert.match(PAGE, /partage\?\.filtreConsomme\(\);[\s\S]{0,80}?setFiltre\(vise\)/,
    'la page doit consommer la demande AVANT de poser le filtre');
});

test('G4 — la page lit le MEME classement que les cartes, elle n en refait aucun', () => {
  /*
   * LE POINT QUI TUE LA DIVERGENCE.
   *
   * La page avait sa propre horloge — un useMemo a dependance vide, donc GELEE au
   * montage, sans intervalle ni retour de visibilite — et son propre calcul de preavis,
   * avec sa propre constante de 30 jours. Celle du dashboard avance toutes les 60 s.
   * Un panel laisse ouvert la nuit comparait une carte datee du 23 a une liste du 22.
   *
   * Desormais la page lit l'appartenance par le contexte. Elle ne peut plus se tromper
   * de date, puisqu'elle n'en lit plus aucune.
   */
  assert.match(DASH, /tableauDeBord: crmImmoOuvert/,
    'AdminDashboard doit partager le classement par le contexte');
  assert.match(CONTEXTE, /dossiersParCategorie: Record<CategorieImmo, Set<string>>/,
    'le contexte doit porter les ensembles de dossiers');
  assert.match(PAGE, /const classement = tableauDeBord\?\.dossiersParCategorie \?\? null/,
    'la page doit prendre le classement du contexte');
  assert.ok(!/journeeDeReference\(new Date\(\)/.test(sansCommentaires(PAGE)),
    'la page s est refabrique une horloge : elle divergera du dashboard');
  assert.ok(!/fuseauLocal/.test(sansCommentaires(PAGE)),
    'la page n a plus besoin de fuseau : tout le calcul de date est ailleurs');
});

test('G4 bis — changer une periode previent la liste, le classement ET la cloche', () => {
  /*
   * TROIS SURFACES, ET AUCUNE NE DEVINE.
   *
   * Un renouvellement, un encaissement ou une annulation change ce qui alimente :
   *   - la LISTE de la page, qui porte les dates du dossier ;
   *   - le CLASSEMENT, qui decide dans quelle categorie ce dossier tombe ;
   *   - la CLOCHE, qui derive ses alertes des memes dates.
   *
   * Chacune a son propre rythme reseau — cinq minutes, demarres a des instants
   * differents, donc jamais en phase. Sans signal, un bail renouvele reste dans
   * l'ancienne categorie et affiche ses anciennes dates jusqu'au prochain passage.
   *
   * C'est devenu visible le 22 octobre 2026 : tant que le filtre refaisait son propre
   * calcul sur les dates du dossier, la liste et la carte etaient fausses ensemble. Du
   * moment qu'elles viennent de sources rafraichies separement, il faut les synchroniser.
   */
  const modale = lire(DOSSIER_MODULE + '/CrmImmoDetailsModal.tsx');
  assert.match(modale, /onPeriodeChangee\?: \(\) => void;/,
    'la modale doit pouvoir signaler un changement de periode');
  assert.equal((modale.match(/onPeriodeChangee\?\.\(\)/g) ?? []).length, 3,
    'les TROIS ecritures doivent prevenir : renouveler, encaisser, annuler');

  for (const quoi of ['dos.recharger()', 'partage?.tableauDeBord?.recharger()', 'alertes?.recharger()']) {
    assert.ok(PAGE.includes(quoi), `le signal doit rafraichir ${quoi}`);
  }
  assert.match(CONTEXTE, /recharger: \(\) => Promise<void>;/,
    'le contexte doit exposer le rafraichissement du classement');
});

test('G5 — pendant le chargement, la liste dit « chargement », pas « aucun dossier »', () => {
  /*
   * Le classement arrive par le reseau, apres la liste. Pendant ce temps, un filtre de
   * categorie rend une liste vide — et un tableau vide affiche << aucun dossier ne
   * correspond >>, ce qui est faux et decourage de chercher plus loin.
   *
   * Le cas symetrique est pire et il est teste ailleurs (filtres.test.ts) : rendre la
   * liste COMPLETE pendant le chargement ferait croire que les 300 dossiers de la
   * Societe ont tous un loyer en retard.
   */
  assert.match(PAGE, /const enAttenteDuClassement = filtre !== 'tous' &&/,
    'la page doit distinguer « classement en route » de « aucun resultat »');
  assert.equal((PAGE.match(/loading=\{dos\.loading \|\| enAttenteDuClassement\}/g) ?? []).length, 2,
    'le tableau ET les cartes mobiles doivent montrer l attente');
});

console.log('\n=== 8. LA GRILLE RESTE UNE SEULE COQUILLE ===');

test('H1 — les deux jeux passent par le meme composant de carte', () => {
  /*
   * Quarante lignes de JSX recopiees, c'est deux cartes qui divergent au premier
   * ajustement. Les deux jeux passent donc par GrilleKpi, et la coquille n'existe
   * qu'une fois.
   */
  assert.equal((GRILLE.match(/function GrilleKpi/g) ?? []).length, 1,
    'GrilleKpi doit etre definie une seule fois');
  assert.match(CORPS_GENERIQUE, /<GrilleKpi kpis=\{kpis\} tokens=\{t\} \/>/);
  assert.match(CORPS_IMMO, /<GrilleKpi kpis=\{kpis\} tokens=\{t\} \/>/);
  assert.equal((GRILLE.match(/boxShadow: 'inset 0 1px 0/g) ?? []).length, 1,
    'le style de la carte est ecrit deux fois : la coquille a ete recopiee');
});

test('H2 — une carte cliquable est atteignable au clavier', () => {
  /*
   * Les cartes generiques etaient des <div onClick> sans role ni tabIndex : la seule
   * cliquable, << Sans statut >>, etait inaccessible au clavier. Sept nouvelles cartes
   * cliquables rendaient le defaut sept fois plus visible, donc il est corrige pour
   * les deux jeux a la fois.
   */
  assert.match(GRILLE, /role=\{cliquable \? 'button' : undefined\}/);
  assert.match(GRILLE, /tabIndex=\{cliquable \? 0 : undefined\}/);
  assert.match(GRILLE, /e\.key === 'Enter' \|\| e\.key === ' '/,
    'Entree et Espace doivent declencher le clic');
  assert.match(GRILLE, /aria-label=\{cliquable \?/,
    'une carte cliquable doit s annoncer');
});

console.log('\n=== 9. LA VUE D ENSEMBLE EST SERVIE PAR LES DEUX CHEMINS ===');

test('I1 — les deux `case` qui rendent la Vue d ensemble recoivent les compteurs', () => {
  /*
   * AdminViewRenderer rend VueEnsemble a DEUX endroits : le case 'vue-ensemble' et le
   * `default:`, qui rattrape un onglet inconnu. Oublier le second donnerait un
   * dashboard aux six compteurs generiques apres un retour d'onglet mal nomme — une
   * panne qui n'arrive qu'une fois sur dix et qu'on ne reproduit jamais.
   */
  const rendus = [...RENDERER.matchAll(/<VueEnsemble[^/]*/g)].map(m => m[0]);
  assert.equal(rendus.length, 2, `VueEnsemble est rendue ${rendus.length} fois, 2 attendues`);
  for (const r of rendus) {
    assert.match(r, /immo=\{immoDashboard\}/, 'un rendu de VueEnsemble ne recoit pas les compteurs');
    assert.match(r, /onOuvrirCrmImmo=\{onOuvrirCrmImmo\}/, 'un rendu ne recoit pas la navigation');
  }
});

console.log(`\n=== RESULTAT : ${ok} OK, ${ko} ECHEC ===\n`);
process.exit(ko ? 1 : 0);
