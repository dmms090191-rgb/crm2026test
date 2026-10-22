/**
 * Tests de garde : L'ONGLET ECHEANCIER, LE RENOUVELLEMENT, ET LA SOURCE UNIQUE.
 * Lancer :  npx tsx scripts/crm-immo/echeancierInterface.test.ts
 *
 * ---------- LA REGLE QUE CE FICHIER TIENT AVANT TOUTES LES AUTRES ----------
 *
 * David : << Echeancier + numero de loyer + notification doivent partager une seule
 * source de calcul. >> Quatre surfaces affichent des echeances — l'onglet, les cartes
 * mobile, l'apercu du formulaire, la modale de renouvellement — et une cinquieme les
 * numerote : la cloche. Si l'une d'elles refaisait la boucle des mois, elle finirait par
 * donner un autre total, et le defaut serait invisible jusqu'au premier mois court.
 *
 * On verifie donc que `construireEcheancier` est le SEUL producteur d'echeances, et que
 * personne n'a recopie sa boucle ailleurs.
 */
import { readFileSync, readdirSync } from 'node:fs';

let ko = 0, ok = 0;
const t = (nom: string, cond: boolean) => {
  if (cond) { ok++; console.log('  OK    | ' + nom); }
  else { ko++; console.log('  ECHEC | ' + nom); }
};

const D = 'src/pages/admin/views/crm-immo/';
const lire = (p: string) => readFileSync(p, 'utf8');
const code = (p: string) => lire(p).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');

const onglet = code(D + 'CrmImmoEcheancier.tsx');
const modale = code(D + 'CrmImmoDetailsModal.tsx');
const renouv = code(D + 'CrmImmoRenouvelerModal.tsx');
const champs = code(D + 'CrmImmoChampsDossier.tsx');
const hook = code(D + 'useCrmImmoEcheancier.ts');
const coeur = code('src/lib/crmImmoEcheancier.ts');
const alertes = code('src/lib/crmImmoAlertes.ts');

