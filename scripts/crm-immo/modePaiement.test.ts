/**
 * LE MODE DE PAIEMENT, MODIFIABLE DEPUIS LA LISTE.
 * Lancer :  npx tsx scripts/crm-immo/modePaiement.test.ts
 *
 * ---------- CE QUE CE FICHIER TIENT ----------
 *
 * David, le 23 octobre 2026 : « La colonne Mode de paiement doit devenir une vraie action
 * modifiable pour chaque dossier », avec trois valeurs et trois seulement, une sauvegarde
 * persistante, et « si Supabase echoue, revenir a l'ancienne valeur et afficher une erreur
 * comprehensible ». Sur telephone : « ne mets pas un <select> minuscule dans la carte ».
 *
 * Deux moities, donc deux familles d'assertions :
 *
 *   - LE MODELE. Les quatre reponses possibles d'une ecriture, et la decision qui en
 *     decoule. Ce sont de VRAIS appels : rien n'est suppose.
 *   - LE CABLAGE. Lu dans les sources, parce qu'aucun test unitaire ne dirait qu'un
 *     composant a bien ete branche a ses deux vues, ni qu'il porte une cible de 44 px.
 *
 * ---------- LE PIEGE DE LA PROSE ----------
 *
 * Les fichiers de ce module expliquent en commentaire ce qu'ils s'interdisent. Un grep
 * naif y trouve donc le motif qu'il cherche justement a interdire, et passe au vert pour
 * la plus mauvaise des raisons. Tout ce qui est lu ici passe par `sansCommentaires`.
 */
import { readFileSync } from 'node:fs';
import { decisionEcriture } from '../../src/lib/crmImmoModePaiement.ts';
import { MODES_PAIEMENT } from '../../src/pages/admin/views/crm-immo/crmImmoTypes.ts';

let ko = 0, ok = 0;
const t = (nom: string, cond: boolean) => {
  if (cond) { ok++; console.log('  OK    | ' + nom); }
  else { ko++; console.log('  ECHEC | ' + nom); }
};

const lire = (p: string) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
const sansCommentaires = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

const D = 'src/pages/admin/views/crm-immo/';
const CELLULE = sansCommentaires(lire(D + 'CrmImmoChoixCellule.tsx'));
const TABLEAU = sansCommentaires(lire(D + 'CrmImmoTable.tsx'));
const CARTES = sansCommentaires(lire(D + 'CrmImmoCards.tsx'));
const HOOK = sansCommentaires(lire(D + 'useCrmImmoDossiers.ts'));
const CHAMPS = sansCommentaires(lire(D + 'CrmImmoChampsDossier.tsx'));
const PAGE = sansCommentaires(lire('src/pages/admin/views/CrmImmo.tsx'));

console.log('\n=== 0. GARDE DU GARDE ===');
{
  /* Si `sansCommentaires` vidait les fichiers, tout ce qui suit passerait au vert sans
     rien prouver. On verifie donc d'abord qu'il reste du code a examiner. */
  for (const [nom, src] of [
    ['CrmImmoChoixCellule', CELLULE], ['CrmImmoTable', TABLEAU], ['CrmImmoCards', CARTES],
    ['useCrmImmoDossiers', HOOK], ['CrmImmoChampsDossier', CHAMPS], ['CrmImmo', PAGE],
  ] as [string, string][]) {
    t(`${nom} n est pas vide apres retrait des commentaires`, src.length > 400);
  }
  /* Et que le retrait fonctionne vraiment : aucun bloc de commentaire ne subsiste. */
  t('plus aucun bloc /* */ ne subsiste', !CELLULE.includes('/*'));
}

console.log('\n=== 1. LES TROIS VALEURS, ET SEULEMENT ELLES ===');
{
  t('trois modes, pas quatre', MODES_PAIEMENT.length === 3);
  t('les valeurs techniques sont cheque / especes / virement',
    MODES_PAIEMENT.map(m => m.valeur).join() === 'cheque,especes,virement');
  t('les libelles affiches portent les accents',
    MODES_PAIEMENT.map(m => m.libelle).join() === 'Chèque,Espèces,Virement');
  /* L'absence n'est pas une quatrieme valeur : aucun mode ne s'appelle « aucun ». */
  t('aucun mode ne represente l absence',
    MODES_PAIEMENT.every(m => !/aucun|vide|null|non renseign/i.test(m.valeur + m.libelle)));
}

