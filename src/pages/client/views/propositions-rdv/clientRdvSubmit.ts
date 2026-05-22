import { supabase } from '../../../../lib/supabase';
import { localToUTC } from '../../../../lib/timezoneUtils';
import type { RdvProposal } from './clientRdvConstants';

export async function submitCounter(
  counterTarget: RdvProposal,
  rdvs: RdvProposal[],
  date: string,
  time: string,
  message: string,
  clientTz: string,
  userName: string,
  companyId: string | null,
  reload: () => void,
): Promise<string | null> {
  const appointmentCheck = new Date(localToUTC(date, time, clientTz));
  if (appointmentCheck.getTime() <= Date.now()) {
    return 'Veuillez choisir une date et une heure futures.';
  }

  const originalRdv = rdvs.find(r => r.id === counterTarget.id);
  const isRescheduleCounter = originalRdv?.status === 'confirmed' && originalRdv?.reschedule_status === 'pending';
  const isClientInitiatedReschedule = originalRdv?.status === 'confirmed' && !originalRdv?.reschedule_status;

  if (isClientInitiatedReschedule) {
    const appointmentUtc = localToUTC(date, time, clientTz);
    await supabase.from('rdv_proposals').update({
      reschedule_status: 'pending',
      reschedule_date: date,
      reschedule_time: time,
      reschedule_utc: appointmentUtc,
      reschedule_reason: message || null,
      reschedule_requested_at: new Date().toISOString(),
      reschedule_requested_by: 'client',
      seen_by_admin: false,
      seen_by_vendor: false,
    }).eq('id', counterTarget.id);
    reload();
    return null;
  }

  if (isRescheduleCounter) {
    const appointmentUtc = localToUTC(date, time, clientTz);
    await supabase.from('rdv_proposals').update({
      proposed_date: date,
      proposed_time: time,
      appointment_utc: appointmentUtc,
      source_timezone: clientTz,
      reschedule_status: null,
      reschedule_date: null,
      reschedule_time: null,
      reschedule_utc: null,
      reschedule_reason: null,
      reschedule_requested_at: null,
      reschedule_requested_by: null,
      seen_by_admin: false,
      seen_by_vendor: false,
    }).eq('id', counterTarget.id);
    reload();
    return null;
  }

  await supabase.from('rdv_proposals').update({
    status: 'counter_proposed',
    responded_at: new Date().toISOString(),
    responded_by: 'client',
  }).eq('id', counterTarget.id);

  const appointmentUtc = localToUTC(date, time, clientTz);
  await supabase.from('rdv_proposals').insert({
    lead_name: counterTarget.lead_name,
    lead_phone: counterTarget.lead_phone,
    lead_email: counterTarget.lead_email,
    lead_id: counterTarget.lead_id || null,
    vendor_id: counterTarget.vendor_id || null,
    proposed_date: date,
    proposed_time: time,
    motif: counterTarget.motif,
    description: counterTarget.description,
    notes: '',
    status: 'pending',
    created_by_role: 'client',
    created_by_name: userName || counterTarget.lead_name,
    target_role: 'admin',
    appointment_utc: appointmentUtc,
    source_timezone: clientTz,
    parent_proposal_id: counterTarget.id,
    counter_message: message,
    seen_by_client: true,
    seen_by_admin: false,
    seen_by_vendor: false,
    ...(companyId ? { company_id: companyId } : {}),
  });

  reload();
  return null;
}

export async function submitNewRdv(
  clientEmail: string,
  date: string,
  time: string,
  description: string,
  clientTz: string,
  userName: string,
  companyId: string | null,
  reload: () => void,
): Promise<string | null> {
  const appointmentCheck = new Date(localToUTC(date, time, clientTz));
  if (appointmentCheck.getTime() <= Date.now()) {
    return 'Veuillez choisir une date et une heure futures.';
  }

  const { data: leadByCol } = await supabase
    .from('leads')
    .select('id, prenom, nom, email, telephone, vendor_id, data')
    .eq('email', clientEmail)
    .limit(1)
    .maybeSingle();
  const { data: leadByJson } = !leadByCol
    ? await supabase
        .from('leads')
        .select('id, prenom, nom, email, telephone, vendor_id, data')
        .is('email', null)
        .eq('data->>Email', clientEmail)
        .limit(1)
        .maybeSingle()
    : { data: null };

  const lead = leadByCol || leadByJson;
  if (!lead) return 'Impossible de trouver vos informations.';

  const d = (lead.data && typeof lead.data === 'object') ? lead.data as Record<string, string> : {};
  const leadName = [lead.prenom || d.Prenom || d.prenom, lead.nom || d.Nom || d.nom].filter(Boolean).join(' ') || clientEmail;
  const leadPhone = lead.telephone || d.Telephone || d.telephone || '';
  const leadEmail = lead.email || d.Email || d.email || clientEmail;
  const leadVendorId = lead.vendor_id || null;

  const appointmentUtc = localToUTC(date, time, clientTz);

  await supabase.from('rdv_proposals').insert({
    lead_name: leadName,
    lead_phone: leadPhone,
    lead_email: leadEmail,
    lead_id: lead.id,
    vendor_id: leadVendorId,
    proposed_date: date,
    proposed_time: time,
    motif: '',
    description,
    notes: '',
    status: 'pending',
    created_by_role: 'client',
    created_by_name: userName || leadName,
    target_role: leadVendorId ? 'vendor' : 'admin',
    appointment_utc: appointmentUtc,
    source_timezone: clientTz,
    seen_by_client: true,
    seen_by_admin: false,
    seen_by_vendor: false,
    ...(companyId ? { company_id: companyId } : {}),
  });

  reload();
  return null;
}
