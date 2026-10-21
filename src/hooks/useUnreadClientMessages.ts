import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useCompanyId } from './useCompanyId';

interface UnreadEntry {
  clientAuthId: string;
  leadId: string;
  prenom: string;
  nom: string;
  email: string;
  count: number;
  latestAt: string;
  /*
   * L horodatage du PLUS ANCIEN message non lu de la conversation.
   *
   * C est ce qui identifie un EPISODE de non-lu dans l historique : tant que l episode
   * dure, ce reperage ne change pas, meme si de nouveaux messages arrivent — donc
   * l historique garde UNE entree pour les trois messages de Jean, pas trois.
   * Des que l admin lit et que l interlocuteur reecrit, un nouvel episode commence.
   *
   * A ne pas confondre avec latestAt, qui sert a l apercu et au tri.
   */
  oldestAt: string;
  /** Contenu du dernier message non lu de CE client. */
  preview: string;
}

export function useUnreadClientMessages() {
  const companyId = useCompanyId();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadEntries, setUnreadEntries] = useState<UnreadEntry[]>([]);
  const justMarked = useRef(false);

  const load = useCallback(async () => {
    if (justMarked.current) { justMarked.current = false; return; }
    if (!companyId) return;
    const { data: msgs } = await supabase
      .from('client_messages')
      .select('client_auth_id, created_at, content')
      .eq('company_id', companyId)
      .eq('sender', 'client')
      .eq('read', false)
      .eq('deleted', false)
      .is('vendor_id', null);

    if (!msgs || msgs.length === 0) {
      setUnreadCount(0);
      setUnreadEntries([]);
      return;
    }

    const grouped = new Map<string, { count: number; latestAt: string; oldestAt: string; preview: string }>();
    for (const m of msgs) {
      const existing = grouped.get(m.client_auth_id);
      if (!existing) {
        grouped.set(m.client_auth_id, { count: 1, latestAt: m.created_at, oldestAt: m.created_at, preview: m.content ?? '' });
      } else {
        existing.count++;
        // Le plus ANCIEN non lu borne l episode : il ne remonte jamais.
        if (m.created_at < existing.oldestAt) existing.oldestAt = m.created_at;
        // Le plus recent gagne : l apercu montre bien le DERNIER message.
        if (m.created_at > existing.latestAt) {
          existing.latestAt = m.created_at;
          existing.preview = m.content ?? '';
        }
      }
    }

    const authIds = [...grouped.keys()];

    const { data: leads } = await supabase
      .from('leads')
      .select('id, data, vendor_id, prenom, nom, email')
      .eq('company_id', companyId)
      .eq('actif', true)
      .is('vendor_id', null);

    const entries: UnreadEntry[] = [];
    for (const lead of leads ?? []) {
      const authId = lead.data?.['AuthId'] ?? lead.data?.['auth_id'] ?? lead.id;
      if (authIds.includes(authId)) {
        const g = grouped.get(authId)!;
        entries.push({
          clientAuthId: authId,
          leadId: lead.id,
          prenom: lead.prenom ?? lead.data?.['Prenom'] ?? lead.data?.['prenom'] ?? '',
          nom: lead.nom ?? lead.data?.['Nom'] ?? lead.data?.['nom'] ?? '',
          email: lead.email ?? lead.data?.['Email'] ?? lead.data?.['email'] ?? '',
          count: g.count,
          latestAt: g.latestAt,
          oldestAt: g.oldestAt,
          preview: g.preview,
        });
      }
    }

    entries.sort((a, b) => b.latestAt.localeCompare(a.latestAt));
    setUnreadEntries(entries);
    // Badge = nombre de CONVERSATIONS non lues. Le detail par message reste dans e.count.
    setUnreadCount(entries.length);
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel('admin-unread-client-notif')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'client_messages' }, () => {
        load();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const markAsRead = useCallback(async (clientAuthId: string) => {
    if (!clientAuthId) return;
    justMarked.current = true;
    const entry = unreadEntries.find(e => e.clientAuthId === clientAuthId);
    setUnreadEntries(prev => prev.filter(e => e.clientAuthId !== clientAuthId));
    setUnreadCount(prev => Math.max(0, prev - (entry ? 1 : 0)));

    await supabase
      .from('client_messages')
      .update({ read: true })
      .eq('client_auth_id', clientAuthId)
      .eq('sender', 'client')
      .eq('read', false)
      .is('vendor_id', null);
  }, [unreadEntries]);

  return { unreadCount, unreadEntries, markAsRead, reload: load };
}
