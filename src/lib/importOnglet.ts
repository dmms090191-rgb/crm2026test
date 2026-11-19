import { cleCanonique, estCleReservee, type CleSysteme, type TypeColonne } from './entetesImport';

/**
 * L'IMPORT D'UN FICHIER DANS UN ONGLET DE COLONNES — l'orchestration, sans React.
 *
 * Deux procedures en base (migration 20261119073610) :
 *   1. `crm_import_preparer` : cree ou verifie l'onglet, enregistre les colonnes du fichier
 *      dans le registre, les rattache a l'onglet dans l'ordre du fichier, cree l'historique ;
 *   2. `crm_import_lot`, par LOTS : chaque ligne est inseree ou fusionnee puis rattachee,
 *      dans sa propre sous-transaction — une ligne en erreur n'emporte jamais son lot.
 *
 * Aucun aller-retour PAR LIGNE : l'ancien mode « mettre a jour » lisait puis ecrivait chaque
 * doublon un par un (deux requetes par ligne). Ici, 5 000 lignes font 100 appels de 50.
 *
 * Chaque lot porte un IDENTIFIANT : renvoye apres une coupure, il rend son resultat d'origine
 * sans rien refaire (migration 20261119091523). Un lot que la base refuse deux fois est
 * renvoye LIGNE PAR LIGNE : une seule cellule illisible n'arrete plus tout l'import.
 *
 * Le client n'est pas un juge : les doublons, la fusion et les droits sont decides en base,
 * sous la RLS de l'appelant (procedures SECURITY INVOKER). L'apercu ne fait qu'annoncer.
 */

export type ModeImport = 'ignorer' | 'completer' | 'mettre_a_jour';

export const MODES_IMPORT: readonly ModeImport[] = ['ignorer', 'completer', 'mettre_a_jour'];

export const LIBELLES_MODE: Record<string, string> = {
  ignorer: 'Ignorer les doublons',
  completer: 'Compléter les doublons',
  mettre_a_jour: 'Mettre à jour les doublons',
  /* Les anciens imports de l'historique gardent leur libelle. */
  ignore: 'Ignorer les doublons',
  update: 'Mettre à jour les doublons',
  force: "Forcer l'import",
};

/**
 * 50 lignes par appel. Chaque ligne est une sous-transaction (une ligne en erreur n'emporte
 * pas le lot) ; au-dela de 64 sous-transactions qui ecrivent dans UNE transaction, Postgres
 * deborde son cache de sous-transactions et ralentit les lectures de TOUTE la base pendant
 * l'appel (releve de la relecture du 19/11). 50 reste en dessous, a ~150 ms par appel.
 */
export const TAILLE_LOT = 50;

/** Ce que l'apercu a decide pour une colonne du fichier. */
export interface PlanColonne {
  entete: string;
  /** La colonne alimente une colonne standard du CRM. */
  cleSysteme?: CleSysteme;
  /** Rattachement CHOISI a une colonne existante du registre (accents seuls differents). */
  colonneId?: string;
  type: TypeColonne;
  /** Aucune valeur dans tout le fichier : la colonne est rattachee masquee. */
  vide: boolean;
}

export interface LigneAImporter {
  /** Rang de la ligne dans le fichier (0 = premiere ligne de donnees). */
  index: number;
  raw: Record<string, string>;
  prenom: string;
  nom: string;
  email: string | null;
  telephone: string | null;
}

export type ChoixOnglet = { ongletId: string } | { nouveauNom: string };

export interface ResultatImport {
  ongletId: string | null;
  importId: string | null;
  crees: number;
  completes: number;
  inchanges: number;
  lies: number;
  erreurs: { index: number; code: string; message: string }[];
  conflits: { index: number; champ: string }[];
  reaffichees: string[];
  traitees: number;
  /** Message si l'import s'est arrete avant la fin. Les lots deja passes sont conserves. */
  interrompu: string | null;
}

export type AppelRpc = (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string; code?: string } | null }>;

/** Un identifiant de lot. crypto.randomUUID existe dans tous les navigateurs pris en charge. */
const nouvelIdLot = (): string => globalThis.crypto.randomUUID();

interface ReponsePreparer {
  onglet_id: string;
  import_id: string;
  colonnes: { entete: string; cle_systeme?: string; colonne_id?: string; cle_data?: string }[];
  reaffichees: string[];
}

interface ReponseLot {
  crees: number;
  inchanges: number;
  completes: number;
  lies: number;
  erreurs: { i: number; code: string; message: string }[];
  conflits: { i: number; champ: string }[];
}

