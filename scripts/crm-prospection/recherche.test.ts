/*
 * LE CRM DE PROSPECTION : RECHERCHE, FILTRES, TRI, SELECTION, SUPPRESSION.
 *   node --import tsx --test scripts/crm-prospection/recherche.test.ts
 *
 * Ce sont les cinq comportements que David a decrits le plus precisement, et ce sont donc
 * les cinq qu'il faut pouvoir eprouver. Ils vivent dans src/lib/crmProspectionRecherche.ts,
 * en fonctions PURES et hors de React, exactement pour que ce fichier puisse les
 * interroger sans monter de navigateur.
 *
 * CE QUE CE FICHIER NE PROUVE PAS, et il faut le dire : il ne prouve RIEN sur l'isolation
 * par Societe. Elle n'est pas une affaire de filtrage — elle est tenue par la RLS et par
 * le `.eq('company_id', ...)` de la requete. Filtrer une liste deja chargee ne protege
 * rien : si une ligne d'une autre Societe arrivait jusqu'a ces fonctions, le mal serait
 * deja fait. C'est chaineVue.test.ts qui surveille la clause, et la base qui tranche.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normaliser, correspondARecherche, filtrer, trier, leadsAffiches,
  idsSelectionnables, etatCaseEnTete, idsASupprimer,
  lienOuvrable, hoteDuLien, apercuCommentaire, commentaireTronque,
  filtresActifs, FILTRES_VIDES, SANS_STATUT, CHAMPS_RECHERCHE, COLONNES_TRIABLES,
  COMMENTAIRE_APERCU,
  type LeadProspection, type StatutProspection, type FiltresProspection,
} from '../../src/lib/crmProspectionRecherche.ts';

/* ------------------------------------------------------------------ DECOR */

/*
 * LES IDENTIFIANTS CONTREDISENT L'ORDRE DES NOMS, ET C'EST TOUT LEUR INTERET.
 *
 * Par nom : « A rappeler » < « Client » < « Écarté ».
 * Par id  : 'a3' < 'm2' < 'z1'  — l'ordre EXACTEMENT INVERSE.
 *
 * Sans cette precaution, le relevé C4 passerait meme si le tri portait sur l'identifiant.
 * Mesure du 02/11/2026 : c'etait le cas. Le decor nommait les statuts s1, s2, s3 dans
 * l'ordre alphabetique de leurs noms, si bien que trier par id rendait la MEME liste —
 * et la mutation « trier par identifiant » survivait, relevé vert.
 *
 * Un decor qui ne distingue pas les deux hypotheses ne mesure rien.
 */
const STATUTS: StatutProspection[] = [
  { id: 'z1', nom: 'A rappeler', couleur: '#38bdf8' },
  { id: 'm2', nom: 'Client', couleur: '#22c55e' },
  { id: 'a3', nom: 'Écarté', couleur: '#ef4444' },
];

function lead(p: Partial<LeadProspection> & { id: string; nom: string }): LeadProspection {
  return {
    prenom: null, email: null, poste: null, entreprise: null,
    lien: null, statut_id: null, commentaire: null, ...p,
  };
}

const LEADS: LeadProspection[] = [
  lead({ id: '1', nom: 'Lemétayer', prenom: 'Rémy', email: 'remy@carrefour.fr', poste: 'Directeur marketing', entreprise: 'Carrefour', statut_id: 'z1' }),
  lead({ id: '2', nom: 'Dupont', prenom: 'Marie', email: 'm.dupont@leclerc.fr', poste: 'Acheteuse', entreprise: 'Leclerc', statut_id: 'm2' }),
  lead({ id: '3', nom: 'Bernard', prenom: 'Claire', email: 'c.bernard@carrefour.fr', poste: 'Directrice RH', entreprise: 'Carrefour Market', statut_id: null }),
  lead({ id: '4', nom: 'Abadie', prenom: null, email: null, poste: null, entreprise: null, statut_id: 'a3' }),
];

const f = (p: Partial<FiltresProspection> = {}): FiltresProspection => ({ ...FILTRES_VIDES, ...p });

// ===================== A. LA RECHERCHE GLOBALE =====================

