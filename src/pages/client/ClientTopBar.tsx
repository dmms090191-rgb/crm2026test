import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MessageCircle, CalendarCheck, CalendarClock, ChevronRight, ChevronDown, Sun, Moon, Menu, Bell } from 'lucide-react';
import { useTheme, type Theme } from '../../contexts/ThemeContext';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { useTimezone } from '../../hooks/useTimezone';
import { getCurrentTime } from '../../lib/timezone';
import TimezoneModal from '../../components/TimezoneSearchDropdown';
import type { AgendaNotifEntry } from '../../hooks/useAgendaNotifications';
import {
  ClientBadgeButton,
  ClientClockButton,
  ClientDropdownPanel,
  ClientDropdownHeader,
  ClientDropdownEmpty,
  ThemeOption,
  NotifRow,
  ClientAgendaNotifItem,
  PropositionNotifItem,
} from './components/topbar';

export interface PropositionNotifEntry {
  id: string;
  created_at: string;
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
  onPropositionEntryClick?: () => void;
}

const themeOptions: { value: Theme; label: string; icon: React.ReactNode }[] = [
  { value: 'dark', label: 'Sombre', icon: <Moon className="w-3.5 h-3.5" /> },
  { value: 'light', label: 'Clair', icon: <Sun className="w-3.5 h-3.5" /> },
];

