import { supabase } from './supabase';
import { localToUTC } from './timezoneUtils';
import { MOTIF_RDV_DIRECT, type RdvDirect } from './rdvDirectRegles';

export * from './rdvDirectRegles';

/**
 * LE RDV DIRECT — un rendez-vous fixe par le commercial lui-meme (« rappelez-moi demain a
 * 15 h »), SANS proposition ni validation du client.
 *
 * Ce n'est PAS une proposition de RDV (Actions > Proposer un rendez-vous, que le client
 * accepte sur son panel) : ce systeme-la ne change pas. Le RDV direct est une ligne de
 * `rdv_proposals` marquee `rdv_kind = 'direct'`, au statut 'confirmed' puis 'cancelled' s'il
 * est annule. C'est la SEULE source de verite :
 *   - les agendas (commercial, Societe, equipe) lisent deja les RDV confirmes : il y apparait ;
 *   - l'historique du lead LIT ces lignes (aucune copie dans leads.data, donc rien a
 *     resynchroniser apres une modification ou une annulation) ;
 *   - la base le rend invisible au client et n'en laisse l'ecriture au commercial que sur un
 *     lead qui lui est attribue (politiques restrictives, migration rdv_direct).
 */

const COLONNES = 'id, lead_id, vendor_id, proposed_date, proposed_time, appointment_utc, source_timezone, description, status, created_at, created_by_name';

function messageErreur(e: { code?: string; message?: string } | null): string {
  if (e?.code === '42501' || /row-level security/i.test(e?.message ?? '')) {
    return 'Ce lead ne vous est pas attribué : le RDV direct est refusé.';
  }
  return e?.message || 'Erreur inconnue.';
}

export interface NouveauRdvDirect {
  leadId: string;
  vendorId: string;
  companyId: string;
  leadName: string;
  leadPhone: string;
  leadEmail: string;
  createdByName: string;
  date: string;
  heure: string;
  note: string;
  tz: string;
}

/** Cree le RDV direct. Le client n'est ni sollicite ni notifie (aucun drapeau « non vu » pour lui). */
export async function creerRdvDirect(p: NouveauRdvDirect): Promise<{ error: string | null }> {
  const { data, error } = await supabase.from('rdv_proposals').insert({
    rdv_kind: 'direct',
    status: 'confirmed',
    motif: MOTIF_RDV_DIRECT,
    description: p.note.trim(),
    lead_id: p.leadId,
    vendor_id: p.vendorId,
    company_id: p.companyId,
    lead_name: p.leadName,
    lead_phone: p.leadPhone,
    lead_email: p.leadEmail,
    proposed_date: p.date,
    proposed_time: p.heure,
    appointment_utc: localToUTC(p.date, p.heure, p.tz),
    source_timezone: p.tz,
    created_by_role: 'vendor',
    created_by_name: p.createdByName,
    target_role: 'vendor',
    seen_by_vendor: true,
    seen_by_admin: true,
    seen_by_client: true,
  }).select('id');
  if (error) return { error: messageErreur(error) };
  if (!data || data.length === 0) return { error: 'Le RDV direct n\'a pas été enregistré.' };
  return { error: null };
}

/** Change la date, l'heure et la note. Jamais par RdvEditModal : celui-ci ecrit au client. */
export async function modifierRdvDirect(id: string, p: { date: string; heure: string; note: string; tz: string }): Promise<{ error: string | null }> {
  const { data, error } = await supabase.from('rdv_proposals').update({
    proposed_date: p.date,
    proposed_time: p.heure,
    appointment_utc: localToUTC(p.date, p.heure, p.tz),
    source_timezone: p.tz,
    description: p.note.trim(),
  }).eq('id', id).eq('rdv_kind', 'direct').select('id');
  if (error) return { error: messageErreur(error) };
  if (!data || data.length === 0) return { error: 'Modification refusée : ce RDV direct ne vous appartient pas.' };
  return { error: null };
}

/** Annule le RDV direct : un STATUT, jamais une suppression (le commercial n'a pas le droit DELETE). */
export async function annulerRdvDirect(id: string): Promise<{ error: string | null }> {
  const { data, error } = await supabase.from('rdv_proposals').update({ status: 'cancelled' })
    .eq('id', id).eq('rdv_kind', 'direct').select('id');
  if (error) return { error: messageErreur(error) };
  if (!data || data.length === 0) return { error: 'Annulation refusée : ce RDV direct ne vous appartient pas.' };
  return { error: null };
}

/** Les RDV directs confirmes d'un commercial (pour ses lignes de leads). Une seule requete. */
export async function chargerRdvDirectsDuCommercial(vendorId: string): Promise<RdvDirect[]> {
  const { data, error } = await supabase.from('rdv_proposals').select(COLONNES)
    .eq('vendor_id', vendorId).eq('rdv_kind', 'direct').eq('status', 'confirmed');
  if (error) return [];
  return (data ?? []) as RdvDirect[];
}

/** Tous les RDV directs d'un lead, annules compris (pour son historique). */
export async function chargerRdvDirectsDuLead(leadId: string): Promise<RdvDirect[]> {
  const { data, error } = await supabase.from('rdv_proposals').select(COLONNES)
    .eq('lead_id', leadId).eq('rdv_kind', 'direct').order('created_at', { ascending: false });
  if (error) return [];
  return (data ?? []) as RdvDirect[];
}
