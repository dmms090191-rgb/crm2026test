import { supabase } from '../../../../lib/supabase';
import type { RdvProposal } from './clientRdvConstants';

export async function acceptRdv(
  id: string,
  rdvs: RdvProposal[],
  clientEmail: string,
  reload: () => void,
) {
  const now = new Date().toISOString();
  const rdv = rdvs.find(r => r.id === id);
  let vendorId: string | null = null;
  if (rdv && !rdv.vendor_id) {
    const { data: lead } = await supabase
      .from('leads')
      .select('vendor_id')
      .eq('email', clientEmail)
      .maybeSingle();
    if (lead?.vendor_id) vendorId = lead.vendor_id;
  }
  const updatePayload: Record<string, unknown> = {
    status: 'confirmed',
    responded_at: now,
    responded_by: 'client',
    seen_by_admin: false,
    seen_by_vendor: false,
  };
  if (vendorId) updatePayload.vendor_id = vendorId;
  await supabase.from('rdv_proposals').update(updatePayload).eq('id', id);

  if (rdv?.parent_proposal_id) {
    await supabase.from('rdv_proposals').update({
      status: 'counter_proposed',
      responded_at: now,
      responded_by: 'client',
    }).eq('id', rdv.parent_proposal_id).in('status', ['pending', 'counter_proposed']);

    await supabase.from('rdv_proposals').update({
      status: 'counter_proposed',
      responded_at: now,
      responded_by: 'client',
    }).eq('parent_proposal_id', rdv.parent_proposal_id).neq('id', id).in('status', ['pending']);
  }

  reload();
}

export async function refuseRdv(
  id: string,
  setRdvs: React.Dispatch<React.SetStateAction<RdvProposal[]>>,
) {
  const now = new Date().toISOString();
  await supabase.from('rdv_proposals').update({
    status: 'cancelled',
    responded_at: now,
    responded_by: 'client',
    seen_by_admin: false,
    seen_by_vendor: false,
  }).eq('id', id);
  setRdvs(prev => prev.map(r => r.id === id ? { ...r, status: 'cancelled', responded_at: now, responded_by: 'client' } : r));
}

export async function cancelOwnRdv(
  id: string,
  setRdvs: React.Dispatch<React.SetStateAction<RdvProposal[]>>,
) {
  const now = new Date().toISOString();
  await supabase.from('rdv_proposals').update({
    status: 'cancelled',
    responded_at: now,
    responded_by: 'client',
    seen_by_admin: false,
    seen_by_vendor: false,
  }).eq('id', id);
  setRdvs(prev => prev.map(r => r.id === id ? { ...r, status: 'cancelled', responded_at: now, responded_by: 'client' } : r));
}

export async function acceptReschedule(id: string, rdvs: RdvProposal[], reload: () => void) {
  const rdv = rdvs.find(r => r.id === id);
  if (!rdv || rdv.reschedule_status !== 'pending') return;
  await supabase.from('rdv_proposals').update({
    proposed_date: rdv.reschedule_date,
    proposed_time: rdv.reschedule_time,
    appointment_utc: rdv.reschedule_utc,
    reschedule_status: 'accepted',
    reschedule_date: null,
    reschedule_time: null,
    reschedule_utc: null,
    reschedule_reason: null,
    reschedule_requested_at: null,
    reschedule_requested_by: null,
    seen_by_admin: false,
    seen_by_vendor: false,
  }).eq('id', id);
  reload();
}

export async function refuseReschedule(id: string, rdvs: RdvProposal[], reload: () => void) {
  const rdv = rdvs.find(r => r.id === id);
  if (!rdv || rdv.reschedule_status !== 'pending') return;
  await supabase.from('rdv_proposals').update({
    reschedule_status: 'refused',
    reschedule_date: null,
    reschedule_time: null,
    reschedule_utc: null,
    reschedule_reason: null,
    reschedule_requested_at: null,
    reschedule_requested_by: null,
    seen_by_admin: false,
    seen_by_vendor: false,
  }).eq('id', id);
  reload();
}
