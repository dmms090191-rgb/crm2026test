import { useState, useEffect, useRef } from 'react';
import { ChevronRight, Menu, Clock, Smartphone, Paintbrush } from 'lucide-react';
import { useTimezone } from '../../hooks/useTimezone';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { getCurrentTime } from '../../lib/timezone';
import TimezoneModal from '../../components/TimezoneSearchDropdown';
import SAProfileMenu from './topbar/SAProfileMenu';
import FloatingPhoneWindow from '../../components/FloatingPhoneWindow';
import { useFloatingPhoneState } from '../../components/useFloatingPhoneState';
import { useEditorModeSafe } from '../../contexts/EditorModeContext';
import { useVCElement } from '../../components/visualCustomize/useVCElement';

import type { AdminNotifEntry } from '../../hooks/useUnreadSuperAdminMessages';
import MessageBubblePopover from '../../components/notifications/MessageBubblePopover';
import { conversationIdentity } from '../../components/notifications/notifIdentity';
import MessagesBubbleTrigger from '../../components/notifications/MessagesBubbleTrigger';

const viewLabels: Record<string, string> = {
  dashboard: 'Dashboard', 'super-admins': 'Liste des groupes', admins: 'Liste admins', 'chat-admin': 'Chat Groupes',
  'documentation-crm': 'Documentation CRM', system: 'Système', sauvegarde: 'Sauvegarde & restauration',
  'mon-compte': 'Accès & sécurité', 'tests-systeme': 'Tests Système', 'crm-societe': 'CRM Sociétés',
  statuts: 'Statuts', 'api-ia': 'API IA', 'cerveau-ia': 'Cerveau IA Talvex', sites: 'Sites & Domaines',
  'fonctions-talvex': 'Fonctions Talvex', 'site-talvex': 'Site', application: 'Application',
  logo: 'Logo', ameliorations: 'Améliorations', tuto: 'Tuto', themes: 'Gestion des thèmes', 'editeur-ia': 'Éditeur IA',
  'calquer-logo': 'Calquer logo',
  'mes-logos-ra': 'Mes logos',
};

interface SuperAdminTopBarProps {
  activeView: string;
  onMobileMenuToggle?: () => void;
  unreadAdminMsgCount?: number;
  unreadAdminMsgEntries?: AdminNotifEntry[];
  onAdminMsgEntryClick?: (entry: AdminNotifEntry) => void;
  saFirstName?: string;
  saLastName?: string;
  appIconUrl?: string | null;
  appName?: string;
  topbarRef?: React.RefObject<HTMLElement | null>;
  editorZone3Bg?: string;
}

