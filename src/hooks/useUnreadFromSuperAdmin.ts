import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useSocieteInterlocutors } from './useSocieteInterlocutors';
import type { Interlocutor } from './useSocieteInterlocutors';
import { conversationIdentity } from '../components/notifications/notifIdentity';

/** Une CONVERSATION non lue, identifiee par son super_admin_id. */
export interface SuperAdminNotifEntry {
  superAdminId: string;
  kind: 'talvex' | 'groupe' | 'unknown';
  name: string;
  /** Ligne secondaire, ex. « Groupe : Willness ». Vide pour Talvex. */
  subtitle: string;
  count: number;        // messages non lus DANS ce fil
  latestAt: string;
  preview: string;
}

/**
 * Identite affichee d'un interlocuteur, via la regle PARTAGEE avec les panels
 * Groupe et Talvex. Aucune requete : tout vient de `interlocutors`, deja charge.
 *
 * `resolve-parent-super-admin` renvoie un `display_name` deja arbitre :
 *   responsable, sinon nom du Groupe, sinon email, sinon « Groupe ».
 * On en rededuit donc la part humaine sans rien appeler de plus : si
 * `display_name` vaut le nom du Groupe, c'est qu'il n'y a pas de responsable.
 *
 * Talvex garde son libelle tel quel et n'a jamais de ligne secondaire.
 */
function identityOf(it: Interlocutor | undefined): { name: string; subtitle: string } {
  // Interlocuteur non resolu : on nomme Talvex, jamais un libelle technique.
  if (!it) return { name: 'Talvex Administrateur', subtitle: '' };
  if (it.kind === 'talvex') return { name: it.display_name, subtitle: '' };
  const humain = it.display_name === it.company ? '' : it.display_name;
  return conversationIdentity({ first_name: humain, company: it.company }, {}, 'Groupe');
}

export function useUnreadFromSuperAdmin(adminAuthId: string | null, opts?: { resolveName?: boolean }) {
  // unreadCount    = nombre de CONVERSATIONS non lues  -> le badge
  // unreadMessages = nombre BRUT de messages non lus   -> le detail d'une ligne
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [entries, setEntries] = useState<SuperAdminNotifEntry[]>([]);
  const [latestAt, setLatestAt] = useState<string | null>(null);
  const [latestContent, setLatestContent] = useState<string>('');
  const resolveName = opts?.resolveName === true;

  // Les identites ne sont resolues que si l'appelant en a besoin (panel Societe).
  // Le panel Groupe libelle lui-meme sa ligne Talvex : aucun appel superflu.
  const { interlocutors } = useSocieteInterlocutors(adminAuthId, resolveName);

  const sole = interlocutors.length === 1 ? identityOf(interlocutors[0]) : null;
  const counterpartName = sole?.name ?? '';
  const counterpartSubtitle = sole?.subtitle ?? '';

  const justMarked = useRef(false);
  const entriesRef = useRef<SuperAdminNotifEntry[]>([]);
  const interlocutorsRef = useRef(interlocutors);
  interlocutorsRef.current = interlocutors;

  const load = useCallback(async () => {
    if (!adminAuthId) return;
    if (justMarked.current) {
      justMarked.current = false;
      return;
    }

    const { data } = await supabase
      .from('super_admin_messages')
      .select('super_admin_id, created_at, content')
      .eq('admin_id', adminAuthId)
      .eq('sender_role', 'super_admin')
      .eq('read', false)
      .eq('deleted', false);

    if (!data || data.length === 0) {
      setUnreadCount(0);
      setUnreadMessages(0);
      entriesRef.current = [];
      setEntries([]);
      setLatestAt(null);
      setLatestContent('');
      return;
    }

    // Un groupe par super_admin_id : Talvex et le Groupe ne se melangent jamais.
    const grouped = new Map<string, { count: number; latestAt: string; preview: string }>();
    for (const m of data) {
      const sid = m.super_admin_id as string;
      if (!sid) continue;
      const cur = grouped.get(sid);
      if (!cur) {
        grouped.set(sid, { count: 1, latestAt: m.created_at, preview: m.content ?? '' });
      } else {
        cur.count++;
        if (m.created_at > cur.latestAt) { cur.latestAt = m.created_at; cur.preview = m.content ?? ''; }
      }
    }

    const known = new Map(interlocutorsRef.current.map(i => [i.id, i]));
    const list: SuperAdminNotifEntry[] = [...grouped.entries()].map(([sid, g]) => {
      const it = known.get(sid);
      const who = identityOf(it);
      return {
        superAdminId: sid,
        kind: it?.kind ?? 'unknown',
        name: who.name,
        subtitle: who.subtitle,
        count: g.count,
        latestAt: g.latestAt,
        preview: g.preview,
      };
    });
    list.sort((a, b) => b.latestAt.localeCompare(a.latestAt));

    entriesRef.current = list;
    setEntries(list);
    // Regle globale : le badge compte des conversations, jamais des messages.
    setUnreadCount(list.length);
    setUnreadMessages(data.length);

    const newest = list[0];
    setLatestAt(newest.latestAt);
    setLatestContent(newest.preview);
  }, [adminAuthId]);

  useEffect(() => { load(); }, [load]);
  // Les noms arrivent apres les messages : on redecore sans refaire de requete.
  useEffect(() => {
    if (interlocutors.length === 0) return;
    const known = new Map(interlocutors.map(i => [i.id, i]));
    const decorated = entriesRef.current.map(e => {
      const it = known.get(e.superAdminId);
      if (!it) return e;
      const who = identityOf(it);
      return { ...e, kind: it.kind, name: who.name, subtitle: who.subtitle };
    });
    entriesRef.current = decorated;
    setEntries(decorated);
  }, [interlocutors]);

  useEffect(() => {
    if (!adminAuthId) return;
    const ch = supabase
      .channel(`admin-unread-sa-notif-${adminAuthId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'super_admin_messages' }, () => {
        load();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [adminAuthId, load]);

  /**
   * Marque une conversation comme lue.
   * @param superAdminId  le fil concerne. Omis = tous les fils (panel Groupe,
   *                      qui n'a qu'un seul interlocuteur au-dessus de lui).
   */
  const markAsRead = useCallback(async (superAdminId?: string) => {
    if (!adminAuthId) return;
    justMarked.current = true;

    if (superAdminId) {
      // Pas de setter dans un updater : React peut rejouer les updaters.
      const next = entriesRef.current.filter(e => e.superAdminId !== superAdminId);
      entriesRef.current = next;
      setEntries(next);
      setUnreadCount(next.length);
      setUnreadMessages(next.reduce((acc, e) => acc + e.count, 0));
    } else {
      entriesRef.current = [];
      setEntries([]);
      setUnreadCount(0);
      setUnreadMessages(0);
      setLatestAt(null);
      setLatestContent('');
    }

    let q = supabase
      .from('super_admin_messages')
      .update({ read: true })
      .eq('admin_id', adminAuthId)
      .eq('sender_role', 'super_admin')
      .eq('read', false)
      .eq('deleted', false);
    // Scope au fil ouvert : marquer lu Talvex ne touche jamais au fil du Groupe.
    if (superAdminId) q = q.eq('super_admin_id', superAdminId);
    await q;
  }, [adminAuthId]);

  return {
    unreadCount, unreadMessages, entries,
    latestAt, latestContent, counterpartName, counterpartSubtitle,
    interlocutors, markAsRead, reload: load,
  };
}
