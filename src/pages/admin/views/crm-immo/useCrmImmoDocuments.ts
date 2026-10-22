import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../../../lib/supabase';
import { lireToutesLesLignes } from '../../../../lib/lectureIntegrale';
import { useCompanyId } from '../../../../hooks/useCompanyId';
import { preparerPourEnvoi } from '../../../../lib/crmImmoConversion';
import {
  problemeDeFichier, typeDeclare, extensionPourType, cheminDocument,
  problemeDeSignature, typeDesOctets, OCTETS_DEBUT, OCTETS_FIN,
} from '../../../../lib/crmImmoDocuments';
import type { OperationsSuppressionDossier } from '../../../../lib/crmImmoSuppressionDossier';

/**
 * LES DOCUMENTS D'UN DOSSIER — seul endroit qui parle a `crm_immo_documents`,
 * a `crm_immo_classeurs` et au bucket prive `crm-immo-documents`.
 *
 * ---------- UNE ECRITURE REFUSEE NE LEVE AUCUNE ERREUR ----------
 *
 * Le piege central de supabase-js, deja rencontre quatre fois dans ce module : un INSERT,
 * un UPDATE ou un DELETE que la RLS refuse rend `{ error: null }` et ZERO ligne. Chaque
 * ecriture finit donc par un `.select()`, et zero ligne est traite comme l'echec que
 * c'est.
 *
 * ---------- DEUX SYSTEMES, DONC PAS DE TRANSACTION ----------
 *
 * Une ligne de base et un objet Storage ne peuvent pas etre ecrits ensemble. On ne peut
 * donc pas rendre l'operation atomique ; on peut seulement rendre tout etat intermediaire
 * VISIBLE et la reprise CONVERGENTE. C'est le role de `statut`.
 *
 * A LA CREATION : la ligne d'abord, les octets ensuite.
 *   L'autorisation est ainsi tranchee AVANT que les octets ne bougent — la cle etrangere
 *   composee et la RLS refusent un dossier_id etranger sans qu'un seul octet soit monte.
 *   Et la compensation est fiable : supprimer une ligne qu'on vient de creer reussit
 *   presque toujours, alors que supprimer un objet Storage sur un reseau mobile
 *   defaillant — le cas frequent — ne reussit pas.
 *
 * A LA SUPPRESSION : l'intention d'abord, les octets ensuite, la ligne en dernier.
 *   C'est le seul ordre dont l'etat residuel soit visible ET convergent. L'ordre inverse
 *   laisserait un fichier orphelin, invisible, inaccessible et facture. `remove` etant
 *   idempotent, une reprise aboutit toujours.
 *
 * ---------- getPublicUrl N'APPARAIT PAS ICI, ET C'EST VOLONTAIRE ----------
 *
 * Sur un bucket prive, getPublicUrl ne leve AUCUNE erreur et rend une URL bien formee qui
 * echoue seulement au rendu de l'image : le defaut paraitrait venir de l'envoi alors
 * qu'il viendrait de la lecture. Toute lecture passe par une URL signee de courte duree,
 * creee a la demande et jamais stockee.
 */

export const BUCKET_DOCUMENTS = 'crm-immo-documents';

/** Combien de temps une URL signee reste valable. Assez pour ouvrir ou telecharger, trop
 *  peu pour etre partagee utilement si elle fuite. */
export const SECONDES_URL_SIGNEE = 120;

export interface DocumentImmo {
  id: string;
  company_id: string;
  dossier_id: string;
  classeur_id: string | null;
  nom_affiche: string;
  chemin: string;
  mime: string;
  taille: number;
  statut: 'en_cours' | 'pret' | 'suppression';
  mime_origine: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
}

export interface ClasseurImmo {
  id: string;
  company_id: string;
  dossier_id: string;
  nom: string;
  created_at: string;
  created_by: string | null;
  updated_at: string;
}

