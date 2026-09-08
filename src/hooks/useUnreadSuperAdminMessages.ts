import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

export interface AdminNotifEntry {
  adminId: string;
  firstName: string;
  lastName: string;
  /** Nom de la Societe ou du Groupe. Deja renvoye par les deux annuaires. */
  company: string;
  email: string;
  count: number;
  latestAt: string;
  preview: string;
  senderKind: 'admin' | 'company_super_admin';
}

export function useUnreadSuperAdminMessages() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadEntries, setUnreadEntries] = useState<AdminNotifEntry[]>([]);
  const entriesRef = useRef<AdminNotifEntry[]>([]);
  const justMarked = useRef(false);

  // Identite de l'utilisateur reellement connecte (Talvex). Toutes les requetes
  // de ce hook sont explicitement bornees a SES conversations : elles ne doivent
  // jamais depender de la RLS pour leur cadrage.
  const [superAdminId, setSuperAdminId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setSuperAdminId(user.id);
    });
  }, []);

  const load = useCallback(async () => {
    if (!superAdminId) return;
    if (justMarked.current) {
      justMarked.current = false;
      return;
    }

    const { data: msgs } = await supabase
      .from('super_admin_messages')
      .select('admin_id, created_at, content, sender_role')
      .eq('super_admin_id', superAdminId)
      .in('sender_role', ['admin', 'company_super_admin'])
      .eq('read', false)
      .eq('deleted', false);

    if (!msgs || msgs.length === 0) {
      setUnreadCount(0);
      setUnreadEntries([]);
      entriesRef.current = [];
      return;
    }

    const grouped = new Map<string, { count: number; latestAt: string; preview: string; kind: 'admin' | 'company_super_admin' }>();
    for (const m of msgs) {
      if (!m.admin_id) continue;
      const existing = grouped.get(m.admin_id);
      if (!existing) {
        grouped.set(m.admin_id, { count: 1, latestAt: m.created_at, preview: m.content ?? '', kind: m.sender_role });
      } else {
        existing.count++;
        if (m.created_at > existing.latestAt) { existing.latestAt = m.created_at; existing.preview = m.content ?? ''; }
      }
    }

    // Deux annuaires : les Societes (list-admins) ET les Groupes (list-company-super-admins).
    const token = (await supabase.auth.getSession()).data.session?.access_token ?? '';
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Apikey: import.meta.env.VITE_SUPABASE_ANON_KEY };
    const base = import.meta.env.VITE_SUPABASE_URL;
    const [aRes, cRes] = await Promise.all([
      fetch(`${base}/functions/v1/list-admins`, { headers }).then(r => r.json()).catch(() => ({})),
      fetch(`${base}/functions/v1/list-company-super-admins`, { headers }).then(r => r.json()).catch(() => ({})),
    ]);
    // `company` est deja renvoye par list-admins ET par list-company-super-admins :
    // on le conserve au lieu de le jeter. Aucune requete supplementaire.
    const admins: { id: string; email: string; first_name: string; last_name: string; company?: string }[] =
      [...(aRes.admins ?? []), ...(cRes.company_super_admins ?? [])];

    const entries: AdminNotifEntry[] = [];
    for (const a of admins) {
      const g = grouped.get(a.id);
      if (g) {
        entries.push({
          adminId: a.id,
          firstName: a.first_name ?? '',
          lastName: a.last_name ?? '',
          company: a.company ?? '',
          email: a.email ?? '',
          count: g.count,
          latestAt: g.latestAt,
          preview: g.preview,
          senderKind: g.kind,
        });
      }
    }
    // Filet de securite : une conversation dont l'auteur n'a pas ete resolu
    // reste comptee — sinon le badge mentirait. En revanche elle repart SANS
    // identite : un identifiant technique n'est jamais un libelle.
    for (const [aid, g] of grouped) {
      if (!entries.find(e => e.adminId === aid)) {
        entries.push({ adminId: aid, firstName: '', lastName: '', company: '', email: '', count: g.count, latestAt: g.latestAt, preview: g.preview, senderKind: g.kind });
      }
    }

    entries.sort((a, b) => b.latestAt.localeCompare(a.latestAt));
    entriesRef.current = entries;
    setUnreadEntries(entries);
    // Badge = nombre de CONVERSATIONS non lues, jamais le nombre de messages.
    setUnreadCount(entries.length);
  }, [superAdminId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel('sa-unread-admin-notif')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'super_admin_messages' }, () => {
        load();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const markAsRead = useCallback(async (adminId: string) => {
    if (!adminId || !superAdminId) return;
    justMarked.current = true;
    const entry = entriesRef.current.find(e => e.adminId === adminId);
    setUnreadEntries(prev => {
      const next = prev.filter(e => e.adminId !== adminId);
      entriesRef.current = next;
      return next;
    });
    setUnreadCount(prev => Math.max(0, prev - (entry ? 1 : 0)));

    await supabase
      .from('super_admin_messages')
      .update({ read: true })
      .eq('admin_id', adminId)
      // Borne a la conversation de Talvex : sans ce filtre, marquer lue une
      // conversation Talvex <-> Societe effacerait aussi les non-lus que cette
      // Societe a envoyes a SON Groupe, de facon irrattrapable.
      .eq('super_admin_id', superAdminId)
      .in('sender_role', ['admin', 'company_super_admin'])
      .eq('read', false)
      .eq('deleted', false);
  }, [superAdminId]);

  return { unreadCount, unreadEntries, markAsRead, reload: load };
}