test('A1 les CINQ champs demandes par David, et pas un de plus', () => {
  /*
   * David les a enumeres : Nom, Prenom, Email, Societe, Poste. On verifie LA LISTE
   * elle-meme, pas seulement son effet : un champ ajoute a la table mais oublie dans la
   * recherche ne se decouvrirait autrement qu'a l'usage, le jour ou un lead reste
   * introuvable.
   *
   * `commentaire` et `lien` en sont ABSENTS a dessein : un commentaire peut faire 5 000
   * caracteres, et y chercher ferait remonter des lignes sur un mot enfoui que
   * l'utilisateur ne voit pas.
   */
  assert.deepEqual([...CHAMPS_RECHERCHE], ['nom', 'prenom', 'email', 'entreprise', 'poste']);
  assert.ok(!CHAMPS_RECHERCHE.includes('commentaire' as never),
    'le commentaire ne doit pas entrer dans la recherche globale');
});

test('A2 chacun des cinq champs est reellement atteint', () => {
  /* Un par un : declarer la liste ne suffit pas, encore faut-il que la fonction la lise. */
  assert.equal(correspondARecherche(LEADS[0], 'Lemétayer'), true, 'nom');
  assert.equal(correspondARecherche(LEADS[0], 'Rémy'), true, 'prenom');
  assert.equal(correspondARecherche(LEADS[0], 'remy@carrefour'), true, 'email');
  assert.equal(correspondARecherche(LEADS[0], 'Carrefour'), true, 'entreprise');
  assert.equal(correspondARecherche(LEADS[0], 'marketing'), true, 'poste');
  assert.equal(correspondARecherche(LEADS[0], 'introuvable'), false);
});

test('A3 la recherche ignore la casse ET les accents', () => {
  /*
   * CE N'EST PAS UNE COMMODITE. Sur un fichier de prospects francais, chercher
   * « Lemetayer » sans accent doit trouver « Lemétayer » : sinon l'utilisateur conclut
   * que le lead n'existe pas et le ressaisit en double.
   */
  assert.equal(normaliser('Lemétayer'), 'lemetayer');
  assert.equal(normaliser('ÉCARTÉ'), 'ecarte');
  assert.equal(correspondARecherche(LEADS[0], 'lemetayer'), true, 'sans accent');
  assert.equal(correspondARecherche(LEADS[0], 'LEMÉTAYER'), true, 'en majuscules');
  assert.equal(correspondARecherche(LEADS[0], 'remy'), true, 'prenom sans accent');
});

test('A4 une recherche vide ne filtre rien, et un champ absent ne fait pas lever', () => {
  assert.equal(correspondARecherche(LEADS[0], ''), true);
  assert.equal(correspondARecherche(LEADS[0], '   '), true, 'des espaces seuls ne filtrent pas');
  /* Le lead 4 n'a NI prenom, NI email, NI poste, NI entreprise : la fonction doit le
     traverser sans lever, et ne le retenir que sur son nom. */
  assert.equal(correspondARecherche(LEADS[3], 'Abadie'), true);
  assert.equal(correspondARecherche(LEADS[3], 'Carrefour'), false);
});

// ===================== B. LES FILTRES, ET LEUR COMBINAISON =====================

test('B1 chaque filtre pris seul', () => {
  assert.deepEqual(filtrer(LEADS, f({ recherche: 'carrefour' })).map((l) => l.id), ['1', '3']);
  assert.deepEqual(filtrer(LEADS, f({ statut: 'm2' })).map((l) => l.id), ['2']);
  assert.deepEqual(filtrer(LEADS, f({ entreprise: 'leclerc' })).map((l) => l.id), ['2']);
  assert.deepEqual(filtrer(LEADS, f({ poste: 'direct' })).map((l) => l.id), ['1', '3']);
});

test('B2 LES FILTRES SE COMBINENT PAR UN ET, jamais par un OU', () => {
  /*
   * Exigence de David : « les filtres peuvent etre combines entre eux ». Un OU donnerait
   * l'inverse de ce qu'on attend — poser un second filtre ELARGIRAIT la liste, et
   * l'utilisateur verrait apparaitre des lignes en essayant d'en retirer.
   */
  const seul = filtrer(LEADS, f({ entreprise: 'carrefour' }));
  assert.equal(seul.length, 2, 'un filtre : deux lignes');

  const deux = filtrer(LEADS, f({ entreprise: 'carrefour', poste: 'RH' }));
  assert.deepEqual(deux.map((l) => l.id), ['3'], 'deux filtres : une seule ligne');
  assert.ok(deux.length < seul.length, 'ajouter un filtre doit REDUIRE la liste');

  const trois = filtrer(LEADS, f({ recherche: 'claire', entreprise: 'carrefour', statut: SANS_STATUT }));
  assert.deepEqual(trois.map((l) => l.id), ['3'], 'trois filtres combines');

  /* Et une combinaison impossible rend bien le vide, pas la liste entiere. */
  assert.deepEqual(filtrer(LEADS, f({ entreprise: 'leclerc', poste: 'RH' })), []);
});