/** L'etat d'un envoi en cours. Pas de pourcentage : voir plus bas. */
export interface EtatEnvoi {
  enCours: boolean;
  fait: number;
  total: number;
  nom: string;
}

const ENVOI_AU_REPOS: EtatEnvoi = { enCours: false, fait: 0, total: 0, nom: '' };

const CHAMPS_DOC = 'id,company_id,dossier_id,classeur_id,nom_affiche,chemin,mime,taille,statut,mime_origine,created_at,created_by,updated_at';
const CHAMPS_CLASSEUR = 'id,company_id,dossier_id,nom,created_at,created_by,updated_at';

export interface EtatDocuments {
  documents: DocumentImmo[];
  classeurs: ClasseurImmo[];
  chargement: boolean;
  erreur: string;
  envoi: EtatEnvoi;
  /** Les avertissements du dernier envoi — conversion non aboutie, HEIC conserve. */
  avertissements: string[];
  ajouter: (fichiers: File[], classeurId: string | null) => Promise<void>;
  renommer: (id: string, nom: string) => Promise<{ error: string | null }>;
  deplacer: (id: string, classeurId: string | null) => Promise<{ error: string | null }>;
  supprimer: (id: string) => Promise<{ error: string | null }>;
  creerClasseur: (nom: string) => Promise<{ error: string | null }>;
  renommerClasseur: (id: string, nom: string) => Promise<{ error: string | null }>;
  supprimerClasseur: (id: string) => Promise<{ error: string | null }>;
  urlSignee: (id: string) => Promise<{ url: string | null; error: string | null }>;
  /** Les URL signees de plusieurs chemins, en un seul appel. Cle = chemin. */
  urlsMiniatures: (chemins: string[]) => Promise<Record<string, string>>;
  recharger: () => Promise<void>;
  oublierAvertissements: () => void;
}