export default function ClientTopBar({ breadcrumb, onMobileMenuToggle, clientName = 'Client', unreadMessageCount = 0, unreadLatestAt, onMessageNotifClick, agendaCount = 0, agendaEntries = [], onAgendaEntryClick, propositionsCount = 0, propositionsEntries = [], onPropositionEntryClick }: ClientTopBarProps) {
  const { theme, setTheme } = useTheme();
  const t = useThemeTokens();
  const { timezone, tzLabel, setTimezone } = useTimezone();
  const [tzModalOpen, setTzModalOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [msgDropdownOpen, setMsgDropdownOpen] = useState(false);
  const [agendaDropdownOpen, setAgendaDropdownOpen] = useState(false);
  const [proposDropdownOpen, setProposDropdownOpen] = useState(false);
  const [mobileNotifOpen, setMobileNotifOpen] = useState(false);
  const [mobileNotifCategory, setMobileNotifCategory] = useState<string | null>(null);
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
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const clock = getCurrentTime(timezone);
  const totalNotifCount = unreadMessageCount + agendaCount + propositionsCount;
  const badgeColors = { iconColor: t.topbar.notifIcon, iconHoverColor: t.topbar.notifIconHover, labelColor: t.topbar.notifLabel, labelHoverColor: t.topbar.notifLabelHover };

  const initials = clientName
    .split(' ')
    .map(w => w.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);

  function handleNotifItemClick() {
    setMsgDropdownOpen(false);
    if (onMessageNotifClick) {
      onMessageNotifClick();
    }
  }

  return (
    <>
    <header
      className="flex items-center justify-between px-3 sm:px-4 md:px-6 h-14 md:h-16 flex-shrink-0 transition-colors duration-300"
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
        <span className="text-xs hidden sm:inline" style={{ color: t.topbar.breadcrumbPrefix }}>Espace Client</span>
        <ChevronRight className="w-3 h-3 hidden sm:block" style={{ color: t.topbar.border }} />
        <span className="text-xs sm:text-sm font-semibold truncate" style={{ color: t.topbar.breadcrumbText }}>{breadcrumb}</span>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
        {/* Mobile bell button */}
        <div className="relative md:hidden" ref={mobileNotifRef}>
          <button
            onClick={() => { setMobileNotifOpen(prev => !prev); setMobileNotifCategory(null); }}
            className="relative p-2 rounded-lg transition-colors"
            style={{ color: t.topbar.notifIcon }}
          >
            <Bell className="w-5 h-5" />
            {totalNotifCount > 0 && (
              <span
                className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full"
                style={{
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  boxShadow: '0 0 6px rgba(239,68,68,0.4)',
                }}
              />
            )}
          </button>
          {mobileNotifOpen && createPortal(
            <div
              ref={mobileNotifPanelRef}
              className="fixed right-3 top-[3.75rem] w-[calc(100vw-24px)] max-w-72 rounded-xl overflow-hidden"
              style={{
                zIndex: 99999,
                background: t.dropdown.bg,
                border: `1px solid ${t.dropdown.border}`,
                boxShadow: `${t.dropdown.shadow}, 0 25px 50px -12px rgba(0,0,0,0.5)`,
              }}
            >
              {!mobileNotifCategory ? (
                <>
                  <div className="px-3 py-2 border-b" style={{ borderColor: t.dropdown.border }}>
                    <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: t.topbar.notifIcon }}>
                      Notifications
                    </p>
                  </div>
                  {([
                    { key: 'messages', icon: <MessageCircle className="w-4 h-4" />, label: 'Messages', count: unreadMessageCount },
                    { key: 'agenda', icon: <CalendarCheck className="w-4 h-4" />, label: 'Rendez-vous', count: agendaCount },
                    { key: 'propositions', icon: <CalendarClock className="w-4 h-4" />, label: 'Propositions RDV', count: propositionsCount },
                  ] as const).map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      className="flex items-center gap-3 w-full px-3 py-2.5 text-left transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                      onClick={() => setMobileNotifCategory(item.key)}
                    >
                      <span style={{ color: t.topbar.notifIcon }}>{item.icon}</span>
                      <span className="text-sm flex-1" style={{ color: t.dropdown.itemText }}>{item.label}</span>
                      {item.count > 0 && (
                        <span
                          className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold text-white"
                          style={{
                            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                            boxShadow: '0 0 6px rgba(239,68,68,0.4)',
                          }}
                        >
                          {item.count > 99 ? '99+' : item.count}
                        </span>
                      )}
                    </button>
                  ))}
                </>
              ) : (
                <>
                  <div className="px-3 py-2 border-b flex items-center gap-2" style={{ borderColor: t.dropdown.border }}>
                    <button onClick={() => setMobileNotifCategory(null)} className="text-xs" style={{ color: t.topbar.notifIcon }}>
                      <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                    </button>
                    <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: t.topbar.notifIcon }}>
                      {mobileNotifCategory === 'messages' && 'Messages'}
                      {mobileNotifCategory === 'agenda' && 'Rendez-vous'}
                      {mobileNotifCategory === 'propositions' && 'Propositions RDV'}
                    </p>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {mobileNotifCategory === 'messages' && (
                      unreadMessageCount === 0 ? (
                        <ClientDropdownEmpty text="Aucun nouveau message" tokens={t} />
                      ) : (
                        <NotifRow count={unreadMessageCount} latestAt={unreadLatestAt} tokens={t.dropdown} onClick={() => { handleNotifItemClick(); setMobileNotifOpen(false); setMobileNotifCategory(null); }} />
                      )
                    )}
                    {mobileNotifCategory === 'agenda' && (
                      agendaEntries.length === 0 ? (
                        <ClientDropdownEmpty text="Aucun rendez-vous imminent" tokens={t} />
                      ) : (
                        agendaEntries.map(entry => (
                          <ClientAgendaNotifItem key={entry.rdvId} entry={entry} tokens={t.dropdown} onClick={() => { onAgendaEntryClick?.(entry.rdvId); setMobileNotifOpen(false); setMobileNotifCategory(null); }} />
                        ))
                      )
                    )}
                    {mobileNotifCategory === 'propositions' && (
                      propositionsEntries.length === 0 ? (
                        <ClientDropdownEmpty text="Aucune nouvelle proposition" tokens={t} />
                      ) : (
                        propositionsEntries.map(entry => (
                          <PropositionNotifItem key={entry.id} entry={entry} tokens={t.dropdown} onClick={() => { setMobileNotifOpen(false); setMobileNotifCategory(null); onPropositionEntryClick?.(); }} />
                        ))
                      )
                    )}
                  </div>
                </>
              )}
            </div>,
            document.body
          )}
        </div>

        {/* Desktop notification pill */}
        <div
          className="hidden md:flex items-center gap-0.5 px-1 sm:px-1.5 py-1 rounded-xl"
          style={{
            background: t.topbar.notifPillBg,
            border: `1px solid ${t.topbar.notifPillBorder}`,
          }}
        >
          <div className="relative" ref={msgDropdownRef}>
            <ClientBadgeButton icon={<MessageCircle className="w-[15px] h-[15px]" />} label="Messages" count={unreadMessageCount} {...badgeColors} onClick={() => setMsgDropdownOpen(prev => !prev)} />
            {msgDropdownOpen && (
              <ClientDropdownPanel tokens={t} width="w-72" align="left">
                <ClientDropdownHeader label="Messages" tokens={t} />
                <div className="max-h-64 overflow-y-auto">
                  {unreadMessageCount === 0 ? (
                    <ClientDropdownEmpty text="Aucun nouveau message" tokens={t} />
                  ) : (
                    <NotifRow count={unreadMessageCount} latestAt={unreadLatestAt} tokens={t.dropdown} onClick={handleNotifItemClick} />
                  )}
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
                  {agendaEntries.length === 0 ? (
                    <ClientDropdownEmpty text="Aucun rendez-vous imminent" tokens={t} />
                  ) : (
                    agendaEntries.map(entry => (
                      <ClientAgendaNotifItem
                        key={entry.rdvId}
                        entry={entry}
                        tokens={t.dropdown}
                        onClick={() => {
                          onAgendaEntryClick?.(entry.rdvId);
                          setAgendaDropdownOpen(false);
                        }}
                      />
                    ))
                  )}
                </div>
              </ClientDropdownPanel>
            )}
          </div>
          <div className="w-px h-5" style={{ background: t.topbar.notifDivider }} />
          <div className="relative" ref={proposDropdownRef}>
            <ClientBadgeButton icon={<CalendarClock className="w-[15px] h-[15px]" />} label="Propositions RDV" count={propositionsCount} {...badgeColors} onClick={() => setProposDropdownOpen(prev => !prev)} />
            {proposDropdownOpen && (
              <ClientDropdownPanel tokens={t} width="w-72" align="right">
                <ClientDropdownHeader label="Propositions RDV" tokens={t} />
                <div className="max-h-64 overflow-y-auto">
                  {propositionsEntries.length === 0 ? (
                    <ClientDropdownEmpty text="Aucune nouvelle proposition" tokens={t} />
                  ) : (
                    propositionsEntries.map(entry => (
                      <PropositionNotifItem
                        key={entry.id}
                        entry={entry}
                        tokens={t.dropdown}
                        onClick={() => {
                          setProposDropdownOpen(false);
                          onPropositionEntryClick?.();
                        }}
                      />
                    ))
                  )}
                </div>
              </ClientDropdownPanel>
            )}
          </div>
        </div>

        <ClientClockButton tzLabel={tzLabel} clock={clock} onClick={() => setTzModalOpen(true)} />

        <div
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
                {themeOptions.map(opt => (
                  <ThemeOption
                    key={opt.value}
                    icon={opt.icon}
                    label={opt.label}
                    active={theme === opt.value}
                    onClick={() => { setTheme(opt.value); }}
                    tokens={t.dropdown}
                  />
                ))}
              </div>
            </ClientDropdownPanel>
          )}
        </div>
      </div>
    </header>

    <TimezoneModal
      open={tzModalOpen}
      currentTimezone={timezone}
      onSelect={(tz) => { setTimezone(tz); setTzModalOpen(false); }}
      onClose={() => setTzModalOpen(false)}
    />
    </>
  );
}