test('B3 « Sans statut » est un jeton distinct de « tous les statuts »', () => {
  /*
   * '' veut dire « tous ». Si « sans statut » valait aussi '', demander les lignes sans
   * statut rendrait TOUTES les lignes — un filtre qui ne filtre pas, et personne ne
   * comprendrait pourquoi.
   */
  assert.notEqual(SANS_STATUT, '');
  assert.equal(filtrer(LEADS, f({ statut: '' })).length, 4, 'chaine vide = tous');
  assert.deepEqual(filtrer(LEADS, f({ statut: SANS_STATUT })).map((l) => l.id), ['3']);
});

test('B4 Societe et Poste comparent par INCLUSION, pas par egalite', () => {
  /* Ce sont des champs de saisie libre. Exiger « Carrefour » au caractere pres pour
     trouver « Carrefour Market » rendrait le filtre inutilisable. */
  assert.deepEqual(filtrer(LEADS, f({ entreprise: 'Carrefour' })).map((l) => l.id), ['1', '3']);
  assert.deepEqual(filtrer(LEADS, f({ entreprise: 'Carrefour Market' })).map((l) => l.id), ['3']);
});

test('B5 filtresActifs dit la verite, y compris sur des espaces seuls', () => {
  assert.equal(filtresActifs(FILTRES_VIDES), false);
  assert.equal(filtresActifs(f({ recherche: '   ' })), false, 'des espaces ne sont pas un filtre');
  assert.equal(filtresActifs(f({ recherche: 'a' })), true);
  assert.equal(filtresActifs(f({ statut: SANS_STATUT })), true);
});

// ===================== C. LE TRI =====================

test('C1 les CINQ colonnes triables sont celles que David a nommees', () => {
  assert.deepEqual([...COLONNES_TRIABLES], ['nom', 'prenom', 'entreprise', 'poste', 'statut']);
});

test('C2 le tri classe a la francaise : les accents a leur place alphabetique', () => {
  /*
   * « Écarté » commence par É, dont le code est SUPERIEUR a celui de 'z'. Une comparaison
   * brute le rejetterait donc apres « Zoe ». localeCompare('fr') le classe entre 'E' et
   * 'F', ce que l'utilisateur attend. Sur un fichier francais, la difference saute aux
   * yeux des la premiere colonne triee.
   */
  const noms = ['Zoe', 'Écarté', 'Abadie'];
  const tries = trier(noms.map((n, i) => lead({ id: String(i), nom: n })), 'nom', 'asc', STATUTS);
  assert.deepEqual(tries.map((l) => l.nom), ['Abadie', 'Écarté', 'Zoe']);
});

test('C3 LES VIDES FINISSENT DERNIERS, dans les DEUX sens', () => {
  /*
   * Un prenom absent n'est pas une valeur « petite » : c'est une absence. Le laisser
   * remonter en tete du tri croissant mettrait le vide avant l'information — exactement
   * l'inverse de ce qu'on cherche en triant.
   */
  const asc = trier(LEADS, 'prenom', 'asc', STATUTS);
  assert.equal(asc[asc.length - 1].id, '4', 'croissant : le prenom absent est dernier');

  const desc = trier(LEADS, 'prenom', 'desc', STATUTS);
  assert.equal(desc[desc.length - 1].id, '4', 'decroissant AUSSI : le vide reste dernier');
});

test('C4 le tri par statut porte sur le NOM du statut, pas sur son identifiant', () => {
  /*
   * Trier sur un uuid produirait un ordre aleatoire aux yeux de l'utilisateur, alors que
   * l'en-tete lui promet un classement.
   *
   * LES DEUX SENS SONT EPROUVES, et il le faut. Les identifiants (z1, m2, a3) sont poses
   * dans l'ordre INVERSE de leurs noms (A rappeler, Client, Écarté) : trier par nom
   * croissant et trier par identifiant croissant donnent donc des listes differentes.
   * Mais trier par nom DECROISSANT et par identifiant CROISSANT donnent la meme — tester
   * un seul sens laisserait donc passer la moitie des facons de se tromper.
   */
  const asc = trier(LEADS, 'statut', 'asc', STATUTS);
  assert.deepEqual(asc.map((l) => l.id), ['1', '2', '4', '3'],
    'A rappeler, Client, Écarté, puis la ligne sans statut (vide = toujours derniere)');

  const desc = trier(LEADS, 'statut', 'desc', STATUTS);
  assert.deepEqual(desc.map((l) => l.id), ['4', '2', '1', '3'],
    'Écarté, Client, A rappeler, puis la ligne sans statut');
});