export function useCrmImmoDocuments(dossierId: string | null): EtatDocuments {
  const companyId = useCompanyId();
  const [documents, setDocuments] = useState<DocumentImmo[]>([]);
  const [classeurs, setClasseurs] = useState<ClasseurImmo[]>([]);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState<EtatEnvoi>(ENVOI_AU_REPOS);
  const [avertissements, setAvertissements] = useState<string[]>([]);

  /* Un envoi en cours ne doit pas etre relance par un second clic : le bouton est
     desactive, mais un clavier ou un double evenement passerait outre. */
  const envoiEnCours = useRef(false);

  const recharger = useCallback(async () => {
    if (!dossierId || !companyId) {
      setDocuments([]); setClasseurs([]); setChargement(false);
      return;
    }
    setChargement(true);

    /*
     * PAGINEES toutes les deux. Des photos s'accumulent bien plus vite que des
     * commentaires : un dossier suivi quelques annees depasse le millier de lignes, et
     * PostgREST tronque alors la reponse SANS erreur. On ne lit QUE ce dossier, jamais
     * toute la Societe.
     */
    const [docs, cls] = await Promise.all([
      lireToutesLesLignes<DocumentImmo>((de, a) =>
        supabase
          .from('crm_immo_documents')
          .select(CHAMPS_DOC, { count: 'exact' })
          .eq('dossier_id', dossierId)
          .order('id')
          .range(de, a)),
      lireToutesLesLignes<ClasseurImmo>((de, a) =>
        supabase
          .from('crm_immo_classeurs')
          .select(CHAMPS_CLASSEUR, { count: 'exact' })
          .eq('dossier_id', dossierId)
          .order('id')
          .range(de, a)),
    ]);

    if (docs.error) { setErreur(docs.error.message); setDocuments([]); }
    else {
      /* Du plus recent au plus ancien : on vient voir ce qu'on a ajoute. Le tri se fait
         ici parce que la lecture, elle, doit etre ordonnee par `id` pour que la
         pagination soit stable. */
      const liste = [...(docs.data ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at));
      setDocuments(liste);
    }
    if (cls.error) { setErreur(cls.error.message); setClasseurs([]); }
    else {
      setClasseurs([...(cls.data ?? [])].sort((a, b) => a.nom.localeCompare(b.nom, 'fr')));
    }
    if (!docs.error && !cls.error) setErreur('');
    setChargement(false);
  }, [dossierId, companyId]);

  useEffect(() => { void recharger(); }, [recharger]);

  /* ---------------------------------------------------------------------------
   * AJOUTER
   * ------------------------------------------------------------------------- */

  const ajouter = useCallback(async (fichiers: File[], classeurId: string | null) => {
    if (!dossierId || !companyId) { setErreur('Dossier introuvable.'); return; }
    if (fichiers.length === 0) return;
    if (envoiEnCours.current) return;
    envoiEnCours.current = true;

    const soucis: string[] = [];
    const ajoutes: DocumentImmo[] = [];
    setEnvoi({ enCours: true, fait: 0, total: fichiers.length, nom: fichiers[0]?.name ?? '' });

    try {
      for (let i = 0; i < fichiers.length; i++) {
        const fichier = fichiers[i];
        setEnvoi({ enCours: true, fait: i, total: fichiers.length, nom: fichier.name });

        /*
         * PAS DE POURCENTAGE D'OCTETS, et ce n'est pas un choix de confort :
         * @supabase/supabase-js televerse par `fetch`, sans onUploadProgress ni XHR. La
         * derniere version stable ne l'a pas davantage. Une barre qui avance serait donc
         * une animation inventee. On annonce << fichier N sur M >>, ce qui est vrai.
         */

        const probleme = problemeDeFichier(fichier);
        if (probleme !== '') { soucis.push(`${fichier.name} : ${probleme}`); continue; }

        const annonce = typeDeclare(fichier.name, fichier.type);

        /*
         * CE SONT LES OCTETS QUI DISENT LE TYPE, avant que quoi que ce soit ne parte.
         *
         * `allowed_mime_types` de Supabase compare le Content-Type ANNONCE, jamais le
         * contenu : un .exe renomme .pdf passait entierement. On lit donc les deux bouts
         * du fichier — la tete porte la signature de tous les formats, la fin est
         * necessaire au seul DOCX, dont le catalogue ZIP vit a la fin. Lire deux tranches
         * coute une lecture disque, pas un transfert reseau.
         *
         * Et c'est le CONTENU qui tranche, pas le nom. Un iPhone peut livrer un JPEG en
         * gardant le nom `IMG_0042.HEIC` avec un file.type vide : se fier a l'extension
         * ferait refuser un fichier valide, et un faux refus fait perdre un document.
         */
        const lu = await (async () => {
          try {
            const debut = new Uint8Array(await fichier.slice(0, OCTETS_DEBUT).arrayBuffer());
            const fin = fichier.size > OCTETS_FIN
              ? new Uint8Array(await fichier.slice(fichier.size - OCTETS_FIN).arrayBuffer())
              : debut;
            return { type: typeDesOctets(debut, fin), debut, fin, error: '' };
          } catch {
            /* Un fichier devenu illisible entre la selection et la lecture — le cas d'une
               photo retiree de la pellicule entre-temps. On refuse en le disant. */
            return { type: '', debut: new Uint8Array(0), fin: new Uint8Array(0),
                     error: 'Ce fichier n’a pas pu être lu. Il a peut-être été déplacé ou supprimé.' };
          }
        })();
        if (lu.error !== '') { soucis.push(`${fichier.name} : ${lu.error}`); continue; }

        if (lu.type === '') {
          /* Les octets ne ressemblent a aucun format accepte. problemeDeSignature
             formule le refus avec le type ANNONCE, donc dans les mots de l'utilisateur :
             << annonce un PDF, mais son contenu n'en est pas un >>. */
          const dit = problemeDeSignature(annonce, lu.debut, lu.fin);
          soucis.push(`${fichier.name} : ${dit !== '' ? dit : 'Ce format n’est pas reconnu.'}`);
          continue;
        }

        /* Les octets gagnent. Quand ils contredisent le nom, on le DIT plutot que de
           corriger en douce : le fichier sera enregistre sous son vrai type. */
        const type = lu.type;
        if (type !== annonce) {
          soucis.push(`${fichier.name} : ce fichier est en réalité un ${type}, et il a été enregistré comme tel.`);
        }
        const pret = await preparerPourEnvoi(fichier, type);
        if (pret.avertissement !== '') soucis.push(`${fichier.name} : ${pret.avertissement}`);

        /* La taille a pu changer : c'est celle qui PART qui doit etre enregistree, et
           c'est elle que le CHECK de la table et le bucket vont borner. */
        if (pret.donnees.size > 15_728_640) {
          soucis.push(`${fichier.name} : trop volumineux même après conversion.`);
          continue;
        }

        const extension = extensionPourType(pret.type);
        const id = crypto.randomUUID();
        const chemin = cheminDocument(companyId, dossierId, id, extension);

        /* 1. LA LIGNE D'ABORD. Un dossier_id etranger est refuse ici, avant tout octet. */
        const { data: creees, error: erreurLigne } = await supabase
          .from('crm_immo_documents')
          .insert({
            id,
            company_id: companyId,
            dossier_id: dossierId,
            classeur_id: classeurId,
            nom_affiche: fichier.name.slice(0, 200),
            chemin,
            mime: pret.type,
            taille: pret.donnees.size,
            statut: 'en_cours',
            mime_origine: pret.typeOrigine,
          })
          .select(CHAMPS_DOC);

        if (erreurLigne) { soucis.push(`${fichier.name} : ${erreurLigne.message}`); continue; }
        const ligne = (creees ?? [])[0] as DocumentImmo | undefined;
        if (ligne === undefined) { soucis.push(`${fichier.name} : ajout refusé, droits insuffisants.`); continue; }

        /* 2. LES OCTETS. contentType est TOUJOURS pose explicitement : le defaut de
           supabase-js porte un parametre de charset, et un Content-Type parametre peut
           faire echouer la liste de types du bucket avec un code qui ne parle pas du
           fichier. upsert reste a false : un chemin deja pris doit etre une erreur
           visible, pas un ecrasement. */
        const { error: erreurEnvoi } = await supabase.storage
          .from(BUCKET_DOCUMENTS)
          .upload(chemin, pret.donnees, { contentType: pret.type, upsert: false });

        if (erreurEnvoi) {
          /* COMPENSATION : la ligne qu'on vient de creer repart. Si meme ce retrait
             echoue, la ligne reste en `en_cours` et l'interface l'affiche
             << Envoi incomplet >> avec Supprimer et Réessayer. Jamais de silence. */
          await supabase.from('crm_immo_documents').delete().eq('id', id);
          soucis.push(`${fichier.name} : ${erreurEnvoi.message}`);
          continue;
        }

        /* 3. LE STATUT. Si cet UPDATE echoue, la ligne reste `en_cours` avec son fichier
           present : l'interface le montre, et Réessayer converge. */
        const { data: majs } = await supabase
          .from('crm_immo_documents')
          .update({ statut: 'pret' })
          .eq('id', id)
          .select(CHAMPS_DOC);

        const finale = (majs ?? [])[0] as DocumentImmo | undefined;
        ajoutes.push(finale ?? { ...ligne, statut: 'en_cours' });
      }
    } finally {
      setEnvoi(ENVOI_AU_REPOS);
      envoiEnCours.current = false;
    }

    if (ajoutes.length > 0) {
      setDocuments(prev => [...ajoutes.reverse(), ...prev]);
    }
    setAvertissements(soucis);
  }, [dossierId, companyId]);

  /* ---------------------------------------------------------------------------
   * RENOMMER ET DEPLACER — aucun octet ne circule
   * ------------------------------------------------------------------------- */

  const renommer = useCallback(async (id: string, nom: string) => {
    const propre = nom.trim();
    if (propre === '') return { error: 'Un nom vide ne s’enregistre pas.' };
    if (propre.length > 200) return { error: 'Ce nom dépasse 200 caractères.' };

    /* Le chemin Storage ne bouge PAS : renommer n'est qu'un UPDATE, donc le lien avec le
       fichier ne peut pas se casser. C'est exactement ce que David a demande. */
    const { data, error } = await supabase
      .from('crm_immo_documents')
      .update({ nom_affiche: propre })
      .eq('id', id)
      .select(CHAMPS_DOC);

    if (error) return { error: error.message };
    const ligne = (data ?? [])[0] as DocumentImmo | undefined;
    if (ligne === undefined) return { error: 'Renommage refusé : droits insuffisants.' };
    setDocuments(prev => prev.map(d => (d.id === id ? ligne : d)));
    return { error: null };
  }, []);

  const deplacer = useCallback(async (id: string, classeurId: string | null) => {
    const { data, error } = await supabase
      .from('crm_immo_documents')
      .update({ classeur_id: classeurId })
      .eq('id', id)
      .select(CHAMPS_DOC);

    if (error) return { error: error.message };
    const ligne = (data ?? [])[0] as DocumentImmo | undefined;
    if (ligne === undefined) return { error: 'Déplacement refusé : droits insuffisants.' };
    setDocuments(prev => prev.map(d => (d.id === id ? ligne : d)));
    return { error: null };
  }, []);

  /* ---------------------------------------------------------------------------
   * SUPPRIMER — intention, octets, ligne
   * ------------------------------------------------------------------------- */

  const supprimer = useCallback(async (id: string) => {
    const vise = documents.find(d => d.id === id);
    if (vise === undefined) return { error: 'Document introuvable.' };

    /* 1. L'INTENTION, enregistree avant tout. Si elle echoue, rien n'a bouge. */
    const { data: marquees, error: erreurMarque } = await supabase
      .from('crm_immo_documents')
      .update({ statut: 'suppression' })
      .eq('id', id)
      .select('id');
    if (erreurMarque) return { error: erreurMarque.message };
    if ((marquees ?? []).length === 0) return { error: 'Suppression refusée : droits insuffisants.' };

    setDocuments(prev => prev.map(d => (d.id === id ? { ...d, statut: 'suppression' } : d)));

    /* 2. LES OCTETS, et on LIT le resultat. Les quatre appels a remove() deja presents
       dans le projet ignorent le leur : un document retire de l'interface mais reste dans
       Storage demeure facture et hors de portee de toute suppression ulterieure. */
    const { error: erreurStorage } = await supabase.storage
      .from(BUCKET_DOCUMENTS)
      .remove([vise.chemin]);

    if (erreurStorage) {
      return { error: `Le fichier n’a pas pu être retiré du stockage : ${erreurStorage.message}. Le document reste marqué « suppression incomplète » ; réessayez.` };
    }

    /* 3. LA LIGNE. Si ce DELETE echoue, la ligne reste en `suppression` sans son fichier :
       l'interface le montre, et comme remove() est idempotent, Réessayer aboutit. */
    const { data: supprimees, error: erreurLigne } = await supabase
      .from('crm_immo_documents')
      .delete()
      .eq('id', id)
      .select('id');

    if (erreurLigne) {
      return { error: `Le fichier est retiré, mais sa fiche n’a pas pu être supprimée : ${erreurLigne.message}. Réessayez.` };
    }
    if ((supprimees ?? []).length === 0) {
      return { error: 'Le fichier est retiré, mais sa fiche n’a pas pu être supprimée. Réessayez.' };
    }

    setDocuments(prev => prev.filter(d => d.id !== id));
    return { error: null };
  }, [documents]);

  /* ---------------------------------------------------------------------------
   * LES CLASSEURS
   * ------------------------------------------------------------------------- */

  const creerClasseur = useCallback(async (nom: string) => {
    const propre = nom.trim();
    /* Les deux memes regles que le CHECK de la base, dans le meme ordre. Valider deux
       fois n'est pas redondant : la base refuse de toute facon, mais son refus revient
       sous la forme d'un message Postgres que personne ne comprend. */
    if (propre === '') return { error: 'Un dossier sans nom ne s’enregistre pas.' };
    if (propre.length > 80) return { error: 'Ce nom dépasse 80 caractères.' };
    if (!dossierId || !companyId) return { error: 'Dossier introuvable.' };

    const { data, error } = await supabase
      .from('crm_immo_classeurs')
      .insert({ company_id: companyId, dossier_id: dossierId, nom: propre })
      .select(CHAMPS_CLASSEUR);

    if (error) {
      /* 23505 : l'index unique insensible a la casse. Le dire en francais. */
      if (error.code === '23505') return { error: `Un dossier « ${propre} » existe déjà ici.` };
      return { error: error.message };
    }
    const ligne = (data ?? [])[0] as ClasseurImmo | undefined;
    if (ligne === undefined) return { error: 'Création refusée : droits insuffisants.' };
    setClasseurs(prev => [...prev, ligne].sort((a, b) => a.nom.localeCompare(b.nom, 'fr')));
    return { error: null };
  }, [dossierId, companyId]);

  const renommerClasseur = useCallback(async (id: string, nom: string) => {
    const propre = nom.trim();
    if (propre === '') return { error: 'Un dossier sans nom ne s’enregistre pas.' };
    if (propre.length > 80) return { error: 'Ce nom dépasse 80 caractères.' };

    const { data, error } = await supabase
      .from('crm_immo_classeurs')
      .update({ nom: propre })
      .eq('id', id)
      .select(CHAMPS_CLASSEUR);

    if (error) {
      if (error.code === '23505') return { error: `Un dossier « ${propre} » existe déjà ici.` };
      return { error: error.message };
    }
    const ligne = (data ?? [])[0] as ClasseurImmo | undefined;
    if (ligne === undefined) return { error: 'Renommage refusé : droits insuffisants.' };
    setClasseurs(prev => prev.map(c => (c.id === id ? ligne : c)).sort((a, b) => a.nom.localeCompare(b.nom, 'fr')));
    return { error: null };
  }, []);

  const supprimerClasseur = useCallback(async (id: string) => {
    /*
     * ON COMPTE AVANT. David : << Si un dossier documentaire contient encore des
     * fichiers, ne le supprime pas silencieusement. >>
     *
     * La cle etrangere est en ON DELETE SET NULL, donc la base ferait remonter les
     * documents a la racine sans rien perdre : le refus est une regle de produit, pas un
     * garde-fou d'integrite. On compte sur l'etat local, qui porte TOUS les documents du
     * dossier — ils sont deja charges, et pagines.
     */
    const dedans = documents.filter(d => d.classeur_id === id).length;
    if (dedans > 0) {
      return { error: `Ce dossier contient encore ${dedans} document${dedans > 1 ? 's' : ''}. Déplacez-les ou supprimez-les d’abord.` };
    }

    const { data, error } = await supabase
      .from('crm_immo_classeurs')
      .delete()
      .eq('id', id)
      .select('id');

    if (error) return { error: error.message };
    if ((data ?? []).length === 0) return { error: 'Suppression refusée : droits insuffisants.' };
    setClasseurs(prev => prev.filter(c => c.id !== id));
    return { error: null };
  }, [documents]);

  /* ---------------------------------------------------------------------------
   * LIRE UN FICHIER
   * ------------------------------------------------------------------------- */

  const urlSignee = useCallback(async (id: string) => {
    const vise = documents.find(d => d.id === id);
    if (vise === undefined) return { url: null, error: 'Document introuvable.' };

    const { data, error } = await supabase.storage
      .from(BUCKET_DOCUMENTS)
      .createSignedUrl(vise.chemin, SECONDES_URL_SIGNEE);

    if (error) {
      /*
       * Le cas d'une sauvegarde restauree sans ses binaires, et il faut le DIRE : les
       * metadonnees voyagent dans le JSON, les octets non.
       */
      return {
        url: null,
        error: `Ce fichier n’est pas présent dans le stockage. S’il vient d’une restauration, c’est normal : une sauvegarde JSON ne contient que les fiches, jamais les fichiers eux-mêmes.`,
      };
    }
    return { url: data?.signedUrl ?? null, error: null };
  }, [documents]);

  /**
   * Les URL signees des miniatures, EN UN SEUL APPEL.
   *
   * createSignedUrls prend une liste : un dossier de cinquante photos coute une requete,
   * pas cinquante. On ne demande que les types qu'un navigateur sait vraiment afficher —
   * un HEIC donnerait une vignette cassee et muette.
   */
  const urlsMiniatures = useCallback(async (chemins: string[]) => {
    if (chemins.length === 0) return {} as Record<string, string>;
    const { data, error } = await supabase.storage
      .from(BUCKET_DOCUMENTS)
      .createSignedUrls(chemins, SECONDES_URL_SIGNEE);
    if (error || !data) return {} as Record<string, string>;
    const par: Record<string, string> = {};
    for (const e of data) {
      /* Chaque entree porte sa propre erreur : un fichier absent du stockage — une
         restauration sans ses binaires — ne doit pas faire echouer les autres. */
      if (e.path !== null && e.error === null && e.signedUrl) par[e.path] = e.signedUrl;
    }
    return par;
  }, []);

  const oublierAvertissements = useCallback(() => { setAvertissements([]); }, []);

  return {
    documents, classeurs, chargement, erreur, envoi, avertissements,
    ajouter, renommer, deplacer, supprimer,
    creerClasseur, renommerClasseur, supprimerClasseur,
    urlSignee, urlsMiniatures, recharger, oublierAvertissements,
  };
}

