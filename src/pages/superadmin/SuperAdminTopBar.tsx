import { useState, useEffect, useRef } from 'react';
import { ChevronRight, Menu, Clock, MessageSquare, Smartphone, Paintbrush } from 'lucide-react';
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

const viewLabels: Record<string, string> = {
  dashboard: 'Dashboard RA', 'super-admins': 'Liste Super Admins RA', admins: 'Liste admins RA', 'chat-admin': 'Chat Admin RA',
  'documentation-crm': 'Documentation CRM RA', system: 'System RA', sauvegarde: 'Sauvegarde & restauration RA',
  'mon-compte': 'Mon compte RA', 'tests-systeme': 'Tests Systeme RA', 'crm-societe': 'CRM Societe RA',
  statuts: 'Statuts RA', 'api-ia': 'API IA RA', 'cerveau-ia': 'Cerveau IA SA RA', sites: 'Sites & Domaines RA',
  'fonctions-talvex': 'Fonctions Talvex RA', 'site-talvex': 'Site RA', application: 'Application RA',
  logo: 'Logo RA', ameliorations: 'Ameliorations RA', tuto: 'Tuto RA', themes: 'Gestion themes RA', 'editeur-ia': 'Editeur IA RA',
  'calquer-logo': 'Calquer logo RA',
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
          <span className="text-xs hidden md:inline" style={{ color: vcBreadcrumb.style?.color ?? t.topbar.breadcrumbPrefix }}>ROIS ADMIN</span>
          <ChevronRight className="w-3 h-3 hidden md:block" style={{ color: vcBreadcrumb.style?.color ?? t.topbar.border }} />
          <span className="hidden md:inline text-sm font-semibold truncate" style={{ color: vcBreadcrumb.style?.color ?? t.topbar.breadcrumbText }}>
            {viewLabels[activeView] || 'Dashboard'}
          </span>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 min-w-0">
          {/* Admin messages */}
          <div className="relative flex-shrink-0" ref={msgDropdownRef}>
            <button
              ref={vcAdminMsg.ref}
              onClick={() => setMsgDropdownOpen(prev => !prev)}
              className="relative flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl transition-all duration-200"
              style={{
                background: unreadAdminMsgCount > 0 ? 'rgba(245,158,11,0.1)' : 'rgba(245,158,11,0.04)',
                border: `1px solid ${unreadAdminMsgCount > 0 ? 'rgba(245,158,11,0.25)' : 'rgba(245,158,11,0.1)'}`,
                ...vcAdminMsg.style,
              }}
            >
              <MessageSquare className="w-4 h-4 flex-shrink-0" style={{ color: vcAdminMsg.style?.color ?? (unreadAdminMsgCount > 0 ? '#f59e0b' : t.topbar.breadcrumbPrefix) }} />
              <span className="text-[11px] font-medium hidden sm:inline" style={{ color: vcAdminMsg.style?.color ?? (unreadAdminMsgCount > 0 ? '#f59e0b' : t.topbar.breadcrumbPrefix) }}>Admin</span>
              {unreadAdminMsgCount > 0 && (
                <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold text-white px-1 flex-shrink-0" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', boxShadow: '0 0 8px rgba(245,158,11,0.4)' }}>
                  {unreadAdminMsgCount > 99 ? '99+' : unreadAdminMsgCount}
                </span>
              )}
            </button>
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
  const dd = t.dropdown;
  return (
    <div className="fixed right-3 left-3 sm:left-auto sm:absolute sm:right-0 sm:w-72 top-14 sm:top-full sm:mt-2 rounded-xl overflow-hidden z-50"
      style={{ background: dd.bg, border: `1px solid ${dd.border}`, boxShadow: dd.shadow, backdropFilter: 'blur(16px)' }}>
      <div className="px-3 py-2" style={{ borderBottom: `1px solid ${dd.border}` }}>
        <p className="text-xs font-semibold" style={{ color: dd.itemText }}>Messages Admin</p>
      </div>
      <div className="max-h-64 overflow-y-auto py-1">
        {entries.length === 0 ? (
          <p className="px-3 py-3 text-xs text-center" style={{ color: dd.itemText }}>Aucun message non lu</p>
        ) : entries.map(entry => {
          const name = [entry.firstName, entry.lastName].filter(Boolean).join(' ');
          return (
            <button key={entry.adminId} onClick={() => onEntryClick(entry)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors duration-150 hover:opacity-80"
              style={{ background: 'transparent' }}
              onMouseEnter={e => { e.currentTarget.style.background = dd.itemBgHover; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                {(entry.firstName || entry.email || '?').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium whitespace-normal break-words" style={{ color: dd.itemText }}>
                  {name ? `L'admin ${name} vous a envoye un message.` : 'Un admin vous a envoye un message.'}
                </p>
                <p className="text-[10px] mt-0.5 truncate" style={{ color: dd.itemTextHover }}>
                  {entry.count} message{entry.count > 1 ? 's' : ''} non lu{entry.count > 1 ? 's' : ''}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
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
      className="flex items-center gap-2 ml-2 px-3 py-1.5 rounded-xl transition-all duration-200"
      style={{ background: bg, border: bd, ...vcStyle }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Clock className="w-3.5 h-3.5" style={{ color: vcStyle?.color ?? '#f59e0b' }} />
      <span className="text-xs font-medium hidden sm:block" style={{ color: vcStyle?.color ?? '#64748b' }}>{tzLabel}</span>
      {tzCode && <span className="text-xs font-medium sm:hidden" style={{ color: vcStyle?.color ?? '#64748b' }}>{tzCode}</span>}
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
