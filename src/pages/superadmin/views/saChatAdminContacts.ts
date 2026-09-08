import { useMemo } from 'react';
import type { ChatContact } from '../../../components/chat/chatTypes';
import type { AdminUser } from './SAAdmins';

/**
 * Construit la liste de contacts du chat : annuaire connu, contacts a afficher,
 * puis mapping vers ChatContact. Extrait tel quel, aucun changement de regle.
 */
export function useSaChatContacts(
  cachedAdmins: AdminUser[],
  csaUsers: AdminUser[],
  adminsWithMessages: string[],
  initialAdmin: AdminUser | null | undefined,
  showAllCachedAdmins: boolean,
  lastMessages: Record<string, { content: string; created_at: string; sender_role: string }>,
) {
  const allKnownUsers = useMemo(() => {
    const map = new Map<string, AdminUser>();
    for (const a of cachedAdmins) map.set(a.id, a);
    for (const c of csaUsers) if (!map.has(c.id)) map.set(c.id, c);
    return map;
  }, [cachedAdmins, csaUsers]);

  const adminsForContacts = useMemo(() => {
    const withMsgs = adminsWithMessages
      .map(id => allKnownUsers.get(id))
      .filter((a): a is AdminUser => !!a);

    // Panel Groupe : l'annuaire complet de SES Societes est fourni, on l'affiche
    // en entier pour pouvoir ecrire a une Societe qui n'a jamais repondu.
    // Panel Talvex : comportement inchange (conversations existantes uniquement).
    const base = showAllCachedAdmins
      ? [...withMsgs, ...cachedAdmins.filter(a => !withMsgs.some(w => w.id === a.id))]
      : withMsgs;

    if (initialAdmin && !base.some(a => a.id === initialAdmin.id)) {
      const fromAll = allKnownUsers.get(initialAdmin.id);
      return [fromAll ?? initialAdmin, ...base];
    }
    return base;
  }, [allKnownUsers, adminsWithMessages, initialAdmin, showAllCachedAdmins, cachedAdmins]);

  const contacts: ChatContact[] = useMemo(() =>
    adminsForContacts.map(a => {
      const isCsa = a.role === 'company_super_admin';
      const lastSender = lastMessages[a.id]?.sender_role;
      return {
        id: a.id,
        displayName: [a.first_name, a.last_name].filter(Boolean).join(' ') || a.email,
        subtitle: isCsa ? `Super Admin · ${a.company || a.email}` : a.email,
        initial: (a.first_name || a.email || '?').charAt(0).toUpperCase(),
        lastMessage: lastMessages[a.id]?.content,
        lastMessageAt: lastMessages[a.id]?.created_at,
        lastMessageSender: lastSender === 'super_admin' ? 'super_admin' : lastSender || 'admin',
      };
    }),
  [adminsForContacts, lastMessages]);

  return { contacts, adminsForContacts };
}