export default function SuperAdminTopBar({ activeView, onMobileMenuToggle, unreadAdminMsgCount = 0, unreadAdminMsgEntries = [], onAdminMsgEntryClick, saFirstName = '', saLastName = '', appIconUrl, appName, topbarRef, editorZone3Bg }: SuperAdminTopBarProps) {
  const { timezone, tzLabel, tzCode, setTimezone } = useTimezone();
  const t = useThemeTokens();
  const [tzModalOpen, setTzModalOpen] = useState(false);
  const [msgDropdownOpen, setMsgDropdownOpen] = useState(false);
  const msgDropdownRef = useRef<HTMLDivElement>(null);
  const [, setTick] = useState(0);

  const phone = useFloatingPhoneState();
  const editor = useEditorModeSafe();

  const vcBreadcrumb = useVCElement<HTMLDivElement>('sa-topbar-breadcrumb', 'text', 'Breadcrumb Super Admin');
  const vcAdminMsg = useVCElement<HTMLButtonElement>('hybrid-sa-topbar-admin-msg', 'button', 'Bouton Admin (messages)');
  const vcMobile = useVCElement<HTMLButtonElement>('hybrid-sa-topbar-mobile', 'button', 'Bouton Mobile');
  const vcEditor = useVCElement<HTMLButtonElement>('hybrid-sa-topbar-editor', 'button', 'Bouton Editeur');
  const vcClock = useVCElement<HTMLButtonElement>('hybrid-sa-topbar-clock', 'button', 'Bouton Heure');

  useEffect(() => {
    const id = setInterval(() => setTick(v => v + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (msgDropdownRef.current && !msgDropdownRef.current.contains(e.target as Node)) setMsgDropdownOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const clock = getCurrentTime(timezone);

  return (
    <>
      <header
        ref={topbarRef as React.RefObject<HTMLElement> | undefined}
        className="relative z-30 flex items-center justify-between px-3 sm:px-4 md:px-6 h-14 md:h-16 flex-shrink-0"
        style={{
          background: editorZone3Bg || t.topbar.bg,
          borderBottom: `1px solid ${t.topbar.border}`,
          backdropFilter: 'blur(12px)',
        }}
      >
        <div ref={vcBreadcrumb.ref} className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          {onMobileMenuToggle && (
            <button
              onClick={onMobileMenuToggle}
              className="md:hidden p-1.5 rounded-lg transition-colors"
              style={{ color: vcBreadcrumb.style?.color ?? t.topbar.breadcrumbText }}
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <span className="text-xs hidden md:inline" style={{ color: vcBreadcrumb.style?.color ?? t.topbar.breadcrumbPrefix }}>TALVEX ADMINISTRATEUR</span>
          <ChevronRight className="w-3 h-3 hidden md:block" style={{ color: vcBreadcrumb.style?.color ?? t.topbar.border }} />
          <span className="hidden md:inline text-sm font-semibold truncate" style={{ color: vcBreadcrumb.style?.color ?? t.topbar.breadcrumbText }}>
            {viewLabels[activeView] || 'Dashboard'}
          </span>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 min-w-0">
          {/* Admin messages */}
          <div className="relative flex-shrink-0" ref={msgDropdownRef}>
            <MessagesBubbleTrigger
              count={unreadAdminMsgCount}
              onClick={() => setMsgDropdownOpen(prev => !prev)}
              mutedColor={t.topbar.breadcrumbPrefix}
              innerRef={vcAdminMsg.ref}
              vcStyle={vcAdminMsg.style}
            />
            {msgDropdownOpen && (
              <AdminMsgDropdown
                entries={unreadAdminMsgEntries}
                onEntryClick={(entry) => { onAdminMsgEntryClick?.(entry); setMsgDropdownOpen(false); }}
                t={t}
              />
            )}
          </div>

          {/* Phone button */}
          <TopBarHybridButton
            innerRef={vcMobile.ref}
            vcStyle={vcMobile.style}
            onClick={phone.open ? phone.toggleMinimize : phone.openPhone}
            defaultBg={phone.open ? 'rgba(14,165,233,0.15)' : 'rgba(14,165,233,0.06)'}
            defaultBorder={phone.open ? 'rgba(14,165,233,0.3)' : 'rgba(14,165,233,0.15)'}
            hoverBg={phone.open ? 'rgba(14,165,233,0.2)' : 'rgba(14,165,233,0.12)'}
            hoverBorder={phone.open ? 'rgba(14,165,233,0.4)' : 'rgba(14,165,233,0.25)'}
            defaultIconColor="#0ea5e9"
            title={phone.open ? (phone.minimized ? 'Afficher le telephone' : 'Reduire le telephone') : 'Apercu mobile'}
            icon={<Smartphone className="w-4 h-4 flex-shrink-0" />}
            label={phone.open && phone.minimized ? 'Tel. ouvert' : 'Mobile'}
            dot={phone.open && phone.minimized ? '#0ea5e9' : undefined}
          />

          {/* Editor button */}
          {editor && (
            <TopBarHybridButton
              innerRef={vcEditor.ref}
              vcStyle={vcEditor.style}
              onClick={editor.editorOpen ? editor.closeEditor : editor.openEditor}
              defaultBg={editor.editorOpen ? 'rgba(234,179,8,0.15)' : 'rgba(234,179,8,0.06)'}
              defaultBorder={editor.editorOpen ? 'rgba(234,179,8,0.3)' : 'rgba(234,179,8,0.15)'}
              hoverBg={editor.editorOpen ? 'rgba(234,179,8,0.2)' : 'rgba(234,179,8,0.12)'}
              hoverBorder={editor.editorOpen ? 'rgba(234,179,8,0.4)' : 'rgba(234,179,8,0.25)'}
              defaultIconColor="#eab308"
              title={editor.editorOpen ? 'Fermer l\'editeur' : 'Ouvrir l\'editeur de fonds'}
              icon={<Paintbrush className="w-4 h-4 flex-shrink-0" />}
              label="Editeur"
              dot={editor.editorOpen ? '#eab308' : undefined}
            />
          )}

          <ClockButton
            tzLabel={tzLabel}
            tzCode={tzCode}
            clock={clock}
            onClick={() => setTzModalOpen(true)}
            innerRef={vcClock.ref}
            vcStyle={vcClock.style}
          />
          <SAProfileMenu tokens={t} firstName={saFirstName} lastName={saLastName} />
        </div>
      </header>

      <TimezoneModal
        open={tzModalOpen}
        currentTimezone={timezone}
        onSelect={(tz) => { setTimezone(tz); setTzModalOpen(false); }}
        onClose={() => setTzModalOpen(false)}
      />

      {phone.open && !phone.minimized && (
        <FloatingPhoneWindow
          pos={phone.pos}
          scale={phone.scale}
          modelId={phone.modelId}
          onClose={phone.closePhone}
          onMinimize={phone.toggleMinimize}
          onScaleChange={phone.handleScaleChange}
          onModelChange={phone.handleModelChange}
          onDragStart={phone.startDrag}
          appIconUrl={appIconUrl}
          appName={appName}
        />
      )}
    </>
  );
}

function AdminMsgDropdown({ entries, onEntryClick, t }: { entries: AdminNotifEntry[]; onEntryClick: (e: AdminNotifEntry) => void; t: ReturnType<typeof useThemeTokens> }) {
  return (
    <MessageBubblePopover
      entries={entries.map(e => {
        // Meme regle que le panel Groupe : responsable en ligne 1, entite en
        // ligne 2. Le mot de dernier recours suit la nature de l'expediteur.
        const who = conversationIdentity(
          { first_name: e.firstName, last_name: e.lastName, company: e.company, email: e.email },
          {},
          e.senderKind === 'company_super_admin' ? 'Groupe' : 'Société',
        );
        return {
          id: e.adminId,
          name: who.name,
          subtitle: who.subtitle,
          preview: e.preview,
          at: e.latestAt,
          unread: e.count,
        };
      })}
      onEntryClick={id => { const found = entries.find(x => x.adminId === id); if (found) onEntryClick(found); }}
      tokens={t}
    />
  );
}

function ClockButton({ tzLabel, tzCode, clock, onClick, innerRef, vcStyle }: { tzLabel: string; tzCode?: string; clock: string; onClick: () => void; innerRef?: React.RefObject<HTMLButtonElement | null>; vcStyle?: React.CSSProperties }) {
  const hasVc = !!vcStyle?.background;
  const [hovered, setHovered] = useState(false);
  const bg = hasVc ? undefined : (hovered ? 'rgba(245,158,11,0.12)' : 'rgba(245,158,11,0.06)');
  const bd = hasVc ? undefined : `1px solid ${hovered ? 'rgba(245,158,11,0.25)' : 'rgba(245,158,11,0.15)'}`;
  return (
    <button
      ref={innerRef}
      onClick={onClick}
      className="flex items-center gap-1 sm:gap-2 ml-1 sm:ml-2 px-2 sm:px-3 py-1.5 rounded-xl transition-all duration-200"
      style={{ background: bg, border: bd, ...vcStyle }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: vcStyle?.color ?? '#f59e0b' }} />
      <span className="text-xs font-medium hidden lg:block" style={{ color: vcStyle?.color ?? '#64748b' }}>{tzLabel}</span>
      {tzCode && <span className="text-xs font-medium hidden sm:block lg:hidden" style={{ color: vcStyle?.color ?? '#64748b' }}>{tzCode}</span>}
      <span className="text-xs font-semibold font-mono" style={{ color: vcStyle?.color ?? '#f59e0b' }}>{clock}</span>
    </button>
  );
}

interface TopBarHybridButtonProps {
  innerRef: React.RefObject<HTMLButtonElement | null>;
  vcStyle: React.CSSProperties | undefined;
  onClick: () => void;
  defaultBg: string;
  defaultBorder: string;
  hoverBg: string;
  hoverBorder: string;
  defaultIconColor: string;
  title: string;
  icon: React.ReactNode;
  label: string;
  dot?: string;
}

function TopBarHybridButton({ innerRef, vcStyle, onClick, defaultBg, defaultBorder, hoverBg, hoverBorder, defaultIconColor, title, icon, label, dot }: TopBarHybridButtonProps) {
  const hasVc = !!vcStyle?.background;
  const [hovered, setHovered] = useState(false);
  const bg = hasVc ? undefined : (hovered ? hoverBg : defaultBg);
  const bd = hasVc ? undefined : `1px solid ${hovered ? hoverBorder : defaultBorder}`;
  return (
    <button
      ref={innerRef}
      onClick={onClick}
      className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl transition-all duration-200 flex-shrink-0"
      style={{ background: bg, border: bd, ...vcStyle }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={title}
    >
      <span style={{ color: vcStyle?.color ?? defaultIconColor }}>{icon}</span>
      <span className="text-[11px] font-medium hidden sm:inline" style={{ color: vcStyle?.color ?? defaultIconColor }}>
        {label}
      </span>
      {dot && (
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dot, boxShadow: `0 0 6px ${dot}99` }} />
      )}
    </button>
  );
}
