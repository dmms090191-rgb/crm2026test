import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useCompanyId } from './useCompanyId';

export interface AgendaNotifEntry {
  rdvId: string;
  leadName: string;
  appointmentUtc: string;
  type?: 'starting' | 'untreated';
}

type Role = 'admin' | 'vendor' | 'client';

function getStorageKey(role: Role, userId: string) {
  return `crm_seen_agenda_notifications_${role}_${userId}`;
}

function getSeenIds(role: Role, userId: string): Record<string, number> {
  try {
    const raw = localStorage.getItem(getStorageKey(role, userId));
    if (!raw) return {};
    return JSON.parse(raw);
  } catch { return {}; }
}

function setSeenIds(role: Role, userId: string, map: Record<string, number>) {
  const now = Date.now();
  const cleaned: Record<string, number> = {};
  for (const [id, ts] of Object.entries(map)) {
    if (now - ts < 24 * 60 * 60 * 1000) cleaned[id] = ts;
  }
  localStorage.setItem(getStorageKey(role, userId), JSON.stringify(cleaned));
}

function getRdvTimestamp(rdv: { appointment_utc?: string | null; proposed_date: string; proposed_time: string }): number {
  if (rdv.appointment_utc) return new Date(rdv.appointment_utc).getTime();
  return new Date(`${rdv.proposed_date}T${rdv.proposed_time}:00Z`).getTime();
}

interface RdvRow {
  id: string;
  lead_name: string;
  proposed_date: string;
  proposed_time: string;
  appointment_utc?: string | null;
  vendor_id?: string | null;
  lead_email?: string;
  status: string;
  treated_at?: string | null;
}

export function useAgendaNotifications(role: Role, userId: string | null) {
  const companyId = useCompanyId();
  const [notifications, setNotifications] = useState<AgendaNotifEntry[]>([]);
  const [count, setCount] = useState(0);
  const rdvsRef = useRef<RdvRow[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const evaluateRef = useRef<() => void>(() => {});
  const scheduleNextRef = useRef<(now: number) => void>(() => {});

  const evaluate = useCallback(() => {
    if (!userId) { setNotifications([]); setCount(0); return; }

    const now = Date.now();
    const seen = getSeenIds(role, userId);
    const active: AgendaNotifEntry[] = [];

    for (const rdv of rdvsRef.current) {
      const ts = getRdvTimestamp(rdv);
      const diff = now - ts;
      if (diff >= -60_000 && diff <= 60_000 && !seen[rdv.id]) {
        active.push({ rdvId: rdv.id, leadName: rdv.lead_name, appointmentUtc: new Date(ts).toISOString(), type: 'starting' });
      }
      if (role !== 'client' && diff > 60_000 && !rdv.treated_at && !seen[`untreated_${rdv.id}`]) {
        active.push({ rdvId: rdv.id, leadName: rdv.lead_name, appointmentUtc: new Date(ts).toISOString(), type: 'untreated' });
      }
    }

    setNotifications(active);
    setCount(active.length);
    scheduleNextRef.current(now);
  }, [role, userId]);

  const scheduleNext = useCallback((now: number) => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }

    let nearest = Infinity;
    for (const rdv of rdvsRef.current) {
      const ts = getRdvTimestamp(rdv);
      const diff = ts - now;
      if (diff > 0 && diff < nearest) nearest = diff;
    }

    if (nearest !== Infinity && nearest < 120_000) {
      timerRef.current = setTimeout(() => evaluateRef.current(), Math.min(nearest, 60_000));
    }
  }, []);

  evaluateRef.current = evaluate;
  scheduleNextRef.current = scheduleNext;

  const load = useCallback(async () => {
    if (!userId) { rdvsRef.current = []; return; }
    if (role === 'admin' && !companyId) { rdvsRef.current = []; return; }

    if (role === 'client') {
      const { data: byCol } = await supabase
        .from('leads')
        .select('id')
        .eq('email', userId);
      const { data: byJson } = await supabase
        .from('leads')
        .select('id')
        .is('email', null)
        .eq('data->>Email', userId);
      const allLeads = [...(byCol ?? []), ...(byJson ?? [])];
      const seenSet = new Set<string>();
      const leadIds = allLeads.filter(l => { if (seenSet.has(l.id)) return false; seenSet.add(l.id); return true; }).map(l => l.id);

      const { data: byEmail } = await supabase
        .from('rdv_proposals')
        .select('id, lead_name, proposed_date, proposed_time, appointment_utc, vendor_id, lead_email, status, treated_at')
        .eq('status', 'confirmed')
        .eq('lead_email', userId);

      const results = (byEmail ?? []) as RdvRow[];
      if (leadIds.length > 0) {
        const { data: byLeadId } = await supabase
          .from('rdv_proposals')
          .select('id, lead_name, proposed_date, proposed_time, appointment_utc, vendor_id, lead_email, status, treated_at')
          .eq('status', 'confirmed')
          .in('lead_id', leadIds);
        if (byLeadId) {
          const existingIds = new Set(results.map(r => r.id));
          for (const r of byLeadId as RdvRow[]) {
            if (!existingIds.has(r.id)) results.push(r);
          }
        }
      }
      rdvsRef.current = results;
    } else {
      let query = supabase
        .from('rdv_proposals')
        .select('id, lead_name, proposed_date, proposed_time, appointment_utc, vendor_id, lead_email, status, treated_at')
        .eq('status', 'confirmed');

      if (role === 'admin') {
        query = query.is('vendor_id', null).eq('company_id', companyId);
      } else {
        query = query.eq('vendor_id', userId);
      }

      const { data } = await query;
      rdvsRef.current = (data ?? []) as RdvRow[];
    }
    evaluateRef.current();
  }, [role, userId, companyId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`agenda-notif-${role}-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rdv_proposals' }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load, role, userId]);

  useEffect(() => {
    intervalRef.current = setInterval(() => evaluateRef.current(), 60_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const markAsSeen = useCallback((rdvId: string, type?: 'starting' | 'untreated') => {
    if (!userId) return;
    const seen = getSeenIds(role, userId);
    const key = type === 'untreated' ? `untreated_${rdvId}` : rdvId;
    seen[key] = Date.now();
    setSeenIds(role, userId, seen);
    setNotifications(prev => {
      const next = prev.filter(n => !(n.rdvId === rdvId && n.type === (type ?? 'starting')));
      setCount(next.length);
      return next;
    });
  }, [role, userId]);

  return { notifications, count, markAsSeen };
}
