import { useState, useEffect, useRef } from 'react';
import { MessageCircle, CalendarCheck, CalendarClock, ChevronRight, ChevronDown, Menu, Palette, Bell } from 'lucide-react';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { useTimezone } from '../../hooks/useTimezone';
import { getCurrentTime } from '../../lib/timezone';
import TimezoneModal from '../../components/TimezoneSearchDropdown';
import ThemeSelectorModal from '../../components/theme/ThemeSelectorModal';
import PushNotificationSettings from '../../components/notifications/PushNotificationSettings';
import TopBarOverflowMenu, { type OverflowItem } from '../../components/TopBarOverflowMenu';
import { useCompanyId } from '../../hooks/useCompanyId';
import { supabase } from '../../lib/supabase';
import type { AgendaNotifEntry } from '../../hooks/useAgendaNotifications';
import {
  ClientBadgeButton,
  ClientClockButton,
  ClientDropdownPanel,
  ClientDropdownHeader,
  ClientDropdownEmpty,
  NotifRow,
  ClientAgendaNotifItem,
  PropositionNotifItem,
} from './components/topbar';
import ClientMobileBellMenu from './components/topbar/ClientMobileBellMenu';

export interface PropositionNotifEntry {
  id: string;
  lead_name: string;
  created_at: string;
  created_by_role?: string;
  parent_proposal_id?: string | null;
  status?: string;
  reschedule_status?: string | null;
}
interface ClientTopBarProps {
  breadcrumb: string;
  onMobileMenuToggle?: () => void;
  clientName?: string;
  unreadMessageCount?: number;
  unreadLatestAt?: string | null;
  onMessageNotifClick?: () => void;
  agendaCount?: number;
  agendaEntries?: AgendaNotifEntry[];
  onAgendaEntryClick?: (rdvId: string) => void;
  propositionsCount?: number;
  propositionsEntries?: PropositionNotifEntry[];
  onPropositionEntryClick?: (proposalId: string) => void;
}