console.log('\n=== 1. UNE SEULE SOURCE DE CALCUL ===');
{
  /*
   * LA BOUCLE DES MOIS n'existe qu'a UN endroit. On la repere par le passage au mois
   * suivant — le geste qui fait un echeancier — et on verifie qu'aucun autre fichier du
   * module ne le recopie.
   */
  const fichiers = readdirSync(D).filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));
  const coupables = fichiers.filter(f => /mois === 12 \? |mois \+ 1|moisSuivant/.test(code(D + f)));
  t('aucun fichier du module ne refait la boucle des mois',
    coupables.length === 0 || coupables.join() === '');
  t('le coeur, lui, la porte', /mois === 12 \? \{ annee: annee \+ 1, mois: 1 \}/.test(coeur));

  /* Les quatre surfaces appellent la MEME fonction. */
  for (const [nom, src] of [
    ["l'onglet (via son hook)", hook],
    ["l'apercu du formulaire", champs],
    ['la modale de renouvellement', renouv],
    ['les notifications', alertes],
  ] as const) {
    /*
     * DEUX portes d'entree, un seul moteur.
     *
     * construireEcheancier calcule les echeances d'UNE periode ; echeancierDuDossier
     * recolle celles de TOUTES les periodes d'un dossier — et il appelle la premiere.
     * Les notifications sont passees a la seconde le 22 octobre 2026, pour qu'un impaye
     * d'un contrat renouvele reste reclame. Les deux sont acceptees ici ; ce qui compte
     * est qu'aucune surface ne recalcule des mois de son cote.
     */
    t(`${nom} appelle une fonction partagee d echeancier`,
      /construireEcheancier\(|echeancierDuDossier\(/.test(src));
    t(`${nom} l importe de crmImmoEcheancier`, /crmImmoEcheancier'/.test(src));
  }

  /* Et echeancierDuDossier ne recalcule rien : il passe par construireEcheancier. */
  t('echeancierDuDossier s appuie sur construireEcheancier',
    /export function echeancierDuDossier[\s\S]{0,900}?construireEcheancier\(\{ debut: p\.debut/.test(coeur));

  /* Et le rabattement n'est implemente qu'une fois dans tout src/. */
  t('une seule implementation de jourRabattu dans le module',
    fichiers.filter(f => /function jourRabattu/.test(code(D + f))).length === 0);

  /* enDateFrancaise est la seule mise en forme JJ/MM/AAAA : pas de seconde fonction. */
  for (const [nom, src] of [["l'onglet", onglet], ['le renouvellement', renouv]] as const) {
    t(`${nom} formate par enDateFrancaise`, /enDateFrancaise\(/.test(src));
    t(`${nom} ne refabrique pas de date a la main`,
      !/padStart\(2, '0'\)[\s\S]{0,60}?\/\//.test(src) && !/toLocaleDateString/.test(src));
  }
}

console.log('\n=== 2. LE TROISIEME ONGLET ===');
{
  /*
   * ---------- POURQUOI CETTE ASSERTION NE RECOPIE PLUS LA LIGNE ENTIERE ----------
   *
   * Elle epinglait le texte exact de la declaration, point-virgule compris. Elle disait
   * donc deux choses a la fois : << 'echeancier' est une valeur d'onglet >> — ce qu'elle
   * veut verifier — et << il y a exactement trois onglets, dans cet ordre >> — ce qu'elle
   * ne veut pas verifier, et qui l'a fait echouer a l'ajout de l'onglet Documents.
   *
   * Un garde qui tombe a chaque evolution legitime finit desactive. Celui-ci verifie
   * desormais ce qu'il annonce : la declaration existe, et 'echeancier' en fait partie.
   */
  const declaration = /export type OngletDetails =([^;]+);/.exec(modale);
  t("'echeancier' est une valeur d onglet",
    declaration !== null && /'echeancier'/.test(declaration[1]));
  t("et 'informations' et 'commentaires' y sont toujours",
    declaration !== null && /'informations'/.test(declaration[1]) && /'commentaires'/.test(declaration[1]));
  t('il figure dans la barre d onglets',
    /\{ cle: 'echeancier', libelle: 'Échéancier loyers'/.test(modale));
  t('il a son panneau', /onglet === 'echeancier' &&[\s\S]{0,80}?<CrmImmoEcheancier/.test(modale));
  t('le panneau recoit l echeancier calcule', /echeancier=\{ech\.echeancier\}/.test(modale));
}

console.log('\n=== 3. LE TABLEAU DESKTOP ET LES CARTES MOBILE ===');
{
  /* Les quatre colonnes demandees par David, dans l ordre. */
  const entetes = [...onglet.matchAll(/<th[^>]*>([^<]+)<\/th>/g)].map(m => m[1].trim());
  t('le tableau porte N°, Date, Statut et Actions',
    entetes.join('|') === 'N°|Date|Statut|Actions');

  t('le tableau est MASQUE sous 768 px', /className="hidden md:block/.test(onglet));
  t('les cartes sont masquees AU-DESSUS de 768 px', /className="md:hidden/.test(onglet));
  t('les deux listent le meme echeancier',
    (onglet.match(/echeancier\.map\(/g) ?? []).length === 2);

  /* Cible tactile : 14 px d icone + 13 px de marge interieure haut et bas, plus la
     bordure, depassent 44 px sur telephone. */
  t('les boutons grossissent sous 768 px', /max-md:py-\[13px\]/.test(onglet));
  t('la regle des 16 px est respectee dans le renouvellement',
    /max-md:text-base/.test(renouv));
  t('le clavier mobile ne coupe pas la modale', /max-h-\[90dvh\]/.test(renouv));
  t('un nom long ne deborde pas', /break-words/.test(onglet));
}

console.log('\n=== 4. LE SURLIGNAGE DU LOYER ACTUEL ===');
{
  t('le loyer actuel vient de la fonction partagee', /loyerActuel\(/.test(hook));
  t('la ligne porte un marqueur reperable', /data-actuel=\{l\.actuel \? 'oui' : 'non'\}/.test(onglet));
  t('la carte aussi', (onglet.match(/data-actuel=/g) ?? []).length === 2);
  t('le surlignage est visible autrement que par la couleur seule',
    /inset 3px 0 0/.test(onglet) && /fontWeight: l\.actuel \? 700/.test(onglet));

  /*
   * ET SURTOUT : rien n est surligne quand il n y a pas de loyer ce mois-ci. Le
   * marqueur vient de `actuel`, qui vaut faux partout si loyerActuel rend null — il n y
   * a aucun repli vers << la prochaine >> ni vers << la derniere >>.
   */
  t('aucun repli ne fabrique un loyer actuel',
    /actuel !== null && actuel\.date === e\.date/.test(hook)
    && !/\?\?\s*echeancier\[0\]/.test(hook));
  t('le coeur le dit aussi : l absence est une reponse',
    /return echeancier\.find\(e => e\.date\.slice\(0, 7\) === moisCourant\) \?\? null;/.test(coeur));
}

console.log('\n=== 5. ENCAISSER, ANNULER ===');
{
  t('le bouton Marquer encaissé existe', /Marquer encaissé/.test(onglet));
  t('le bouton Annuler existe', /onAnnuler\(l\.encaissement!\)/.test(onglet));
  t('encaisser cree une ligne', /\.from\('crm_immo_loyers'\)[\s\S]{0,120}?\.insert\(/.test(hook));
  t('annuler NE supprime pas la ligne',
    /annule_le: new Date\(\)\.toISOString\(\)/.test(hook) && !/\.delete\(\)/.test(hook));
  t('annuler enregistre son auteur', /annule_par:/.test(hook));
  t('le motif est borne a 500 caracteres', /slice\(0, 500\)/.test(hook));

  /*
   * UN REFUS DE LA RLS NE DOIT JAMAIS PASSER EN SILENCE.
   *
   * supabase-js rend { error: null } et ZERO ligne quand une policy refuse un UPDATE ou
   * un DELETE. Chaque ecriture doit donc demander ses lignes en retour et compter ce
   * qui revient.
   *
   * Le renouvellement fait exception depuis le 22 octobre 2026, et pour une meilleure
   * raison : il est passe en fonction SQL, qui compte ses lignes par GET DIAGNOSTICS et
   * LEVE une exception. PostgREST la remonte comme une vraie erreur — plus besoin de
   * deviner a partir d'un tableau vide.
   *
   * Il restait QUATRE ecritures gardees ici, dont DEUX pour le seul renouvellement (la
   * cloture et l'insertion). Il en reste donc exactement deux : marquer encaisse, et
   * annuler un encaissement. On fige ce nombre, pas un seuil : un `>=` laisserait
   * passer une ecriture ajoutee sans garde.
   */
  const ecritures = (hook.match(/\.select\('id'\)/g) ?? []).length;
  t('les deux ecritures directes demandent leurs lignes', ecritures === 2);
  t('un zero ligne est traite comme un refus',
    (hook.match(/data\.length === 0\)[\s\S]{0,60}?Action refusée/g) ?? []).length === 2);
  t('le renouvellement, lui, passe par la fonction atomique',
    /\.rpc\('crm_immo_renouveler'/.test(hook));

  /* L annulation rend l echeance due : seuls les encaissements ACTIFS comptent. */
  t('seuls les encaissements non annules comptent',
    /if \(e\.annule_le === null\) m\.set/.test(hook));
  /*
   * Le filtre des annulations a DEMENAGE le 22 octobre 2026.
   *
   * La cloche ne lit plus crm_immo_loyers : elle recoit les encaissements du hook qui
   * alimente aussi le tableau de bord. Deux lectures separees donnaient deux jeux de
   * lignes rafraichis a des instants differents — et une cloche qui reclamait un loyer
   * que les cartes comptaient deja comme encaisse.
   *
   * La garde reste donc indispensable, mais a son nouvel endroit.
   */
  t('le chargeur partage ne prend que les encaissements actifs',
    /\.is\('annule_le', null\)/.test(code(D + 'useCrmImmoTableauDeBord.ts')));
  t('et la cloche ne les relit plus de son cote',
    !/from\('crm_immo_loyers'\)/.test(code(D + 'useCrmImmoAlertes.ts')));
}

console.log('\n=== 6. LE RENOUVELLEMENT ===');
{
  t('le bouton existe dans l onglet', /Renouveler le contrat/.test(onglet));
  t('la modale a ses trois champs',
    /crm-immo-renouveler-debut/.test(renouv) && /crm-immo-renouveler-fin/.test(renouv)
    && /crm-immo-renouveler-jour/.test(renouv));
  t('le jour est REPRIS de la periode en cours',
    /useState\(String\(periodeActive\?\.jour_encaissement \?\? ''\)\)/.test(renouv));
  t('il reste modifiable', /onChange=\{e => \{ setJour\(e\.target\.value\)/.test(renouv));
  t('un apercu montre ce qui sera cree', /crm-immo-renouveler-apercu/.test(renouv));
  t('on ne peut pas valider une periode vide', /disabled=\{enCours \|\| apercu\.length === 0\}/.test(renouv));

  /*
   * L ORDRE — cloturer PUIS creer — A DEMENAGE EN BASE.
   *
   * Il n'est plus une discipline du client mais le corps d'une fonction, donc d'une
   * seule transaction : soit les deux, soit aucune. L inverse reste refuse par l index
   * partiel unique.
   */
  const sqlRenouv = readdirSync('supabase/migrations')
    .filter(f => f.endsWith('_crm_immo_renouveler_atomique.sql'))
    .map(f => readFileSync('supabase/migrations/' + f, 'utf8'))[0] ?? '';
  t('la fonction de renouvellement existe', sqlRenouv !== '');
  const ordreCloture = sqlRenouv.indexOf('SET cloture_le = now()');
  const ordreInsert = sqlRenouv.indexOf('INSERT INTO public.crm_immo_contrats');
  t('on cloture AVANT de creer', ordreCloture > 0 && ordreInsert > ordreCloture);
  t('l ancienne periode est CONSERVEE, jamais supprimee',
    !/DELETE FROM public\.crm_immo_contrats/i.test(sqlRenouv));
  t('et le client ne refait plus les deux requetes lui-meme',
    !/cloture_le: new Date\(\)/.test(hook));

  t('l historique des periodes est consultable', /crm-immo-historique-periodes/.test(onglet));
  t('chaque periode close garde son propre echeancier', /echeancierDe\(p\)/.test(onglet));
}

console.log('\n=== 7. L APERCU DANS « AJOUTER UN CLIENT » ===');
{
  t('il apparait des que les trois champs sont la', /contratRenseigne/.test(champs));
  t('il annonce le NOMBRE de loyers', /crm-immo-apercu-nombre-loyers/.test(champs));
  t('il dit aussi quand il n y en a AUCUN', /Aucun loyer ne tombe entre ces deux dates/.test(champs));
  t('aucun champ « nombre de loyers » n est saisissable',
    !/nombre_loyers|nombreLoyers/.test(champs) && !/nombre_loyers/.test(code(D + 'crmImmoTypes.ts')));
  t('le calcul vient de la fonction partagee', /construireEcheancier\(\{/.test(champs));
}

console.log('\n=== 8. LA NUMEROTATION DANS LES NOTIFICATIONS ===');
{
  t('le titre porte le rang', /rangDuLoyer\(a\.rang\)/.test(alertes));
  t('le rang vient de l echeancier', /rang: \{ numero: cible\.numero, total: cible\.total \}/.test(alertes));
  t('le total n est jamais stocke',
    !/total: 12|total: 6|nombre_loyers/.test(alertes));
  t('le retard est dit quand le loyer vient d un mois passe',
    /'Loyer en retard'/.test(alertes));
  t('un loyer encaisse ne reste pas reclame', /loyerAAlerter\(/.test(alertes));
}

console.log(`\n=== RESULTAT : ${ok} OK, ${ko} ECHEC ===\n`);
process.exit(ko === 0 ? 0 : 1);