test('C5 le tri ne MUTE pas la liste recue', () => {
  /* Array.prototype.sort trie EN PLACE. Muter la liste rendue par l'etat React
     produirait des rendus incoherents, et le defaut serait intermittent. */
  const copie = [...LEADS];
  trier(LEADS, 'nom', 'asc', STATUTS);
  assert.deepEqual(LEADS.map((l) => l.id), copie.map((l) => l.id), 'la liste source est intacte');
});

test('C6 leadsAffiches filtre PUIS trie', () => {
  const r = leadsAffiches(LEADS, f({ entreprise: 'carrefour' }), 'nom', 'asc', STATUTS);
  assert.deepEqual(r.map((l) => l.id), ['3', '1'], 'Bernard avant Lemétayer, et Leclerc exclu');
});

// ===================== D. LA SELECTION, ET SA REGLE D'OR =====================

test('D1 LA CASE D EN-TETE NE PORTE QUE LES LIGNES VISIBLES', () => {
  /*
   * EXIGENCE EXPLICITE DE DAVID : « une checkbox dans l'en-tete pour selectionner tous
   * les leads ACTUELLEMENT VISIBLES ».
   *
   * LE DEFAUT INVERSE EXISTE DANS CE DEPOT, et c'est ce qui rend ce relevé necessaire :
   * le toggleAll de ListeVendeurs.tsx — par ailleurs le meilleur gabarit du panel —
   * selectionne TOUS les enregistrements, pas les lignes affichees. Avec des filtres, sa
   * case d'en-tete coche donc des lignes INVISIBLES, et un « Supprimer la selection » en
   * detruirait plus que ce que l'utilisateur voit.
   */
  const affiches = leadsAffiches(LEADS, f({ entreprise: 'carrefour' }), 'nom', 'asc', STATUTS);
  assert.equal(affiches.length, 2, 'le filtre laisse deux lignes sur quatre');

  const ids = idsSelectionnables(affiches);
  assert.deepEqual(ids.sort(), ['1', '3'], 'seules les deux lignes visibles');
  assert.ok(!ids.includes('2'), 'Leclerc est masque par le filtre : il ne doit PAS etre selectionnable');
  assert.ok(!ids.includes('4'), 'Abadie est masque : il ne doit PAS etre selectionnable');
});

test('D2 l etat de la case : vide, partielle, toute', () => {
  const affiches = leadsAffiches(LEADS, FILTRES_VIDES, 'nom', 'asc', STATUTS);
  assert.equal(etatCaseEnTete(affiches, new Set()), 'vide');
  assert.equal(etatCaseEnTete(affiches, new Set(['1'])), 'partielle');
  assert.equal(etatCaseEnTete(affiches, new Set(['1', '2', '3', '4'])), 'toute');
  /* Une liste vide n'est pas « toute selectionnee » : sans ce cas, la case d'en-tete
     s'afficherait cochee sur un tableau vide. */
  assert.equal(etatCaseEnTete([], new Set()), 'vide');
});

test('D3 une selection faite AVANT un filtre ne rend pas la case « toute »', () => {
  /* On coche les quatre, puis on filtre : deux lignes restent visibles et les deux
     autres sont toujours dans le Set. La case doit dire « toute » pour les visibles —
     c'est exact — mais la SUPPRESSION ne doit toucher que ces deux-la (voir E1). */
  const tout = new Set(['1', '2', '3', '4']);
  const affiches = leadsAffiches(LEADS, f({ entreprise: 'carrefour' }), 'nom', 'asc', STATUTS);
  assert.equal(etatCaseEnTete(affiches, tout), 'toute');
  assert.deepEqual(idsASupprimer(affiches, tout).sort(), ['1', '3']);
});

// ===================== E. LA SUPPRESSION =====================

