import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../../lib/supabase';
import { lireToutesLesLignes } from '../../../../lib/lectureIntegrale';
import { useCompanyId } from '../../../../hooks/useCompanyId';
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
    const vide = (v: string) => (v.trim() === '' ? null : v.trim());
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
      /* Un champ vide doit rester null et non 0 : la base refuserait 0 (CHECK 1..31), et
         0 ne voudrait rien dire pour un jour du mois. */
      jour_encaissement: jour === '' ? null : Number(jour),
      commentaire: vide(s.commentaire),
      /* Les valeurs personnalisees : on retire les cles vides plutot que de stocker des
         chaines vides qui alourdiraient chaque ligne sans rien apporter. */
      valeurs: Object.fromEntries(
        Object.entries(s.valeurs).filter(([, v]) => String(v ?? '').trim() !== ''),
      ),
    };
  }, [companyId]);

  const creer = useCallback(async (s: SaisieDossier): Promise<ResultatEcritureDossier> => {
    if (!companyId) return { error: 'Société introuvable.' };
    if (!s.nom.trim()) return { error: 'Le nom du client est obligatoire.' };

    const { data, error: err } = await supabase
      .from('crm_immo_dossiers')
      .insert(versLigne(s))
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
    if (!s.nom.trim()) return { error: 'Le nom du client est obligatoire.' };

    const ligne = versLigne(s);
    /* company_id ne se modifie pas : le WITH CHECK le refuserait, et deplacer un dossier
       d'une Societe a une autre n'est pas une operation du module. */
    delete (ligne as { company_id?: unknown }).company_id;

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

    const { data, error: err } = await supabase
      .from('crm_immo_dossiers')
      .delete()
      .in('id', ids)
      .select('id');

    if (err) return { error: err.message, supprimees: 0 };

    const partis = new Set((data ?? []).map(l => (l as { id: string }).id));
    setDossiers(prev => prev.filter(d => !partis.has(d.id)));
    if (partis.size !== ids.length) {
      return {
        error: `${ids.length - partis.size} dossier(s) n’ont pas pu être supprimés : droits insuffisants.`,
        supprimees: partis.size,
      };
    }
    return { error: null, supprimees: partis.size };
  }, []);

  return { dossiers, loading, error, companyId, recharger: load, creer, modifier, supprimer };
}