export default function ClientTopBar({ breadcrumb, onMobileMenuToggle, clientName = 'Client', unreadMessageCount = 0, unreadLatestAt, onMessageNotifClick, agendaCount = 0, agendaEntries = [], onAgendaEntryClick, propositionsCount = 0, propositionsEntries = [], onPropositionEntryClick }: ClientTopBarProps) {
  const t = useThemeTokens();
  const { timezone, tzLabel, tzCode, setTimezone } = useTimezone();
  const [tzModalOpen, setTzModalOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const [pushModalOpen, setPushModalOpen] = useState(false);
  const [clientUserId, setClientUserId] = useState<string | null>(null);
  const clientCompanyId = useCompanyId();
  const [msgDropdownOpen, setMsgDropdownOpen] = useState(false);
  const [agendaDropdownOpen, setAgendaDropdownOpen] = useState(false);
  const [proposDropdownOpen, setProposDropdownOpen] = useState(false);
  const [mobileNotifOpen, setMobileNotifOpen] = useState(false);
  const [mobileNotifCategory, setMobileNotifCategory] = useState<string | null>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const msgDropdownRef = useRef<HTMLDivElement>(null);
  const agendaDropdownRef = useRef<HTMLDivElement>(null);
  const proposDropdownRef = useRef<HTMLDivElement>(null);
  const mobileNotifRef = useRef<HTMLDivElement>(null);
  const mobileNotifPanelRef = useRef<HTMLDivElement>(null);
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(v => v + 1), 60_000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => { if (user) setClientUserId(user.id); });
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (msgDropdownRef.current && !msgDropdownRef.current.contains(e.target as Node)) {
        setMsgDropdownOpen(false);
      }
      if (agendaDropdownRef.current && !agendaDropdownRef.current.contains(e.target as Node)) {
        setAgendaDropdownOpen(false);
      }
      if (proposDropdownRef.current && !proposDropdownRef.current.contains(e.target as Node)) {
        setProposDropdownOpen(false);
      }
      if (mobileNotifRef.current && !mobileNotifRef.current.contains(e.target as Node) && (!mobileNotifPanelRef.current || !mobileNotifPanelRef.current.contains(e.target as Node))) {
        setMobileNotifOpen(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const clock = getCurrentTime(timezone);
  const totalNotifCount = unreadMessageCount + agendaCount + propositionsCount;
  const badgeColors = { iconColor: t.topbar.notifIcon, iconHoverColor: t.topbar.notifIconHover, labelColor: t.topbar.notifLabel, labelHoverColor: t.topbar.notifLabelHover, hoverBg: t.surface.hover };
  const initials = clientName.split(' ').map(w => w.charAt(0)).join('').toUpperCase().slice(0, 2);

  function handleNotifItemClick() {
    setMsgDropdownOpen(false);
    if (onMessageNotifClick) {
      onMessageNotifClick();
    }
  }

  return (
    <>
    <header
      className="relative z-30 flex items-center justify-between px-3 sm:px-4 md:px-6 h-14 md:h-16 flex-shrink-0"
      style={{
        background: t.topbar.bg,
        borderBottom: `1px solid ${t.topbar.border}`,
        backdropFilter: 'blur(12px)',
      }}
    >
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
        {onMobileMenuToggle && (
          <button
            onClick={onMobileMenuToggle}
            className="md:hidden p-1.5 rounded-lg transition-colors"
            style={{ color: t.topbar.breadcrumbText }}
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <span className="text-xs hidden md:inline" style={{ color: t.topbar.breadcrumbPrefix }}>Espace Client</span>
        <ChevronRight className="w-3 h-3 hidden md:block" style={{ color: t.topbar.border }} />
        <span className="hidden md:inline text-sm font-semibold truncate" style={{ color: t.topbar.breadcrumbText }}>{breadcrumb}</span>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
        <ClientMobileBellMenu
          open={mobileNotifOpen}
          setOpen={setMobileNotifOpen}
          category={mobileNotifCategory}
          setCategory={setMobileNotifCategory}
          totalNotifCount={totalNotifCount}
          unreadMessageCount={unreadMessageCount}
          unreadLatestAt={unreadLatestAt}
          onMessageNotifClick={handleNotifItemClick}
          agendaCount={agendaCount}
          agendaEntries={agendaEntries}
          onAgendaEntryClick={onAgendaEntryClick}
          propositionsCount={propositionsCount}
          propositionsEntries={propositionsEntries}
          onPropositionEntryClick={onPropositionEntryClick}
          timezone={timezone}
          tokens={t}
          containerRef={mobileNotifRef}
          panelRef={mobileNotifPanelRef}
        />

        {/* Desktop notification pill */}
        <div
          className="hidden md:flex items-center gap-0.5 px-1 sm:px-1.5 py-1 rounded-xl"
          style={{ background: t.topbar.notifPillBg, border: `1px solid ${t.topbar.notifPillBorder}` }}
        >
          <div className="relative" ref={msgDropdownRef}>
            <ClientBadgeButton icon={<MessageCircle className="w-[15px] h-[15px]" />} label="Messages" count={unreadMessageCount} {...badgeColors} onClick={() => setMsgDropdownOpen(prev => !prev)} />
            {msgDropdownOpen && (
              <ClientDropdownPanel tokens={t} width="w-72" align="left">
                <ClientDropdownHeader label="Messages" tokens={t} />
                <div className="max-h-64 overflow-y-auto">
                  {unreadMessageCount === 0 ? <ClientDropdownEmpty text="Aucun nouveau message" tokens={t} /> : <NotifRow count={unreadMessageCount} latestAt={unreadLatestAt} tokens={t.dropdown} onClick={handleNotifItemClick} />}
                </div>
              </ClientDropdownPanel>
            )}
          </div>
          <div className="w-px h-5" style={{ background: t.topbar.notifDivider }} />
          <div className="relative" ref={agendaDropdownRef}>
            <ClientBadgeButton icon={<CalendarCheck className="w-[15px] h-[15px]" />} label="Rendez-vous" count={agendaCount} {...badgeColors} onClick={() => setAgendaDropdownOpen(prev => !prev)} />
            {agendaDropdownOpen && (
              <ClientDropdownPanel tokens={t} width="w-72" align="right">
                <ClientDropdownHeader label="Rendez-vous" tokens={t} />
                <div className="max-h-64 overflow-y-auto">
                  {agendaEntries.length === 0 ? <ClientDropdownEmpty text="Aucun rendez-vous imminent" tokens={t} /> : agendaEntries.map(entry => (
                    <ClientAgendaNotifItem key={entry.rdvId} entry={entry} tokens={t.dropdown} onClick={() => { onAgendaEntryClick?.(entry.rdvId); setAgendaDropdownOpen(false); }} />
                  ))}
                </div>
              </ClientDropdownPanel>
            )}
          </div>
          {/* Propositions RDV: visible on xl+, otherwise in overflow */}
          <div className="hidden xl:contents">
            <div className="w-px h-5" style={{ background: t.topbar.notifDivider }} />
            <div className="relative" ref={proposDropdownRef}>
              <ClientBadgeButton icon={<CalendarClock className="w-[15px] h-[15px]" />} label="Propositions RDV" count={propositionsCount} {...badgeColors} onClick={() => setProposDropdownOpen(prev => !prev)} />
              {proposDropdownOpen && (
                <ClientDropdownPanel tokens={t} width="w-72" align="right">
                  <ClientDropdownHeader label="Propositions RDV" tokens={t} />
                  <div className="max-h-64 overflow-y-auto">
                    {propositionsEntries.length === 0 ? <ClientDropdownEmpty text="Aucune nouvelle proposition" tokens={t} /> : propositionsEntries.map(entry => (
                      <PropositionNotifItem key={entry.id} entry={entry} tokens={t.dropdown} onClick={() => { setProposDropdownOpen(false); onPropositionEntryClick?.(entry.id); }} />
                    ))}
                  </div>
                </ClientDropdownPanel>
              )}
            </div>
          </div>
          <div className="xl:hidden flex items-center">
            <div className="w-px h-5" style={{ background: t.topbar.notifDivider }} />
            <TopBarOverflowMenu items={[{ key: 'propositions', icon: <CalendarClock className="w-4 h-4" />, label: 'Propositions RDV', count: propositionsCount, onClick: () => setProposDropdownOpen(prev => !prev) }] as OverflowItem[]} tokens={t} />
          </div>
        </div>

        <ClientClockButton tzLabel={tzLabel} tzCode={tzCode} clock={clock} onClick={() => setTzModalOpen(true)} />

        <div
          ref={profileDropdownRef}
          className="relative ml-2 pl-4"
          style={{ borderLeft: `1px solid ${t.topbar.notifDivider}` }}
        >
          <button
            onClick={() => setDropdownOpen(prev => !prev)}
            className="flex items-center gap-3 px-3 py-1.5 rounded-xl transition-all duration-200"
            style={{
              background: dropdownOpen ? t.topbar.profileBtnBgOpen : t.topbar.profileBtnBg,
              border: `1px solid ${t.topbar.profileBtnBorder}`,
            }}
            onMouseEnter={e => {
              if (!dropdownOpen) e.currentTarget.style.background = t.topbar.profileBtnBgHover;
            }}
            onMouseLeave={e => {
              if (!dropdownOpen) e.currentTarget.style.background = t.topbar.profileBtnBg;
            }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
                boxShadow: '0 0 12px rgba(14,165,233,0.3)',
              }}
            >
              {initials}
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-xs font-semibold leading-tight" style={{ color: t.topbar.profileName }}>{clientName}</p>
              <p className="text-[9px] tracking-wider uppercase" style={{ color: t.topbar.profileRole }}>Client</p>
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 hidden lg:block ${dropdownOpen ? 'rotate-180' : ''}`}
              style={{ color: t.topbar.chevron }}
            />
          </button>

          {dropdownOpen && (
            <ClientDropdownPanel tokens={t} width="w-56" align="right">
              <div className="py-1">
                {[
                  { Icon: Palette, label: 'Themes', sub: 'Personnaliser l\'apparence', action: () => setThemeModalOpen(true) },
                  { Icon: Bell, label: 'Notifications telephone', sub: 'Alertes push en temps reel', action: () => setPushModalOpen(true) },
                ].map(item => (
                  <button key={item.label} onClick={() => { setDropdownOpen(false); item.action(); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs transition-colors duration-150"
                    style={{ color: t.dropdown.itemText }}
                    onMouseEnter={e => { e.currentTarget.style.background = t.dropdown.itemBgHover; e.currentTarget.style.color = t.dropdown.itemTextHover; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = t.dropdown.itemText; }}
                  >
                    <item.Icon className="w-4 h-4" />
                    <div className="flex flex-col items-start">
                      <span className="font-semibold">{item.label}</span>
                      <span className="text-[10px] opacity-60">{item.sub}</span>
                    </div>
                  </button>
                ))}
              </div>
            </ClientDropdownPanel>
          )}
        </div>
      </div>
    </header>

    <ThemeSelectorModal open={themeModalOpen} onClose={() => setThemeModalOpen(false)} />
    <PushNotificationSettings open={pushModalOpen} onClose={() => setPushModalOpen(false)} userId={clientUserId} role="client" companyId={clientCompanyId} tokens={t} />

    <TimezoneModal
      open={tzModalOpen}
      currentTimezone={timezone}
      onSelect={(tz) => { setTimezone(tz); setTzModalOpen(false); }}
      onClose={() => setTzModalOpen(false)}
    />
    </>
  );
}
