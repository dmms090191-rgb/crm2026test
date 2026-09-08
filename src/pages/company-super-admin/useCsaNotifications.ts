import { useState, useCallback, useMemo } from 'react';
import { useUnreadCSAAdminMessages } from '../../hooks/useUnreadCSAAdminMessages';
import { useUnreadFromSuperAdmin } from '../../hooks/useUnreadFromSuperAdmin';
import { conversationIdentity } from '../../components/notifications/notifIdentity';
import { useCsaCompanies } from './useCsaCompanies';
import type { CSAAdminUser } from './useCsaCompanies';
import type { CSAView } from './CSASidebar';

/** Identifiant local de la conversation avec Talvex dans le popover (pas un id de base). */
export const TALVEX_CONVO_ID = '__talvex__';

/**
 * Notifications du panel Groupe : une seule bulle agregeant Talvex et les
 * Societes, plus l'annuaire des Societes pour le chat. Extrait tel quel du
 * dashboard, aucun changement de comportement.
 */
export function useCsaNotifications(
  csaAuthId: string,
  csaCompanyId: string,
  setActiveView: (v: CSAView) => void,
) {
  const { unreadEntries: unreadAdminMsgEntries, markAsRead: markAdminMsgRead } = useUnreadCSAAdminMessages(csaAuthId);
  const [chatInitialAdmin, setChatInitialAdmin] = useState<{ id: string; email: string; first_name: string; last_name: string } | null>(null);

  // Conversation avec Talvex : hook deja existant, deja utilise tel quel par le panel Societe.
  // unreadFromTalvex = 0 ou 1 conversation · talvexMessages = nombre brut de messages.
  const { unreadCount: unreadFromTalvex, unreadMessages: talvexMessages, latestAt: talvexAt, latestContent: talvexPreview, markAsRead: markTalvexRead } = useUnreadFromSuperAdmin(csaAuthId);

  // Annuaire des Societes de CE Groupe — meme source que « Gestion des societes ».
  // Permet d'ecrire a une Societe qui n'a jamais repondu.
  const { admins: csaCompanies } = useCsaCompanies(csaCompanyId);
  const chatCachedAdmins = useMemo(
    () => csaCompanies.map(a => ({ ...a, ai_enabled: false })),
    [csaCompanies],
  );

  // Annuaire indexe par id Auth de la Societe.
  // C'est la MEME source que « Gestion des societes » et que les contacts du
  // chat : elle est portee par `target_company_id`, donc elle designe le Groupe
  // REEL, y compris en Visu ou le JWT reste celui de Talvex.
  const societeById = useMemo(() => {
    const m = new Map<string, CSAAdminUser>();
    for (const a of csaCompanies) m.set(a.id, a);
    return m;
  }, [csaCompanies]);

  /** Identite visible d'une Societe. Regle partagee avec le panel Talvex. */
  const societeIdentity = useCallback((e: { adminId: string; firstName: string; lastName: string; email: string }) =>
    conversationIdentity(
      societeById.get(e.adminId),
      { first_name: e.firstName, last_name: e.lastName, email: e.email },
      'Société',
    ), [societeById]);

  // Badge = nombre de CONVERSATIONS non lues : les Societes + Talvex si elle contient des non-lus.
  const notifCount = unreadAdminMsgEntries.length + unreadFromTalvex;

  // Une ligne par conversation. Deux Societes = deux lignes, jamais fusionnees :
  // le regroupement se fait sur admin_id, en amont, dans useUnreadCSAAdminMessages.
  // L'annuaire arrive apres les messages : ce useMemo redecore les lignes des
  // qu'il est la, sans refaire la moindre requete.
  const notifEntries = useMemo(() => [
    ...(unreadFromTalvex > 0
      ? [{ id: TALVEX_CONVO_ID, name: 'Talvex Administrateur', preview: talvexPreview, at: talvexAt ?? '', unread: talvexMessages }]
      : []),
    ...unreadAdminMsgEntries.map(e => {
      const who = societeIdentity(e);
      return {
        id: e.adminId,
        name: who.name,
        subtitle: who.subtitle,
        preview: e.preview,
        at: e.latestAt,
        unread: e.count,
      };
    }),
  ], [unreadAdminMsgEntries, unreadFromTalvex, talvexMessages, talvexAt, talvexPreview, societeIdentity]);

  const sidebarBadgeCounts = useMemo(() => {
    const m: Record<string, number> = {};
    if (unreadAdminMsgEntries.length > 0) m['chat-admin'] = unreadAdminMsgEntries.length;
    if (unreadFromTalvex > 0) m['chat-rois-admin'] = unreadFromTalvex;
    return m;
  }, [unreadAdminMsgEntries.length, unreadFromTalvex]);

  const handleOpenChatAdmin = useCallback((adminId: string) => {
    // Le clic voyage avec l'ID technique ; l'identite ouverte vient de
    // l'annuaire du Groupe, la meme source que les contacts du chat.
    const s = societeById.get(adminId);
    const entry = unreadAdminMsgEntries.find(e => e.adminId === adminId);
    if (s || entry) {
      setChatInitialAdmin({
        id: adminId,
        email: s?.email ?? entry?.email ?? '',
        first_name: s?.first_name ?? entry?.firstName ?? '',
        last_name: s?.last_name ?? entry?.lastName ?? '',
      });
    }
    setActiveView('chat-admin');
    markAdminMsgRead(adminId);
  }, [societeById, unreadAdminMsgEntries, markAdminMsgRead]);

  /**
   * Bouton « Message » de la modal Actions d'une Societe.
   *
   * Contrairement a handleOpenChatAdmin (qui part d'une notification et n'a
   * donc que des Societes ayant deja ecrit), on dispose ici de la Societe
   * complete : le fil s'ouvre meme si aucune conversation n'existe encore.
   *
   * Aucun risque de doublon : SAchatAdmin ecrit toujours dans le couple
   * (super_admin_id = ce Groupe, admin_id = cette Societe). S'il existe deja
   * une conversation, c'est exactement celle-la qui est chargee.
   */
  const handleMessageSociete = useCallback((admin: CSAAdminUser) => {
    setChatInitialAdmin({
      id: admin.id,
      email: admin.email,
      first_name: admin.first_name,
      last_name: admin.last_name,
    });
    setActiveView('chat-admin');
  }, []);

  // Aiguillage du popover : Talvex ou une Societe.
  // Ouverture DIRECTE du fil Talvex : uniquement depuis une notification.
  // Une navigation manuelle passe, elle, par l ecran « Contacter Talvex ».
  const [talvexAutoOpen, setTalvexAutoOpen] = useState(false);

  const handleNotifClick = useCallback((id: string) => {
    if (id === TALVEX_CONVO_ID) { markTalvexRead(); setTalvexAutoOpen(true); setActiveView('chat-rois-admin'); return; }
    handleOpenChatAdmin(id);
  }, [markTalvexRead, handleOpenChatAdmin]);

  return {
    unreadAdminMsgEntries, markAdminMsgRead,
    chatInitialAdmin, setChatInitialAdmin,
    unreadFromTalvex, talvexMessages, talvexAt, talvexPreview, markTalvexRead,
    chatCachedAdmins,
    notifCount, notifEntries, sidebarBadgeCounts,
    handleOpenChatAdmin, handleMessageSociete, handleNotifClick,
    talvexAutoOpen, setTalvexAutoOpen,
  };
}