test('E1 LA SUPPRESSION N EMPORTE QUE CE QUI EST VISIBLE ET COCHE', () => {
  /*
   * « Aucune suppression de leads non selectionnes », a ecrit David. Le piege n'est pas
   * la selection elle-meme : c'est qu'un `Set` SURVIT aux changements de filtre. Il peut
   * donc contenir des identifiants que l'utilisateur ne voit plus — voire, en Visu, des
   * lignes d'une autre Societe chargees avant un changement de contexte.
   *
   * On intersecte donc la selection avec ce qui est REELLEMENT affiche. C'est la premiere
   * des trois protections ; les deux autres sont le `.eq('company_id', ...)` de la
   * requete et la RLS.
   */
  const affiches = leadsAffiches(LEADS, f({ entreprise: 'carrefour' }), 'nom', 'asc', STATUTS);
  const selectionPerimee = new Set(['1', '2', '4', 'id-d-une-autre-societe']);
  const cibles = idsASupprimer(affiches, selectionPerimee);

  assert.deepEqual(cibles, ['1'], 'seule la ligne a la fois VISIBLE et COCHEE');
  assert.ok(!cibles.includes('2'), 'cochee mais masquee : epargnee');
  assert.ok(!cibles.includes('4'), 'cochee mais masquee : epargnee');
  assert.ok(!cibles.includes('id-d-une-autre-societe'), 'un id etranger ne peut pas passer');
});

test('E2 une selection vide ne supprime rien', () => {
  const affiches = leadsAffiches(LEADS, FILTRES_VIDES, 'nom', 'asc', STATUTS);
  assert.deepEqual(idsASupprimer(affiches, new Set()), []);
});

// ===================== F. LE LIEN =====================

test('F1 seuls http et https sont ouvrables', () => {
  /*
   * Le lien est rendu dans un <a href> ouvert dans un nouvel onglet, a la demande de
   * David. Une valeur `javascript:` ou `data:text/html,` y deviendrait du code execute
   * AU CLIC, dans la session de qui ouvre le tableau — donc avec son jeton et ses droits.
   * La base le refuse deja (contrainte crm_prospection_leads_lien_http) ; ceci est le
   * second garde-fou, pour les lignes arrivees par un autre chemin (restauration de
   * sauvegarde, ecriture directe).
   */
  assert.equal(lienOuvrable('https://www.linkedin.com/in/x'), true);
  assert.equal(lienOuvrable('http://exemple.fr'), true);
  assert.equal(lienOuvrable('HTTPS://EXEMPLE.FR'), true, 'la casse du schema ne compte pas');
  assert.equal(lienOuvrable('javascript:alert(1)'), false);
  assert.equal(lienOuvrable('data:text/html,<script>'), false);
  assert.equal(lienOuvrable('  javascript:alert(1)'), false, 'des espaces en tete ne doivent pas masquer le schema');
  assert.equal(lienOuvrable('exemple.fr'), false, 'sans schema, on ne devine pas');
  assert.equal(lienOuvrable(null), false);
  assert.equal(lienOuvrable(''), false);
});

test('F2 l affichage montre l hote, pas l URL entiere', () => {
  assert.equal(hoteDuLien('https://www.linkedin.com/in/marie-dupont-123456'), 'linkedin.com');
  assert.equal(hoteDuLien('https://instagram.com/compte'), 'instagram.com');
  /* Une adresse illisible est rendue TELLE QUELLE plutot que rien : l'utilisateur voit
     ce qui est enregistre, et peut le corriger. */
  assert.equal(hoteDuLien('pas une url'), 'pas une url');
});

// ===================== G. LE COMMENTAIRE =====================

test('G1 un commentaire long est tronque et ne fait pas grandir la ligne', () => {
  /* Demande explicite de David : « eviter qu'un long commentaire agrandisse enormement
     la ligne ». Les retours a la ligne sont ecrases : sans cela, un commentaire sur
     quatre lignes donnerait une ligne de tableau quatre fois plus haute. */
  const long = 'a'.repeat(200);
  assert.equal(commentaireTronque(long), true);
  const apercu = apercuCommentaire(long);
  assert.ok(apercu.length <= COMMENTAIRE_APERCU + 1, `l apercu fait ${apercu.length} caracteres`);
  assert.ok(apercu.endsWith('…'), 'la troncature se voit');

  const multi = 'Premiere ligne\nDeuxieme ligne\nTroisieme';
  assert.ok(!apercuCommentaire(multi).includes('\n'), 'aucun retour a la ligne ne survit a l apercu');
});

test('G2 un commentaire court passe entier, sans points de suspension', () => {
  assert.equal(commentaireTronque('Rappeler en janvier'), false);
  assert.equal(apercuCommentaire('Rappeler en janvier'), 'Rappeler en janvier');
  assert.equal(apercuCommentaire(null), '');
  assert.equal(apercuCommentaire('   '), '');
});