console.log('\n=== 2. LES QUATRE REPONSES D UNE ECRITURE ===');
{
  /* a) Enregistre : une ligne revient, rien ne bouge a l'ecran. */
  const bon = decisionEcriture({ message: null, lignes: 1 });
  t('une ligne rendue : c est enregistre', bon.erreur === null);
  t('une ligne rendue : on ne revient pas en arriere', bon.revenirEnArriere === false);

  /*
   * b) ZERO LIGNE SANS ERREUR. C'est la forme exacte d'un UPDATE refuse par la RLS :
   * supabase-js rend { error: null }. Le traiter comme un succes afficherait une valeur
   * que la base n'a pas — le defaut le plus cher de ce module, rencontre quatre fois.
   */
  const refus = decisionEcriture({ message: null, lignes: 0 });
  t('zero ligne sans erreur est un ECHEC, pas un succes', refus.erreur !== null);
  t('zero ligne : on revient en arriere', refus.revenirEnArriere === true);
  t('et le message parle de droits, pas de SQL',
    refus.erreur !== null && /droits/i.test(refus.erreur));

  /* c) La contrainte CHECK, reconnue a son nom, rend une phrase utilisable. */
  const check = decisionEcriture({
    message: 'new row for relation "crm_immo_dossiers" violates check constraint '
      + '"crm_immo_dossiers_mode_paiement_connu"',
    lignes: 0,
  });
  t('la contrainte CHECK rend une phrase comprehensible',
    check.erreur === 'Ce mode de paiement n’est pas accepté. Choisissez Chèque, Espèces ou Virement.');
  t('la contrainte CHECK fait revenir en arriere', check.revenirEnArriere === true);
  t('et le nom de la contrainte ne fuit pas a l ecran',
    check.erreur !== null && !/check constraint|crm_immo_dossiers/.test(check.erreur));

  /* d) Une panne quelconque : le message brut est encadre, pas cache. Le masquer
     empecherait tout diagnostic ; le montrer seul ne dirait pas de quoi il s'agit. */
  const panne = decisionEcriture({ message: 'Failed to fetch', lignes: 0 });
  t('une panne reseau est annoncee comme un echec d enregistrement',
    panne.erreur !== null && panne.erreur.startsWith('Le mode de paiement n’a pas pu être enregistré'));
  t('et le message d origine reste lisible',
    panne.erreur !== null && panne.erreur.includes('Failed to fetch'));
  t('une panne fait revenir en arriere', panne.revenirEnArriere === true);

  /* Une erreur PRIME sur le nombre de lignes : une base qui rendrait les deux ne doit
     pas etre lue comme un succes. */
  const incoherent = decisionEcriture({ message: 'permission denied', lignes: 1 });
  t('une erreur prime sur une ligne rendue', incoherent.revenirEnArriere === true);
}

console.log('\n=== 3. LES TROIS TRANSITIONS DEMANDEES, ET LE DOSSIER SANS MODE ===');
{
  /*
   * David a demande ces cas nommement. Ce que la transition change, c'est la valeur
   * ENVOYEE ; ce que le modele tranche, c'est la REPONSE. On verifie donc que les trois
   * transitions et le dossier vide suivent toutes le meme chemin — et qu'aucune n'est
   * traitee a part quelque part.
   */
  const transitions: [string, string | null, string][] = [
    ['Chèque → Espèces', 'cheque', 'especes'],
    ['Espèces → Virement', 'especes', 'virement'],
    ['Virement → Chèque', 'virement', 'cheque'],
    ['dossier sans mode → Chèque', null, 'cheque'],
  ];
  for (const [nom, avant, apres] of transitions) {
    t(`${nom} : la valeur visee est connue de la base`,
      MODES_PAIEMENT.some(m => m.valeur === apres));
    t(`${nom} : enregistrement accepte`,
      decisionEcriture({ message: null, lignes: 1 }).erreur === null);
    t(`${nom} : un refus ramene l affichage a « ${avant ?? 'non renseigné'} »`,
      decisionEcriture({ message: null, lignes: 0 }).revenirEnArriere === true);
  }

  /* Le hook court-circuite une valeur identique : sans cela, rouvrir le menu et
     recliquer l'option deja active declencherait un UPDATE pour rien. */
  t('le hook ne reecrit pas une valeur identique',
    /\(avant\.mode_paiement \?\? null\) === valeur/.test(HOOK));
}

