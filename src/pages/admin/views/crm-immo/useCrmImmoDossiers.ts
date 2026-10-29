import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../../lib/supabase';
import { lireToutesLesLignes } from '../../../../lib/lectureIntegrale';
import { useCompanyId } from '../../../../hooks/useCompanyId';
import { supprimerDossiersEtLeursDocuments } from '../../../../lib/crmImmoSuppressionDossier';
import { operationsSuppressionDossier } from './useCrmImmoDocuments';
import { decisionEcriture } from '../../../../lib/crmImmoModePaiement';
import type { DossierImmo, SaisieDossier } from './crmImmoTypes';

/**
 * Couche de donnees des dossiers CRM Immo — SEUL endroit qui parle a `crm_immo_dossiers`.
 *
 * ---------- UNE ECRITURE REFUSEE PAR LA RLS NE LEVE AUCUNE ERREUR ----------
 *
 * C'est le piege central de supabase-js : un UPDATE ou un DELETE que la RLS refuse rend
 * `{ error: null }` et ZERO ligne. L'interface croirait avoir reussi. Chaque ecriture se
 * termine donc par un `.select()` et on compare ce qui revient a ce qu'on attendait. Un
 * silence est traite comme un echec, parce que c'en est un.
 *
 * ---------- JAMAIS DE JOINTURE SUR public.companies ----------
 *
 * Sa RLS ne laisse voir au `company_super_admin` que SA PROPRE ligne : une jointure
 * viderait le resultat EN SILENCE pour un Groupe qui consulte sa fille. Mesure faite :
 * 1 ligne vue. Les noms de Societe, quand il en faudra, se liront a part.
 */
/**
 * Ce que rend une ecriture de dossier.
 *
 * `avertissement` n'est PAS une erreur : l'enregistrement a reussi. Il signale que la
 * base a conserve la periode du bail — une date videe alors qu'un contrat est en cours
 * est ramenee a la valeur de ce contrat. Sans ce mot, l'utilisateur voit sa saisie
 * revenir et croit a un bug.
 *
 * Creation et modification partagent le type : sinon le ternaire du formulaire
 * (`edite ? modifier(...) : creer(...)`) produit une union ou le champ n'existe que
 * d'un cote, et TypeScript refuse de le lire.
 */
export interface ResultatEcritureDossier {
  error: string | null;
  avertissement?: string;
}

/** Un champ de formulaire vide devient NULL en base, jamais la chaine vide. */
const vide = (v: string) => (v.trim() === '' ? null : v.trim());