/** Le texte d'une erreur de preparation, compris par quelqu'un qui n'a jamais vu de SQL. */
export function messagePreparation(e: { message: string; code?: string }): string {
  if (e.code === '23505' || /deja ce nom/i.test(e.message)) return 'Un onglet porte déjà ce nom. Choisissez-en un autre ou ajoutez à l\'onglet existant.';
  if (/principal/i.test(e.message)) return '« Principal » est réservé : choisissez un autre nom d\'onglet.';
  /* Une autre contrainte (un en-tete ou un nom trop long, une valeur refusee) : on le dit tel
     quel plutot que de pretendre que le nom « Principal » est en cause. */
  if (e.code === '23514') return 'Une valeur du fichier n\'est pas acceptée (en-tête ou nom trop long ?) : ' + e.message;
  if (e.code === '42501' || /row-level security|permission/i.test(e.message)) return 'Vos droits ne permettent pas cet import.';
  if (/introuvable ou archive/i.test(e.message)) return 'Cet onglet n\'existe plus ou a été archivé.';
  return e.message;
}

/**
 * Construit la ligne envoyee a `crm_import_lot`. Les cles de `data` sont celles du REGISTRE
 * (une colonne « facebook » rapprochee de « Facebook » ecrit sous « Facebook ») ; les
 * colonnes standard gardent leur en-tete d'origine dans `data`, pour que rien du fichier ne
 * se perde. Les cles reservees (PIN, commentaires...) ne partent jamais — sauf le PIN, a
 * part, que la base ne retient que s'il fait six chiffres.
 */
export function ligneVersLot(l: LigneAImporter, cles: Map<string, string>, entetePin: string | null, cleEmail: string | null = null) {
  const data: Record<string, string> = {};
  for (const [entete, cle] of cles) {
    const v = (l.raw[entete] ?? '').trim();
    /* Deux en-tetes du fichier ne doivent jamais viser la meme cle (l'apercu l'empeche) ;
       si cela arrivait, la premiere valeur non vide est gardee plutot qu'ecrasee. */
    if (v !== '' && !(cle in data)) data[cle] = v;
  }
  const pin = entetePin ? (l.raw[entetePin] ?? '').trim() : '';
  return {
    i: l.index,
    prenom: l.prenom || null,
    nom: l.nom || null,
    email: l.email,
    telephone: l.telephone,
    data,
    ...(pin ? { pin } : {}),
    /* La cle de data ou le fichier range l'EMAIL : la base ne l'ecrit jamais dans un lead
       qui a deja un email (plat ou dans data), quel que soit le mode. */
    ...(cleEmail ? { cle_email: cleEmail } : {}),
  };
}

/**
 * Un email que le fichier ecrit mal (« n/a », « - », deux adresses) ne part JAMAIS sous la cle
 * de l'email : il y passerait pour l'email du lead. Il est conserve, a part, sous
 * « <en-tete> (invalide) ».
 */
function ecarterEmailInvalide(l: ReturnType<typeof ligneVersLot>, cleEmail: string | null) {
  if (!cleEmail || l.email || !(cleEmail in l.data)) return l;
  const { [cleEmail]: brute, ...reste } = l.data;
  return { ...l, data: { ...reste, [`${cleEmail} (invalide)`]: brute } };
}

