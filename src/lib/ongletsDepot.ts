import { supabase } from './supabase';
import { lireToutesLesLignes } from './lectureIntegrale';
import type { Onglet, ColonneRegistre, ColonneOnglet } from './ongletsLeads';

/**
 * L'ACCES AUX ONGLETS DE COLONNES — lectures et ecritures, au meme endroit.
 *
 * Toutes les lectures sont BORNEES PAR LA SOCIETE (`company_id`) en plus de la RLS : le Super
 * Admin lit toutes les societes, et sans ce filtre il verrait en Visu les onglets des autres.
 * Les listes passent par `lireToutesLesLignes` : PostgREST tronque au-dela de 1 000 lignes
 * SANS le dire, et 5 000 leads rattaches a un onglet le depassent.
 *
 * Aucune suppression : on archive un onglet, on retire un lead (date), on masque une colonne.
 */

export interface StructureOnglets {
  onglets: Onglet[];
  registre: ColonneRegistre[];
  colonnes: ColonneOnglet[];
}

export async function chargerStructureOnglets(companyId: string): Promise<{ data: StructureOnglets | null; error: string | null }> {
  const [o, r, c] = await Promise.all([
    supabase.from('lead_onglets').select('id, nom, origine, position, archive_le')
      .eq('company_id', companyId).is('archive_le', null)
      .order('position', { ascending: true }).order('id', { ascending: true }),
    lireToutesLesLignes<ColonneRegistre>((de, a) => supabase.from('lead_colonnes')
      .select('id, cle_data, cle_canonique, libelle, type', { count: 'exact' })
      .eq('company_id', companyId).order('id', { ascending: true }).range(de, a)),
    lireToutesLesLignes<ColonneOnglet>((de, a) => supabase.from('lead_onglet_colonnes')
      .select('id, onglet_id, colonne_id, cle_systeme, position, visible, libelle', { count: 'exact' })
      .eq('company_id', companyId).order('id', { ascending: true }).range(de, a)),
  ]);
  const err = o.error ?? r.error ?? c.error;
  if (err) return { data: null, error: err.message };
  return {
    data: { onglets: (o.data ?? []) as Onglet[], registre: r.data ?? [], colonnes: c.data ?? [] },
    error: null,
  };
}

/** lead_id -> onglets ou il est rattache (non retire). */
export async function chargerAppartenances(companyId: string): Promise<{ data: Map<string, string[]> | null; error: string | null }> {
  const { data, error } = await lireToutesLesLignes<{ onglet_id: string; lead_id: string }>((de, a) =>
    supabase.from('lead_onglet_leads').select('onglet_id, lead_id', { count: 'exact' })
      .eq('company_id', companyId).is('retire_le', null)
      .order('onglet_id', { ascending: true }).order('lead_id', { ascending: true }).range(de, a));
  if (error) return { data: null, error: error.message };
  const m = new Map<string, string[]>();
  for (const l of data ?? []) {
    const liste = m.get(l.lead_id);
    if (liste) liste.push(l.onglet_id); else m.set(l.lead_id, [l.onglet_id]);
  }
  return { data: m, error: null };
}

/* 150 identifiants par requete : la liste part dans l'URL (« id=in.(…) »), et 500 identifiants
   depassaient les ~16 Ko qu'accepte le frontal (19 704 caracteres mesures). */
const LOT_IDS = 150;

/** Les colonnes standard d'un onglet cree a la main : celles de Principal. */
export const COLONNES_ONGLET_MANUEL = [
  'hash', 'nom', 'prenom', 'email', 'telephone', 'date_ajout', 'statut', 'vendeur', 'actions', 'acces', 'ia',
].map(cle_systeme => ({ cle_systeme }));

export async function creerOnglet(companyId: string, nom: string) {
  return supabase.rpc('crm_onglet_creer', { p_company_id: companyId, p_nom: nom.trim(), p_colonnes: COLONNES_ONGLET_MANUEL });
}

export async function renommerOnglet(companyId: string, ongletId: string, nom: string) {
  return supabase.from('lead_onglets').update({ nom: nom.trim() }).eq('id', ongletId).eq('company_id', companyId);
}

export async function archiverOnglet(companyId: string, ongletId: string) {
  return supabase.from('lead_onglets').update({ archive_le: new Date().toISOString() }).eq('id', ongletId).eq('company_id', companyId);
}

export async function enregistrerColonnesOnglet(
  ongletId: string,
  colonnes: { id: string; position: number; visible: boolean; libelle: string | null }[],
  ajouts: ({ colonne_id: string } | { cle_systeme: string })[],
) {
  return supabase.rpc('crm_onglet_colonnes_enregistrer', { p_onglet_id: ongletId, p_colonnes: colonnes, p_ajouts: ajouts });
}

/**
 * Rattache des leads a un onglet. D'abord re-rattacher ceux qui en avaient ete RETIRES
 * (la ligne existe, sa date de retrait s'efface), puis inserer les autres en ignorant ceux
 * deja presents. Un `upsert` ne convenait pas : il reecrirait `origine`, que la base fige.
 */
export async function rattacherLeads(companyId: string, ongletId: string, leadIds: string[]) {
  for (let i = 0; i < leadIds.length; i += LOT_IDS) {
    const lot = leadIds.slice(i, i + LOT_IDS);
    const r1 = await supabase.from('lead_onglet_leads').update({ retire_le: null })
      .eq('company_id', companyId).eq('onglet_id', ongletId).in('lead_id', lot).not('retire_le', 'is', null);
    if (r1.error) return { error: r1.error };
    const r2 = await supabase.from('lead_onglet_leads')
      .upsert(lot.map(lead_id => ({ onglet_id: ongletId, lead_id, company_id: companyId, origine: 'manuel' })),
        { onConflict: 'onglet_id,lead_id', ignoreDuplicates: true });
    if (r2.error) return { error: r2.error };
  }
  return { error: null };
}

/** Retire des leads d'un onglet : une DATE, jamais une suppression. Le lead reste dans Principal. */
export async function retirerLeads(companyId: string, ongletId: string, leadIds: string[]) {
  for (let i = 0; i < leadIds.length; i += LOT_IDS) {
    const { error } = await supabase.from('lead_onglet_leads').update({ retire_le: new Date().toISOString() })
      .eq('company_id', companyId).eq('onglet_id', ongletId).in('lead_id', leadIds.slice(i, i + LOT_IDS)).is('retire_le', null);
    if (error) return { error };
  }
  return { error: null };
}
