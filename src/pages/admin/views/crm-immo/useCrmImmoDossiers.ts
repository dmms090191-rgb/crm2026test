import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../../lib/supabase';
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
export function useCrmImmoDossiers() {
  const companyId = useCompanyId();
  const [dossiers, setDossiers] = useState<DossierImmo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!companyId) { setDossiers([]); setLoading(false); return; }
    setLoading(true);
    const { data, error: err } = await supabase
      .from('crm_immo_dossiers')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
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

  const creer = useCallback(async (s: SaisieDossier) => {
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

  const modifier = useCallback(async (id: string, s: SaisieDossier) => {
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

    setDossiers(prev => prev.map(d => (d.id === id ? lignes[0] : d)));
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
