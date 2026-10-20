import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useCompanyId } from '../../../../hooks/useCompanyId';
import { positionsApres, cleReglage, REGLAGE_VIDE, type ReglageLocal } from '../../../../lib/crmImmoColonnes';
import type { ColonneImmo, TypeColonne } from './crmImmoTypes';

/**
 * Couche de donnees des colonnes personnalisees — SEUL endroit qui parle a
 * `crm_immo_colonnes`, plus le reglage LOCAL des colonnes systeme.
 *
 * ---------- DEUX PERSISTANCES, ET C'EST VOULU ----------
 *
 * Les colonnes PERSONNALISEES vivent en base : elles appartiennent a la Societe, tout le
 * monde doit voir les memes. Leur ordre et leur masquage y sont aussi (position, masquee).
 *
 * L'ordre et le masquage des colonnes SYSTEME vivent dans le navigateur. Elles n'ont pas
 * de ligne en base — ce sont de vraies colonnes de crm_immo_dossiers — donc nulle part ou
 * ranger leur rang. C'est exactement ce que font deja les quatre autres CRM du depot, et
 * ca evite une cinquieme migration pour un confort d'affichage.
 *
 * ---------- LA LECTURE PORTE TOUJOURS LES DEUX CRITERES ----------
 *
 * `.order('position').order('created_at')` — les DEUX. `position` n'est volontairement
 * pas unique en base (un glisser-deposer passe par un etat transitoire en doublon) :
 * avec `position` seul, deux colonnes de meme rang s'echangeraient a chaque rechargement.
 */