export async function importerDansOnglet(opts: {
  rpc: AppelRpc;
  companyId: string;
  choix: ChoixOnglet;
  mode: ModeImport;
  plan: PlanColonne[];
  lignes: LigneAImporter[];
  fichier: { nom: string; entetes: string[]; totalLignes: number; erreursAvant: number };
  onProgression?: (faites: number, total: number) => void;
  taille?: number;
}): Promise<ResultatImport> {
  const { rpc, companyId, choix, mode, plan, lignes, fichier, onProgression } = opts;
  const taille = opts.taille ?? TAILLE_LOT;
  const res: ResultatImport = {
    ongletId: null, importId: null, crees: 0, completes: 0, inchanges: 0, lies: 0,
    erreurs: [], conflits: [], reaffichees: [], traitees: 0, interrompu: null,
  };

  const colonnes = plan
    .filter(p => p.cleSysteme || !estCleReservee(p.entete))
    .map(p => ({
      entete: p.entete,
      ...(p.cleSysteme ? { cle_systeme: p.cleSysteme } : {}),
      ...(p.colonneId ? { colonne_id: p.colonneId } : {}),
      type: p.type,
      vide: p.vide,
    }));

  const prep = await rpc('crm_import_preparer', {
    p_company_id: companyId,
    p_onglet_id: 'ongletId' in choix ? choix.ongletId : null,
    p_onglet_nom: 'nouveauNom' in choix ? choix.nouveauNom.trim() : null,
    p_colonnes: colonnes,
    p_import: {
      file_name: fichier.nom, lead_count: fichier.totalLignes, columns: fichier.entetes,
      errors_count: fichier.erreursAvant, import_mode: mode,
    },
  });
  if (prep.error || !prep.data) {
    res.interrompu = prep.error ? messagePreparation(prep.error) : 'Réponse vide de la base.';
    return res;
  }
  const p = prep.data as ReponsePreparer;
  res.ongletId = p.onglet_id;
  res.importId = p.import_id;
  res.reaffichees = Array.isArray(p.reaffichees) ? p.reaffichees : [];

  /* en-tete du fichier -> cle dans leads.data */
  const cles = new Map<string, string>();
  for (const c of p.colonnes ?? []) {
    if (c.cle_systeme) cles.set(c.entete, c.entete);
    else if (c.cle_data) cles.set(c.entete, c.cle_data);
  }
  const entetePin = fichier.entetes.find(e => cleCanonique(e) === 'motdepasse') ?? null;
  const enteteEmail = plan.find(p => p.cleSysteme === 'email')?.entete ?? null;
  const cleEmail = enteteEmail ? cles.get(enteteEmail) ?? null : null;

  const cumuler = (d: ReponseLot) => {
    res.crees += d.crees;
    res.completes += d.completes;
    res.inchanges += d.inchanges;
    res.lies += d.lies;
    for (const e of d.erreurs ?? []) res.erreurs.push({ index: e.i, code: e.code, message: e.message });
    for (const c of d.conflits ?? []) res.conflits.push({ index: c.i, champ: c.champ });
  };
  /* Un envoi, et un second essai avec le MEME identifiant : si le premier a abouti mais que
     la reponse s'est perdue, la base rend le resultat d'origine au lieu de tout recompter. */
  const envoyer = async (lot: LigneAImporter[]) => {
    const args = {
      p_company_id: companyId, p_import_id: p.import_id, p_onglet_id: p.onglet_id, p_mode: mode,
      p_lignes: lot.map(l => ecarterEmailInvalide(ligneVersLot(l, cles, entetePin, cleEmail), cleEmail)),
      p_lot: nouvelIdLot(),
    };
    let r = await rpc('crm_import_lot', args);
    /* Erreur SANS code (coupure, delai) : le sort du lot est inconnu. On renvoie le MEME
       identifiant, avec une attente croissante ; la base rend le resultat s'il a abouti. */
    for (const attente of [1000, 3000]) {
      if (!r.error || r.error.code) break;
      await new Promise(f => setTimeout(f, attente));
      r = await rpc('crm_import_lot', args);
    }
    return r;
  };
  /* Erreurs propres a une LIGNE (valeur illisible, trop longue, contrainte) : seul cas ou
     renvoyer le lot ligne par ligne a un sens. Tout le reste (onglet archive, droits,
     surcharge du serveur, coupure) toucherait chaque ligne pareil : on s'arrete et on le dit. */
  const erreurDeLigne = (code: string | undefined) => !!code && /^(22P0[25]|22001|22007|22008|2202[0-9]|23[0-9]{3})$/.test(code) && code !== '22023';

  const total = lignes.length;
  onProgression?.(0, total);
  for (let de = 0; de < total && !res.interrompu; de += taille) {
    const lot = lignes.slice(de, de + taille);
    const r = await envoyer(lot);
    if (!r.error && r.data) {
      cumuler(r.data as ReponseLot);
    } else if (!erreurDeLigne(r.error?.code)) {
      res.interrompu = `Import interrompu à la ligne ${lot[0].index + 1} : ${r.error ? messagePreparation(r.error) : 'réponse vide'}. `
        + `Les lignes précédentes sont enregistrées ; relancez l'import du même fichier pour la suite (les leads déjà créés seront reconnus).`;
      break;
    } else {
      /* LA BASE REFUSE LE LOT ENTIER (une cellule illisible, par exemple) : on le renvoie
         ligne par ligne, et seule la ligne fautive est mise en erreur. Une erreur SANS code
         de la base est une coupure : apres trois de suite, on s'arrete et on le dit. */
      let coupures = 0;
      for (const ligne of lot) {
        const r1 = await envoyer([ligne]);
        if (!r1.error && r1.data) { cumuler(r1.data as ReponseLot); coupures = 0; continue; }
        if (r1.error?.code) {
          res.erreurs.push({ index: ligne.index, code: r1.error.code, message: r1.error.message });
          coupures = 0;
          continue;
        }
        if (++coupures >= 3) {
          res.interrompu = `Import interrompu à la ligne ${ligne.index + 1} : ${r1.error?.message ?? 'réponse vide'}. `
            + `Les lignes précédentes sont enregistrées ; relancez l'import du même fichier pour la suite (les leads déjà créés seront reconnus).`;
          break;
        }
        res.erreurs.push({ index: ligne.index, code: 'reseau', message: r1.error?.message ?? 'Réponse vide' });
      }
    }
    if (!res.interrompu) {
      res.traitees += lot.length;
      onProgression?.(res.traitees, total);
    }
  }
  return res;
}