export function useCrmImmoDossiers() {
  const companyId = useCompanyId();
  const [dossiers, setDossiers] = useState<DossierImmo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!companyId) { setDossiers([]); setLoading(false); return; }
    setLoading(true);
    /*
     * PAGINEE, ET SA COMPLETUDE VERIFIEE.
     *
     * PostgREST tronque au-dela de son plafond, sans erreur : la liste serait juste
     * plus courte, et les dossiers manquants invisibles. Une agence qui depasse le
     * millier de dossiers verrait simplement les plus anciens disparaitre.
     *
     * Le tri reste `created_at` DESC — c'est l'ordre attendu a l'ecran — mais il est
     * DEPARTAGE par `id`. Sans ce second critere, deux dossiers crees dans la meme
     * milliseconde pourraient s'echanger entre deux pages : l'un apparaitrait deux
     * fois, l'autre jamais.
     */
    const { data, error: err } = await lireToutesLesLignes<DossierImmo>((de, a) =>
      supabase
        .from('crm_immo_dossiers')
        .select('*', { count: 'exact' })
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .order('id')
        .range(de, a));
    if (err) { setError(err.message); setDossiers([]); }
    else { setDossiers((data ?? []) as DossierImmo[]); setError(''); }
    setLoading(false);
  }, [companyId]);

  useEffect(() => { void load(); }, [load]);

  /** Transforme la saisie du formulaire en ligne de base. Les champs vides deviennent null. */
  const versLigne = useCallback((s: SaisieDossier) => {
    const jour = s.jour_encaissement.trim();
    return {
      company_id: companyId,
      nom: s.nom.trim(),
      prenom: vide(s.prenom),
      email: vide(s.email),
      telephone: vide(s.telephone),
      date_entree: vide(s.date_entree),
      date_fin_contrat: vide(s.date_fin_contrat),
      locataire: vide(s.locataire),
      proprietaire: vide(s.proprietaire),
      telephone_proprietaire: vide(s.telephone_proprietaire),
      /*
       * LES DEUX CANONIQUES — la valeur telle que l'utilisateur l'a tapee.
       *
       * Aucun decoupage, nulle part : ni ici, ni ailleurs. La chaine entiere part dans
       * UNE colonne. Mesure du 28/10/2026 : toute regle positionnelle serait fausse sur
       * un dossier sur deux, et fausse EN SILENCE — la chaine recomposee reste
       * identique au caractere pres, donc aucun ecran ne montrerait la corruption.
       *
       * Reserve a dire : `vide` applique .trim(), donc une saisie a espaces de BORD
       * revient rognee. Les doubles espaces INTERIEURS, eux, survivent — et c'est le
       * cas qui compte pour un nom compose.
       */
      nom_complet_locataire: vide(s.nom_complet_locataire),
      nom_complet_proprietaire: vide(s.nom_complet_proprietaire),
      /* Un champ vide doit rester null et non 0 : la base refuserait 0 (CHECK 1..31), et
         0 ne voudrait rien dire pour un jour du mois. */
      jour_encaissement: jour === '' ? null : Number(jour),
      commentaire: vide(s.commentaire),
      /* Chaine vide -> NULL, comme les autres champs : « non renseigne » n'est pas une
         quatrieme valeur, et la contrainte SQL n'accepterait pas '' de toute facon. */
      mode_paiement: vide(s.mode_paiement),
      /* Les valeurs personnalisees : on retire les cles vides plutot que de stocker des
         chaines vides qui alourdiraient chaque ligne sans rien apporter. */
      valeurs: Object.fromEntries(
        Object.entries(s.valeurs).filter(([, v]) => String(v ?? '').trim() !== ''),
      ),
    };
  }, [companyId]);

  const creer = useCallback(async (s: SaisieDossier): Promise<ResultatEcritureDossier> => {
    if (!companyId) return { error: 'Société introuvable.' };
    if (!s.nom_complet_locataire.trim()) return { error: 'Le nom du locataire est obligatoire.' };

    /*
     * ---------- A LA CREATION, LA CANONIQUE EST RECOPIEE VERBATIM ----------
     *
     * `nom` est NOT NULL avec CHECK (btrim(nom) <> '') : on ne peut PAS creer une ligne
     * en le laissant vide. Et le formulaire ne le saisit plus. Trois issues etaient
     * possibles, deux sont exclues :
     *
     *   - decouper la canonique pour remplir nom et prenom : INTERDIT, et mesure faux
     *     sur un dossier sur deux ;
     *   - mettre un bouche-trou dans `nom` : ce serait inventer une donnee, et elle
     *     ressortirait a la moindre restauration d'une sauvegarde prise avant la
     *     migration — puisque celle-ci ne porte pas les colonnes canoniques et laisse
     *     donc l'affichage retomber sur `nom`.
     *
     * Reste la recopie VERBATIM. Elle ne decoupe rien, elle duplique. Son benefice n'est
     * pas theorique : si les deux colonnes canoniques etaient retirees demain, la
     * composition rendrait EXACTEMENT la chaine canonique pour toute ligne creee apres
     * cette migration — le rollback resterait blanc.
     *
     * `prenom` et `proprietaire` restent NULL : y mettre quoi que ce soit supposerait une
     * frontiere qu'on refuse de deviner.
     */
    const ligne = {
      ...versLigne(s),
      nom: s.nom_complet_locataire.trim(),
      prenom: null,
      locataire: vide(s.nom_complet_proprietaire),
      proprietaire: null,
    };

    const { data, error: err } = await supabase
      .from('crm_immo_dossiers')
      .insert(ligne)
      .select('*')
      .single();

    if (err) return { error: err.message };
    if (!data) return { error: 'Le dossier n’a pas été créé.' };
    setDossiers(prev => [data as DossierImmo, ...prev]);
    return { error: null };
  }, [companyId, versLigne]);

  /** Rend un avertissement quand la base a conserve la periode du bail : l'enregistrement
   *  a reussi, mais une date videe a ete ramenee a la valeur du contrat. */
  const modifier = useCallback(async (
    id: string, s: SaisieDossier,
  ): Promise<ResultatEcritureDossier> => {
    if (!s.nom_complet_locataire.trim()) return { error: 'Le nom du locataire est obligatoire.' };

    const ligne = versLigne(s);
    /* company_id ne se modifie pas : le WITH CHECK le refuserait, et deplacer un dossier
       d'une Societe a une autre n'est pas une operation du module. */
    delete (ligne as { company_id?: unknown }).company_id;

    /*
     * ---------- LES QUATRE ANCIENNES COLONNES SORTENT DE L'UPDATE ----------
     *
     * C'est ce qui tient la regle de David : << ouverture puis sauvegarde sans
     * modification = donnees STRICTEMENT inchangees >>. Et c'est la seule facon de la
     * tenir pour de bon, parce que la garde du bouton Enregistrer ne protege QUE le cas
     * ou rien n'a bouge. Des que l'utilisateur corrige un telephone, l'UPDATE part — et
     * s'il portait encore ces quatre colonnes, il y graverait la valeur PREREMPLIE du
     * champ unique, c'est-a-dire une composition promue en douce au rang de donnee
     * saisie.
     *
     * Elles ne sont pas supprimees pour autant : elles restent en base, intactes, et le
     * formulaire les transporte toujours dans SaisieDossier. On refuse seulement de les
     * REECRIRE. << Masquer, jamais supprimer >>.
     *
     * La canonique, elle, part bien : c'est desormais la source de verite du nom.
     */
    delete (ligne as { nom?: unknown }).nom;
    delete (ligne as { prenom?: unknown }).prenom;
    delete (ligne as { locataire?: unknown }).locataire;
    delete (ligne as { proprietaire?: unknown }).proprietaire;

    const { data, error: err } = await supabase
      .from('crm_immo_dossiers')
      .update(ligne)
      .eq('id', id)
      .select('*');

    if (err) return { error: err.message };
    /* ZERO ligne = refus de la RLS, PAS une reussite. supabase-js ne leve rien ici. */
    const lignes = (data ?? []) as DossierImmo[];
    if (lignes.length === 0) return { error: 'Modification refusée : droits insuffisants ou dossier introuvable.' };

    const rendu = lignes[0];
    setDossiers(prev => prev.map(d => (d.id === id ? rendu : d)));

    /*
     * LA BASE A-T-ELLE RAMENE UNE DATE QU'ON VENAIT DE VIDER ?
     *
     * Depuis le 22 octobre 2026, un declencheur BEFORE empeche le dossier de contredire
     * sa periode de bail : vider l'une des trois colonnes alors qu'une periode est en
     * cours, et la base les remet aux valeurs du contrat. C'est ce qui ferme la
     * divergence mesuree ce jour-la — le dossier disait << pas de date de fin >> pendant
     * que crm_immo_contrats tenait toujours sa periode.
     *
     * Cote base, c'est juste. Cote ecran, ca ne l'est pas tant qu'on ne le dit pas :
     * l'utilisateur voit sa saisie revenir sans explication et croit a un bug.
     *
     * On ne redemande rien a la base pour le savoir : la ligne rendue par .select('*')
     * est celle d'APRES declencheurs. Il suffit de la comparer a ce qu'on a envoye.
     */
    const ramenees: string[] = [];
    if (ligne.date_entree === null && rendu.date_entree !== null) ramenees.push("la date d'entrée");
    if (ligne.date_fin_contrat === null && rendu.date_fin_contrat !== null) ramenees.push('la date de fin');
    if (ligne.jour_encaissement === null && rendu.jour_encaissement !== null) ramenees.push("le jour d'encaissement");

    if (ramenees.length > 0) {
      /* Formulation volontairement neutre : elle doit rester juste au singulier comme
         au pluriel, et quel que soit le genre des champs enumeres. */
      const quoi = ramenees.length === 1
        ? ramenees[0]
        : ramenees.slice(0, -1).join(', ') + ' et ' + ramenees[ramenees.length - 1];
      return {
        error: null,
        avertissement: `Un bail est en cours sur ce dossier : la période du contrat a été conservée (${quoi}). `
          + 'Pour la changer, utilisez « Renouveler le contrat » dans Détails.',
      };
    }

    return { error: null };
  }, [versLigne]);

  /**
   * Supprime definitivement, et AVEC le dossier ses alertes traitees.
   *
   * UNE instruction : la cle etrangere composee de crm_immo_etats est
   * ON DELETE CASCADE. Ne jamais ecrire cette cascade a la main — une liste de tables
   * enfants tenue cote application oublierait, tot ou tard, une table ajoutee plus tard.
   */
  const supprimer = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return { error: null, supprimees: 0 };

    /*
     * LES FICHIERS D'ABORD, LE DOSSIER ENSUITE — ET AVEC UNE TRACE D'INTENTION.
     *
     * La cascade de la base efface les LIGNES et laisse les OCTETS : aucune fonction du
     * schema ne reference storage.objects. Supprimer le dossier en premier abandonnerait
     * ses documents dans le bucket, invisibles et hors de portee de toute suppression
     * future.
     *
     * Mais nettoyer Storage d'abord ouvrait le trou symetrique : si la suppression du
     * dossier echouait ENSUITE, les fiches restaient en pointant des fichiers detruits,
     * indiscernables de fiches saines. La sequence marque donc les documents AVANT de
     * toucher aux octets, pour que cet etat-la soit visible et reprenable.
     *
     * Toute la mecanique vit dans supprimerDossiersEtLeursDocuments, ou elle est
     * mesurable : ses quatre operations sont injectees, donc un test peut forcer
     * n'importe lequel des quatre echecs.
     */
    const r = await supprimerDossiersEtLeursDocuments(ids, operationsSuppressionDossier());

    if (r.supprimees > 0) {
      /* On ne connait pas QUELS dossiers sont partis quand il en reste : on recharge
         plutot que de deviner. Deviner afficherait un dossier supprime, ou cacherait un
         dossier qui existe encore. */
      if (r.supprimees === ids.length) {
        const partis = new Set(ids);
        setDossiers(prev => prev.filter(d => !partis.has(d.id)));
      } else {
        void load();
      }
    }
    return { error: r.error, supprimees: r.supprimees };
  }, [load]);

  /**
   * CHANGER LE SEUL MODE DE PAIEMENT, SANS PASSER PAR LE FORMULAIRE.
   *
   * ---------- POURQUOI PAS modifier() ----------
   *
   * modifier() reecrit les ONZE champs du dossier depuis une saisie complete. L'employer
   * pour une liste deroulante demanderait de reconstituer cette saisie a partir de la
   * ligne affichee — et tout champ mal reconstitue serait ECRASE au passage. Pire, le
   * declencheur d'alignement sur la periode de bail se declencherait pour rien.
   *
   * Ici, un seul champ part, et un seul revient.
   *
   * ---------- L'AFFICHAGE CHANGE D'ABORD, ET REVIENT SI LA BASE REFUSE ----------
   *
   * Attendre la reponse avant d'afficher rendrait le menu poussif sur un telephone en 4G.
   * On pose donc la valeur tout de suite, et on la REMET COMME AVANT si l'ecriture
   * echoue — en disant pourquoi. Un retour en arriere muet laisserait l'utilisateur
   * croire que c'est enregistre.
   *
   * ---------- ET LE PIEGE DE supabase-js ----------
   *
   * Un UPDATE refuse par la RLS rend { error: null } et ZERO ligne. On termine donc par
   * .select(), et zero ligne est traite comme l'echec que c'est — c'est la quatrieme
   * fois que ce piege se presente dans ce module.
   */
  const changerModePaiement = useCallback(async (
    id: string, valeur: string | null,
  ): Promise<{ error: string | null }> => {
    const avant = dossiers.find(d => d.id === id);
    if (avant === undefined) return { error: 'Dossier introuvable.' };
    if ((avant.mode_paiement ?? null) === valeur) return { error: null };

    setDossiers(prev => prev.map(d => (d.id === id ? { ...d, mode_paiement: valeur } : d)));

    const { data, error: err } = await supabase
      .from('crm_immo_dossiers')
      .update({ mode_paiement: valeur })
      .eq('id', id)
      .select('id,mode_paiement');

    /* Les quatre cas de reponse sont tranches par un modele pur, teste a part : ici on
       ne fait qu'appliquer sa decision a l'etat. */
    const decision = decisionEcriture({
      message: err === null ? null : err.message,
      lignes: (data ?? []).length,
    });
    if (decision.revenirEnArriere) {
      setDossiers(prev =>
        prev.map(d => (d.id === id ? { ...d, mode_paiement: avant.mode_paiement } : d)));
    }
    return { error: decision.erreur };
  }, [dossiers]);

  return {
    dossiers, loading, error, companyId, recharger: load,
    creer, modifier, supprimer, changerModePaiement,
  };
}
