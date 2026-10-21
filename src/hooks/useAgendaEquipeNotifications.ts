import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useCompanyId } from './useCompanyId';
import { useAgendaVu } from './useAgendaVu';
import { deciderPersistance } from '../lib/agendaVu';

export interface AgendaEquipeNotifEntry {
  rdvId: string;
  leadName: string;
  vendorName: string;
  appointmentUtc: string;
  type?: 'starting' | 'untreated';
}

const STORAGE_PREFIX = 'crm_seen_agenda_equipe_notifications_admin_';

/**
 * La cle du localStorage, INCHANGEE : des « vu » sont deja ranges sous cette forme dans
 * les navigateurs. En changer le format les perdrait tous d'un coup.
 */
function getStorageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`;
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

/**
 * Les notifications de l'agenda d'equipe, et leur « deja vu ».
 *
 * Ce hook n'est appele QUE par le panel Societe — il n'a pas d'equivalent chez le
 * Vendeur ni chez le Client. Il passe quand meme par `deciderPersistance`, pour que la
 * Visu soit refusee au MEME endroit que pour l'agenda personnel : deux regles ecrites
 * a deux endroits finissent par diverger, et c'est celle-la qu'on ne peut pas se
 * permettre de rater.
 */
export function useAgendaEquipeNotifications(
  userId: string | null,
  options?: {
    /** L'ecran demande la persistance en base. Absent = non. */
    persistanceEnBase?: boolean;
    /** Vrai des que l'ecran montre les notifications de QUELQU'UN D'AUTRE. */
    enVisu?: boolean;
  },
) {
  const companyId = useCompanyId();
  const [notifications, setNotifications] = useState<AgendaEquipeNotifEntry[]>([]);
  const [count, setCount] = useState(0);

  const demandee = options?.persistanceEnBase === true;
  const enVisu = options?.enVisu === true;
  const persistance = useMemo(() => deciderPersistance({
    panel: 'societe', demandee, enVisu, companyId, userId,
  }), [demandee, enVisu, companyId, userId]);

  const vu = useAgendaVu(persistance, 'equipe', getStorageKey(userId ?? ''));
  /* Lu par reference dans `evaluate`, pour que son identite ne change pas. */
  const vuRef = useRef(vu);
  vuRef.current = vu;

  /*
   * La liste courante, par reference.
   *
   * `markAsSeen` a besoin du nom du lead et de l'heure du rendez-vous pour construire
   * la ligne a ecrire en base. La lire depuis l'etat la mettrait dans les dependances
   * de `useCallback`, et l'identite de `markAsSeen` changerait a CHAQUE evaluation —
   * donc aussi celle de `handleAgendaPersoClick`, et la cadence de rendu de la barre
   * du haut, pour les TROIS panels. Une reference garde le profil d'avant intact.
   */
  const notifsRef = useRef<AgendaEquipeNotifEntry[]>([]);
  notifsRef.current = notifications;
  const rdvsRef = useRef<RdvRow[]>([]);
  const vendorMapRef = useRef<Map<string, string>>(new Map());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const evaluateRef = useRef<() => void>(() => {});
  const scheduleNextRef = useRef<(now: number) => void>(() => {});

  const evaluate = useCallback(() => {
    if (!userId) { setNotifications([]); setCount(0); return; }

    /* Tant que le « deja vu » n'est pas charge, on ne dit rien — et on ne remet pas la
       liste a vide non plus : repondre trop tot ferait remonter comme neuves des
       alertes deja vues, le temps d'un aller-retour reseau. */
    const vuCourant = vuRef.current;
    if (!vuCourant.prete) return;

    const now = Date.now();
    const active: AgendaEquipeNotifEntry[] = [];

    for (const rdv of rdvsRef.current) {
      const ts = getRdvTimestamp(rdv);
      const diff = now - ts;
      const vendorName = vendorMapRef.current.get(rdv.vendor_id) || 'Admin';
      if (diff >= -60_000 && diff <= 60_000 && !vuCourant.estVu(rdv.id, 'starting')) {
        active.push({ rdvId: rdv.id, leadName: rdv.lead_name, vendorName, appointmentUtc: new Date(ts).toISOString(), type: 'starting' });
      }
      if (diff > 60_000 && !rdv.treated_at && !vuCourant.estVu(rdv.id, 'untreated')) {
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
    if (!companyId) return;

    const [rdvRes, vendorRes] = await Promise.all([
      supabase
        .from('rdv_proposals')
        .select('id, lead_name, proposed_date, proposed_time, appointment_utc, vendor_id, status, treated_at')
        .eq('status', 'confirmed')
        .not('vendor_id', 'is', null)
        .eq('company_id', companyId),
      supabase
        .from('vendors')
        .select('id, first_name, last_name')
        .eq('company_id', companyId),
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
  }, [userId, companyId]);

  useEffect(() => { load(); }, [load]);

  /* Le « deja vu » de la base arrive apres le premier rendu, et peut changer ensuite.
     Borne au chemin BASE : rien ne doit bouger sur le chemin local. */
  useEffect(() => {
    if (vu.source !== 'base') return;
    evaluateRef.current();
  }, [vu]);

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

    const entree = notifsRef.current.find(n => n.rdvId === rdvId && n.type === (type ?? 'starting'));

    void vuRef.current.marquer(rdvId, type, {
      leadName: entree?.leadName ?? '',
      vendorName: entree?.vendorName,
      appointmentUtc: entree?.appointmentUtc ?? new Date().toISOString(),
    }).then(ecrit => {
      /* On ne retire de l'ecran QUE si l'ecriture a vraiment eu lieu : un refus de la
         RLS est muet et rend zero ligne. */
      if (!ecrit) return;
      setNotifications(prev => {
        const next = prev.filter(n => !(n.rdvId === rdvId && n.type === (type ?? 'starting')));
        setCount(next.length);
        return next;
      });
    });
  }, [userId]);

  return { notifications, count, markAsSeen, persistance: vu.source, raisonLocale: vu.raison };
}