export function useCrmImmoColonnes() {
  const companyId = useCompanyId();
  const [colonnes, setColonnes] = useState<ColonneImmo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reglage, setReglage] = useState<ReglageLocal>(REGLAGE_VIDE);

  /* ---- Le reglage local, lu une fois par Societe ---- */
  useEffect(() => {
    try {
      const brut = localStorage.getItem(cleReglage(companyId));
      if (!brut) { setReglage(REGLAGE_VIDE); return; }
      const lu = JSON.parse(brut) as Partial<ReglageLocal>;
      setReglage({
        ordreSysteme: Array.isArray(lu.ordreSysteme) ? lu.ordreSysteme.filter(x => typeof x === 'string') : [],
        masqueesSysteme: Array.isArray(lu.masqueesSysteme) ? lu.masqueesSysteme.filter(x => typeof x === 'string') : [],
      });
    } catch {
      /* Navigation privee, stockage bloque, JSON abime : on repart des defauts plutot
         que de casser la page pour un confort d'affichage. */
      setReglage(REGLAGE_VIDE);
    }
  }, [companyId]);

  const enregistrerReglage = useCallback((suivant: ReglageLocal) => {
    setReglage(suivant);
    try {
      localStorage.setItem(cleReglage(companyId), JSON.stringify(suivant));
    } catch { /* stockage indisponible : le reglage vit le temps de la session */ }
  }, [companyId]);

  /* ---- Les colonnes personnalisees, en base ---- */
  const load = useCallback(async () => {
    if (!companyId) { setColonnes([]); setLoading(false); return; }
    setLoading(true);
    const { data, error: err } = await supabase
      .from('crm_immo_colonnes')
      .select('*')
      .eq('company_id', companyId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });
    if (err) { setError(err.message); setColonnes([]); }
    else { setColonnes((data ?? []) as ColonneImmo[]); setError(''); }
    setLoading(false);
  }, [companyId]);

  useEffect(() => { void load(); }, [load]);

  const ajouter = useCallback(async (nom: string, type: TypeColonne) => {
    const propre = nom.trim();
    if (!propre) return { error: 'Le nom de la colonne est obligatoire.' };
    if (!companyId) return { error: 'Société introuvable.' };

    const { data, error: err } = await supabase
      .from('crm_immo_colonnes')
      .insert({ company_id: companyId, nom: propre, type, position: colonnes.length, masquee: false })
      .select('*')
      .single();

    if (err) {
      /* 23505 = l'index unique (company_id, lower(btrim(nom))). Le message brut de
         Postgres ne veut rien dire pour une agence immobiliere. */
      if (err.code === '23505') return { error: `Une colonne « ${propre} » existe déjà.` };
      return { error: err.message };
    }
    setColonnes(prev => [...prev, data as ColonneImmo]);
    return { error: null };
  }, [companyId, colonnes.length]);

  const renommer = useCallback(async (id: string, nom: string) => {
    const propre = nom.trim();
    if (!propre) return { error: 'Le nom de la colonne est obligatoire.' };

    /* Renommer est un UPDATE d'UNE SEULE LIGNE : la cle du jsonb des dossiers est l'ID
       de la colonne, pas son nom. Aucun dossier n'est touche. */
    const { data, error: err } = await supabase
      .from('crm_immo_colonnes')
      .update({ nom: propre })
      .eq('id', id)
      .select('*');

    if (err) {
      if (err.code === '23505') return { error: `Une colonne « ${propre} » existe déjà.` };
      return { error: err.message };
    }
    const lignes = (data ?? []) as ColonneImmo[];
    if (lignes.length === 0) return { error: 'Renommage refusé : droits insuffisants.' };
    setColonnes(prev => prev.map(c => (c.id === id ? lignes[0] : c)));
    return { error: null };
  }, []);

  const basculerMasquage = useCallback(async (id: string, masquee: boolean) => {
    const { data, error: err } = await supabase
      .from('crm_immo_colonnes')
      .update({ masquee })
      .eq('id', id)
      .select('*');
    if (err) return { error: err.message };
    const lignes = (data ?? []) as ColonneImmo[];
    if (lignes.length === 0) return { error: 'Modification refusée : droits insuffisants.' };
    setColonnes(prev => prev.map(c => (c.id === id ? lignes[0] : c)));
    return { error: null };
  }, []);

  const supprimer = useCallback(async (id: string) => {
    /* On ne touche PAS au jsonb des dossiers : la cle orpheline reste, inerte, jamais
       lue. Un DELETE qui reecrirait N dossiers serait lent et risque, pour un gain nul. */
    const { data, error: err } = await supabase
      .from('crm_immo_colonnes')
      .delete()
      .eq('id', id)
      .select('id');
    if (err) return { error: err.message };
    if ((data ?? []).length === 0) return { error: 'Suppression refusée : droits insuffisants.' };
    setColonnes(prev => prev.filter(c => c.id !== id));
    return { error: null };
  }, []);

  /**
   * Enregistre un nouvel ordre en UN SEUL upsert de lignes entieres.
   *
   * Une requete par colonne ferait N allers-retours et laisserait un ordre a moitie
   * ecrit si l'une echouait. `onConflict: 'id'` est exact : id est la cle primaire.
   */
  const reordonner = useCallback(async (ordre: ColonneImmo[]) => {
    const aEcrire = positionsApres(ordre);
    /* Mise a jour optimiste : le glisser-deposer doit repondre a l'oeil. */
    const avant = colonnes;
    setColonnes(ordre.map((c, i) => ({ ...c, position: i })));
    if (aEcrire.length === 0) return { error: null };

    const { data, error: err } = await supabase
      .from('crm_immo_colonnes')
      .upsert(aEcrire, { onConflict: 'id' })
      .select('id');

    if (err || (data ?? []).length !== aEcrire.length) {
      setColonnes(avant);
      return { error: err?.message ?? 'Le nouvel ordre n’a pas pu être enregistré entièrement.' };
    }
    return { error: null };
  }, [colonnes]);

  return {
    colonnes, loading, error, reglage,
    recharger: load, ajouter, renommer, basculerMasquage, supprimer, reordonner,
    enregistrerReglage,
  };
}
