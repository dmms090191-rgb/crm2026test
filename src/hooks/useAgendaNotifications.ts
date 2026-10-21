import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useCompanyId } from './useCompanyId';
import { useAgendaVu } from './useAgendaVu';
import { deciderPersistance } from '../lib/agendaVu';

export interface AgendaNotifEntry {
  rdvId: string;
  leadName: string;
  appointmentUtc: string;
  type?: 'starting' | 'untreated';
}

type Role = 'admin' | 'vendor' | 'client';

/**
 * La cle du localStorage, INCHANGEE.
 *
 * Des « vu » sont deja ranges sous cette forme dans les navigateurs des utilisateurs.
 * En changer le format les perdrait tous d'un coup, et ferait remonter d'un seul tenant
 * toutes les alertes passees non traitees le jour de la mise en ligne.
 */
function getStorageKey(role: Role, userId: string) {
  return `crm_seen_agenda_notifications_${role}_${userId}`;
}

/** Le panel qui appelle, deduit du role. Ce n'est pas un droit : c'est un ecran. */
function panelDe(role: Role) {
  return role === 'admin' ? 'societe' as const
    : role === 'vendor' ? 'vendeur' as const
    : 'client' as const;
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

/**
 * Les notifications d'agenda, et leur « deja vu ».
 *
 * `options` est le SEUL moyen d'obtenir la persistance en base, et son absence vaut
 * refus. C'est voulu : un ecran qui oublie de se declarer garde exactement le
 * comportement d'avant, et l'oubli degrade vers le localStorage — jamais vers une
 * ecriture au nom du mauvais utilisateur.
 *
 * Seul le panel Societe HORS Visu peut l'obtenir. Les trois verrous — le panel, la
 * demande, la Visu — sont dans `deciderPersistance`, en un seul endroit, verifiable
 * sans navigateur.
 */
export function useAgendaNotifications(
  role: Role,
  userId: string | null,
  options?: {
    /** L'ecran demande la persistance en base. Absent = non. */
    persistanceEnBase?: boolean;
    /** Vrai des que l'ecran montre les notifications de QUELQU'UN D'AUTRE. */
    enVisu?: boolean;
  },
) {
  const companyId = useCompanyId();
  const [notifications, setNotifications] = useState<AgendaNotifEntry[]>([]);
  const [count, setCount] = useState(0);

  const demandee = options?.persistanceEnBase === true;
  const enVisu = options?.enVisu === true;
  const persistance = useMemo(() => deciderPersistance({
    panel: panelDe(role), demandee, enVisu, companyId, userId,
  }), [role, demandee, enVisu, companyId, userId]);

  const vu = useAgendaVu(persistance, 'agenda', getStorageKey(role, userId ?? ''));
  /* Lu dans `evaluate` par reference, pour que l'identite de `evaluate` ne change pas :
     sur le chemin local elle doit rester aussi stable qu'avant. */
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
  const notifsRef = useRef<AgendaNotifEntry[]>([]);
  notifsRef.current = notifications;
  const rdvsRef = useRef<RdvRow[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const evaluateRef = useRef<() => void>(() => {});
  const scheduleNextRef = useRef<(now: number) => void>(() => {});

  const evaluate = useCallback(() => {
    if (!userId) { setNotifications([]); setCount(0); return; }

    /*
     * Tant que le « deja vu » n'est pas charge, on ne dit RIEN.
     *
     * On ne remet pas non plus la liste a vide : repondre avant d'avoir lu ferait
     * remonter comme neuves des alertes deja vues, le temps d'un aller-retour reseau.
     * En localStorage la lecture est synchrone, donc ce garde ne se declenche jamais.
     */
    const vuCourant = vuRef.current;
    if (!vuCourant.prete) return;

    const now = Date.now();
    const active: AgendaNotifEntry[] = [];

    for (const rdv of rdvsRef.current) {
      const ts = getRdvTimestamp(rdv);
      const diff = now - ts;
      if (diff >= -60_000 && diff <= 60_000 && !vuCourant.estVu(rdv.id, 'starting')) {
        active.push({ rdvId: rdv.id, leadName: rdv.lead_name, appointmentUtc: new Date(ts).toISOString(), type: 'starting' });
      }
      if (role !== 'client' && diff > 60_000 && !rdv.treated_at && !vuCourant.estVu(rdv.id, 'untreated')) {
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

  /*
   * Le « deja vu » de la base arrive APRES le premier rendu, et peut changer ensuite —
   * un autre appareil, ou la page Historique. Sans cette reevaluation, le compteur
   * attendrait la minute suivante pour se corriger.
   *
   * Borne au chemin BASE : sur le chemin local la lecture est synchrone et `vu` ne
   * change jamais d'identite, donc rien ne bouge pour le Vendeur et le Client.
   */
  useEffect(() => {
    if (vu.source !== 'base') return;
    evaluateRef.current();
  }, [vu]);

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

    /* L'entree porte le nom du lead et l'heure du rendez-vous : en base, la ligne est
       construite avec, par la MEME fabrique que l'alimentation de l'historique. */
    const entree = notifsRef.current.find(n => n.rdvId === rdvId && n.type === (type ?? 'starting'));

    void vuRef.current.marquer(rdvId, type, {
      leadName: entree?.leadName ?? '',
      appointmentUtc: entree?.appointmentUtc ?? new Date().toISOString(),
    }).then(ecrit => {
      /*
       * On ne retire de l'ecran QUE si l'ecriture a vraiment eu lieu.
       *
       * Un UPDATE refuse par la RLS rend { error: null } et zero ligne : retirer sur la
       * foi de ce silence ferait disparaitre la notification, puis revenir au
       * rechargement suivant. C'est la regle deja posee sur les quatre gestionnaires de
       * rendez-vous. En localStorage l'ecriture est RELUE, donc le booleen y est tout
       * aussi reel — une navigation privee qui refuse le stockage est detectee.
       */
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