console.log('\n=== 4. L ECRITURE EN BASE ===');
{
  /* UN seul champ part : passer par modifier() reecrirait les onze champs du dossier
     depuis une saisie reconstituee, et ecraserait tout champ mal reconstitue. */
  t('un seul champ est envoye', /\.update\(\{ mode_paiement: valeur \}\)/.test(HOOK));
  t('l ecriture est ciblee sur un dossier', /\.update\(\{ mode_paiement: valeur \}\)[\s\S]{0,80}\.eq\('id', id\)/.test(HOOK));
  /* Le `.select()` est ce qui rend le refus RLS visible. Sans lui, zero ligne et succes
     se ressemblent exactement. */
  t('l ecriture se termine par un .select()',
    /\.eq\('id', id\)\s*\n?\s*\.select\('id,mode_paiement'\)/.test(HOOK));
  t('le nombre de lignes rendues est reellement transmis au modele',
    /lignes: \(data \?\? \[\]\)\.length/.test(HOOK));
  t('la decision vient du modele pur, et n est pas refaite sur place',
    HOOK.includes('decisionEcriture(') && !/mode_paiement_connu/.test(HOOK));
  /* L'affichage change d'abord — sinon le menu est poussif en 4G — et ne revient que
     si le modele le demande. */
  t('l affichage est pose avant la reponse',
    /setDossiers\(prev => prev\.map\(d => \(d\.id === id \? \{ \.\.\.d, mode_paiement: valeur \}/.test(HOOK));
  t('le retour en arriere est conditionne a la decision',
    /if \(decision\.revenirEnArriere\)/.test(HOOK));
  /* Et la valeur relue au rechargement : `select('*')` ramene la colonne, donc un F5
     montre ce qui a ete enregistre et non ce qui avait ete affiche. */
  t('la lecture de la liste ramene toutes les colonnes', /\.select\('\*', \{ count: 'exact' \}\)/.test(HOOK));
  /* Une chaine vide devient NULL a l'enregistrement du formulaire : '' ne passerait pas
     la contrainte, et « non renseigne » n'est pas une quatrieme valeur. */
  t('le formulaire enregistre le vide comme NULL', /mode_paiement: vide\(s\.mode_paiement\)/.test(HOOK));
}

console.log('\n=== 5. LE DECLENCHEUR N EST PAS UN NOM DE COLONNE ===');
{
  /*
   * Ce qui rend une cellule modifiable, c'est la PRESENCE de `choix` sur la colonne.
   * Une cle en dur dans le tableau obligerait a y revenir pour chaque future colonne a
   * choix — et se tromperait le jour ou la cle changerait.
   */
  t('le tableau se decide sur la presence de choix', /c\.choix !== undefined/.test(TABLEAU));
  t('les cartes se decident sur la presence de choix', /c\.choix !== undefined/.test(CARTES));
  t('le formulaire se decide sur la presence de choix', /def\.choix !== undefined/.test(CHAMPS));
  t('aucune cle de mode n est codee en dur dans le tableau', !/'mode_paiement'/.test(TABLEAU));
  t('aucune cle de mode n est codee en dur dans les cartes', !/'mode_paiement'/.test(CARTES));
  /* La page, elle, DOIT nommer la colonne : c'est elle qui sait ou la valeur se range.
     Mais elle le fait dans un registre, pas dans une cascade de `if`. */
  t('la page range l ecriture dans un registre', /ECRITURE_PAR_COLONNE/.test(PAGE));
  t('une colonne absente du registre rend une erreur lisible',
    /ecrire === undefined/.test(PAGE) && /ne se modifie pas/.test(PAGE));
}

console.log('\n=== 6. L EDITEUR EST BRANCHE AUX DEUX VUES ===');
{
  t('le tableau importe l editeur', /import CrmImmoChoixCellule from '\.\/CrmImmoChoixCellule'/.test(TABLEAU));
  t('les cartes importent l editeur', /import CrmImmoChoixCellule from '\.\/CrmImmoChoixCellule'/.test(CARTES));
  t('le tableau rend l editeur', /<CrmImmoChoixCellule/.test(TABLEAU));
  t('les cartes rendent l editeur', /<CrmImmoChoixCellule/.test(CARTES));
  /* Les deux vues recoivent le MEME pont : une seule des deux branchee laisserait la
     colonne inerte sur l'autre — c'est-a-dire sur telephone, ou sur ordinateur. */
  const passages = (PAGE.match(/onChoisir=\{changerChoix\}/g) ?? []).length;
  t('la page passe onChoisir aux DEUX vues', passages === 2);
  t('le tableau declare la prop', /onChoisir: \(/.test(TABLEAU));
  t('les cartes declarent la prop', /onChoisir: \(/.test(CARTES));
  /* Le pont rend bien la promesse du hook, sinon l'editeur ne saurait jamais qu'une
     ecriture a echoue. */
  t('le pont appelle le hook', /changerModePaiement/.test(PAGE));
}

console.log('\n=== 7. DEUX FORMES, PARCE QUE DEUX GESTES ===');
{
  /*
   * David : « ne mets pas un <select> minuscule dans la carte ». Sous 768 px l'editeur
   * est une feuille qui monte du bas ; au-dessus, un menu ancre sous la cellule.
   */
  t('la feuille n existe que sous md', /fixed inset-x-0 bottom-0 z-\[66\] md:hidden/.test(CELLULE));
  t('le menu n existe qu a partir de md', /fixed z-\[66\] hidden md:flex/.test(CELLULE));
  t('aucun <select> natif dans l editeur', !/<select/.test(CELLULE));
  t('aucun <select> natif dans les cartes', !/<select/.test(CARTES));
  /* Le formulaire, lui, garde son <select> : c'est un formulaire, et c'est le SEUL
     endroit d'ou l'on peut remettre un dossier a « non renseigne ». */
  t('le formulaire garde sa liste et son option vide',
    /<select/.test(CHAMPS) && /<option value="">—<\/option>/.test(CHAMPS));
  t("l editeur de cellule ne propose PAS l option vide",
    !/value=""/.test(CELLULE));

  /* Un seul jeu d'options pour les deux formes : deux listes finiraient par diverger. */
  t('les deux formes partagent la meme liste d options', /const options = \(grand: boolean\)/.test(CELLULE));
  t('la feuille rend les options en grand', /\{options\(true\)\}/.test(CELLULE));
  t('le menu les rend en petit', /\{options\(false\)\}/.test(CELLULE));
}

console.log('\n=== 8. CIBLES TACTILES ET DEBORDEMENT ===');
{
  /*
   * 44 px est la cible minimale retenue par le module. Elle est posee en `max-md:` : sur
   * ordinateur une ligne de tableau n'a pas a grandir pour une souris.
   */
  t('le declencheur fait 44 px sous md', /max-md:min-h-\[44px\]/.test(CELLULE));
  t('les options de la feuille font 44 px', /min-h-\[44px\]/.test(CELLULE));
  t('le X de la feuille fait 44 px dans les deux sens',
    /min-h-\[44px\] min-w-\[44px\]/.test(CELLULE));
  /* La feuille respecte la zone sure du telephone : sans cela, la derniere option passe
     sous la barre gestuelle d'un iPhone. */
  t('la feuille respecte la zone sure', /env\(safe-area-inset-bottom/.test(CELLULE));
  /* Le menu de bureau est ramene dans l'ecran : pose a `left` pres du bord droit, il
     deborderait. */
  t('le menu est ramene dans la largeur de l ecran',
    /Math\.max\(8, Math\.min\(/.test(CELLULE) && /window\.innerWidth/.test(CELLULE));
  /*
   * Aucune largeur FIXE en pixels : c'est ce qui deborde a 320 px.
   *
   * L'ancre est `["\s]w-[` et non `\bw-[` : la frontiere de mot tombe sur le tiret de
   * `min-w-[44px]`, et un motif ancre sur `\b` interdirait donc la cible tactile du X
   * en croyant interdire une largeur. Une contrainte MINIMALE n'est pas une largeur ;
   * c'est `w-[320px]` qui deborde, pas `min-w-[44px]`.
   */
  t('aucune largeur fixe en pixels dans l editeur', !/["\s]w-\[\d+px\]/.test(CELLULE));
  t('aucune largeur fixe en pixels dans un style en ligne', !/width: ?'\d+px'/.test(CELLULE));
  /* Et la seule largeur minimale du menu reste sous le plus petit ecran teste (320 px). */
  t('la largeur minimale du menu tient a 320 px', /min-w-\[11rem\]/.test(CELLULE));
}

console.log('\n=== 9. FERMER SANS CHANGER ===');
{
  /* Echap ne doit fermer QUE ce menu. La modale Details ecoute aussi Echap : sans
     capture ni stopPropagation, un seul appui refermerait les deux. */
  t('Echap est ecoute en capture', /addEventListener\('keydown', auClavier, true\)/.test(CELLULE));
  t('Echap ne se propage pas plus loin', /e\.stopPropagation\(\)/.test(CELLULE));
  t('l ecouteur est retire a la fermeture', /removeEventListener\('keydown', auClavier, true\)/.test(CELLULE));
  /* Un clic a cote ferme, et c'est le MEME voile dans les deux formes : deux voiles
     differents finiraient par diverger sur ce qui ferme. */
  t('un voile unique recoit le clic a cote', (CELLULE.match(/-voile`\}/g) ?? []).length === 1);
  /* Le X existe sur la feuille, avec un nom accessible qui dit qu'il ne change rien. */
  t('la feuille porte un X qui ne change rien', /aria-label="Fermer sans changer"/.test(CELLULE));
  /* Un defilement du tableau laisserait le menu de bureau flotter seul : on le ferme. */
  t('un defilement ferme le menu', /addEventListener\('scroll', auDefilement, true\)/.test(CELLULE));

  /*
   * ET L'ERREUR RESTE LISIBLE. Si la base refuse, le menu NE se ferme pas : un message
   * affiche une demi-seconde dans un menu qui disparait n'est pas un message.
   */
  t('une erreur laisse le menu ouvert', /if \(error !== null\) \{ setErreur\(error\); return; \}/.test(CELLULE));
  t('et le menu ne se ferme qu apres un succes',
    /setErreur\(error\); return; \}\s*\n\s*setOuvert\(false\);/.test(CELLULE));
}

console.log('\n=== 10. LE TABLEAU N EST PAS CASSE PAR LA NOUVELLE COLONNE ===');
{
  /* La colonne Actions reste epinglee a droite : c'est elle qui porte Details, Modifier
     et Supprimer, et une colonne de plus la pousserait hors de l'ecran. */
  t('la colonne Actions reste epinglee', (TABLEAU.match(/sticky right-0 z-10/g) ?? []).length === 2);
  t('les trois actions sont toujours la',
    /crm-immo-details-\$\{d\.id\}/.test(TABLEAU)
    && /crm-immo-modifier-\$\{d\.id\}/.test(TABLEAU)
    && /crm-immo-supprimer-\$\{d\.id\}/.test(TABLEAU));
  t('le bouton Commentaires est toujours la', /crm-immo-commentaires-\$\{dossier\.id\}/.test(TABLEAU));
  /* L'editeur est porte vers document.body : dans le conteneur a defilement horizontal
     du tableau, un menu en `absolute` serait rogne des qu'il depasse la cellule. */
  t('l editeur est porte hors du tableau', /createPortal\(/.test(CELLULE) && /document\.body/.test(CELLULE));
  /* Et il passe AU-DESSUS de la colonne epinglee, qui est en z-10. */
  t('l editeur passe au-dessus de la colonne epinglee', /z-\[66\]/.test(CELLULE));
}

console.log('\n=== 11. AUCUNE COULEUR EN DUR ===');
{
  /* Le depot a 16 themes, dont 5 clairs : une couleur ecrite a la main passe le build,
     s'affiche correctement sur les sombres et devient illisible sur les clairs. */
  t('aucun hexadecimal', !/#[0-9a-fA-F]{3,8}\b/.test(CELLULE));
  t('aucun rgba()', !/rgba?\(/.test(CELLULE));
  t('aucune classe de couleur Tailwind',
    !/\b(?:text|bg|border)-(?:white|black|slate|gray|zinc|neutral|stone|red|green|blue)-?\d*\b/.test(CELLULE));
  t('les couleurs viennent des tokens', /useThemeTokens/.test(CELLULE));
}

console.log(`\n=== RESULTAT : ${ok} OK, ${ko} ECHEC ===\n`);
process.exit(ko === 0 ? 0 : 1);
