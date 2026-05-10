import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface AgendaEquipeNotifEntry {
  rdvId: string;
  leadName: string;
  vendorName: string;
  appointmentUtc: string;
  type?: 'starting' | 'untreated';
}

const STORAGE_PREFIX = 'crm_seen_agenda_equipe_notifications_admin_';

function getStorageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`;
}

function getSeenIds(userId: string): Record<string, number> {
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (!raw) return {};
    return JSON.parse(raw);
  } catch { return {}; }
}

function setSeenIds(userId: string, map: Record<string, number>) {
  const now = Date.now();
  const cleaned: Record<string, number> = {};
  for (const [id, ts] of Object.entries(map)) {
    if (now - ts < 24 * 60 * 60 * 1000) cleaned[id] = ts;
  }
  localStorage.setItem(getStorageKey(userId), JSON.stringify(cleaned));
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
  vendor_id: string;
  status: string;
  treated_at?: string | null;
}

interface VendorRow {
  id: string;
  first_name: string;
  last_name: string;
}

export function useAgendaEquipeNotifications(userId: string | null) {
  const [notifications, setNotifications] = useState<AgendaEquipeNotifEntry[]>([]);
  const [count, setCount] = useState(0);
  const rdvsRef = useRef<RdvRow[]>([]);
  const vendorMapRef = useRef<Map<string, string>>(new Map());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const evaluateRef = useRef<() => void>(() => {});
  const scheduleNextRef = useRef<(now: number) => void>(() => {});

  const evaluate = useCallback(() => {
    if (!userId) { setNotifications([]); setCount(0); return; }

    const now = Date.now();
    const seen = getSeenIds(userId);
    const active: AgendaEquipeNotifEntry[] = [];

    for (const rdv of rdvsRef.current) {
      const ts = getRdvTimestamp(rdv);
      const diff = now - ts;
      const vendorName = vendorMapRef.current.get(rdv.vendor_id) || 'Admin';
      if (diff >= -60_000 && diff <= 60_000 && !seen[rdv.id]) {
        active.push({ rdvId: rdv.id, leadName: rdv.lead_name, vendorName, appointmentUtc: new Date(ts).toISOString(), type: 'starting' });
      }
      if (diff > 60_000 && !rdv.treated_at && !seen[`untreated_${rdv.id}`]) {
        active.push({ rdvId: rdv.id, leadName: rdv.lead_name, vendorName, appointmentUtc: new Date(ts).toISOString(), type: 'untreated' });
      }
    }

    setNotifications(active);
    setCount(active.length);
    scheduleNextRef.current(now);
  }, [userId]);

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

    const [rdvRes, vendorRes] = await Promise.all([
      supabase
        .from('rdv_proposals')
        .select('id, lead_name, proposed_date, proposed_time, appointment_utc, vendor_id, status, treated_at')
        .eq('status', 'confirmed')
        .not('vendor_id', 'is', null),
      supabase
        .from('vendors')
        .select('id, first_name, last_name'),
    ]);

    const vendorMap = new Map<string, string>();
    if (vendorRes.data) {
      (vendorRes.data as VendorRow[]).forEach(v => {
        vendorMap.set(v.id, [v.first_name, v.last_name].filter(Boolean).join(' '));
      });
    }
    vendorMapRef.current = vendorMap;

    rdvsRef.current = (rdvRes.data ?? []) as RdvRow[];
    evaluateRef.current();
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`agenda-equipe-notif-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rdv_proposals' }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load, userId]);

  useEffect(() => {
    intervalRef.current = setInterval(() => evaluateRef.current(), 60_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const markAsSeen = useCallback((rdvId: string, type?: 'starting' | 'untreated') => {
    if (!userId) return;
    const seen = getSeenIds(userId);
    const key = type === 'untreated' ? `untreated_${rdvId}` : rdvId;
    seen[key] = Date.now();
    setSeenIds(userId, seen);
    setNotifications(prev => {
      const next = prev.filter(n => !(n.rdvId === rdvId && n.type === (type ?? 'starting')));
      setCount(next.length);
      return next;
    });
  }, [userId]);

  return { notifications, count, markAsSeen };
}