export function operationsSuppressionDossier(): OperationsSuppressionDossier {
  return {
    /* Paginee : un dossier suivi quelques annees passe le millier de documents, et
       PostgREST tronquerait la lecture SANS erreur — on retirerait les mille premiers en
       croyant avoir fini, et on abandonnerait les suivants. */
    lister: async (dossierIds) => {
      const { data, error } = await lireToutesLesLignes<{ id: string; chemin: string }>((de, a) =>
        supabase
          .from('crm_immo_documents')
          .select('id,chemin', { count: 'exact' })
          .in('dossier_id', dossierIds)
          .order('id')
          .range(de, a));
      if (error) return { chemins: [], error: error.message };
      return { chemins: (data ?? []).map(l => l.chemin), error: null };
    },

    marquer: async (dossierIds) => {
      const { error } = await supabase
        .from('crm_immo_documents')
        .update({ statut: 'suppression' })
        .in('dossier_id', dossierIds)
        .select('id');
      return { error: error ? error.message : null };
    },

    demarquer: async (dossierIds) => {
      const { error } = await supabase
        .from('crm_immo_documents')
        .update({ statut: 'pret' })
        .in('dossier_id', dossierIds)
        .eq('statut', 'suppression')
        .select('id');
      return { error: error ? error.message : null };
    },

    /* On LIT le resultat de remove(). Les quatre appels deja presents dans le projet
       ignorent le leur : c'est la facon de fabriquer un orphelin sans le savoir. */
    retirerDuStockage: async (chemins) => {
      const { error } = await supabase.storage.from(BUCKET_DOCUMENTS).remove(chemins);
      return { error: error ? error.message : null };
    },

    supprimerDossiers: async (dossierIds) => {
      const { data, error } = await supabase
        .from('crm_immo_dossiers')
        .delete()
        .in('id', dossierIds)
        .select('id');
      if (error) return { supprimees: 0, error: error.message };
      return { supprimees: (data ?? []).length, error: null };
    },
  };
}
