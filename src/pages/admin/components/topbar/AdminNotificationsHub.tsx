import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Bell, ChevronLeft, X } from 'lucide-react';
import AdminNotificationCards, { type NotifCategory } from './AdminNotificationCards';
import AdminNotificationDetail from './AdminNotificationDetail';
import type { ClientNotifEntry, VendorNotifEntry, ConfirmedProposalEntry } from '../../TopBar';
import type { ProposalNotifEntry } from '../../dashboard/useAdminProposalNotifs';
import type { AgendaNotifEntry } from '../../../../hooks/useAgendaNotifications';
import type { AgendaEquipeNotifEntry } from '../../../../hooks/useAgendaEquipeNotifications';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';

export interface NotificationsHubProps {
  unreadClientCount: number;
  unreadClientEntries: ClientNotifEntry[];
  onClientEntryClick?: (entry: ClientNotifEntry) => void;
  unreadVendorCount: number;
  unreadVendorEntries: VendorNotifEntry[];
  onVendorEntryClick?: (entry: VendorNotifEntry) => void;
  agendaPersoCount: number;
  agendaPersoEntries: AgendaNotifEntry[];
  onAgendaPersoEntryClick?: (rdvId: string, type?: 'starting' | 'untreated') => void;
  agendaEquipeCount: number;
  agendaEquipeEntries: AgendaEquipeNotifEntry[];
  onAgendaEquipeEntryClick?: (rdvId: string, type?: 'starting' | 'untreated') => void;
  proposalsCount: number;
  proposalsEntries: ConfirmedProposalEntry[];
  onProposalEntryClick?: (proposalId: string) => void;
  confirmedCount: number;
  confirmedEntries: ConfirmedProposalEntry[];
  onConfirmedEntryClick?: (proposalId: string) => void;
  rescheduleCount: number;
  rescheduleEntries: ProposalNotifEntry[];
  onRescheduleEntryClick?: (proposalId: string) => void;
  rescheduleRequestCount: number;
  rescheduleRequestEntries: ProposalNotifEntry[];
  onRescheduleRequestEntryClick?: (proposalId: string) => void;
  unreadSuperAdminCount: number;
  onSuperAdminClick?: () => void;
  tokens: ThemeTokens;
}

function useSidebarWidth() {
  const [width, setWidth] = useState(0);
  const measure = useCallback(() => {
    const sidebar = document.querySelector('aside');
    setWidth(sidebar ? sidebar.getBoundingClientRect().width : 0);
  }, []);
  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    const obs = new MutationObserver(measure);
    const aside = document.querySelector('aside');
    if (aside) obs.observe(aside, { attributes: true, attributeFilter: ['class', 'style'] });
    return () => { window.removeEventListener('resize', measure); obs.disconnect(); };
  }, [measure]);
  return width;
}

export default function AdminNotificationsHub(props: NotificationsHubProps) {
  const { tokens: t } = props;
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<NotifCategory | null>(null);
  const [hovered, setHovered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const sidebarW = useSidebarWidth();

  const totalCount = props.unreadClientCount + props.unreadVendorCount + props.unreadSuperAdminCount
    + props.agendaPersoCount + props.agendaEquipeCount + props.proposalsCount
    + props.confirmedCount + props.rescheduleCount + props.rescheduleRequestCount;

  const close = () => { setOpen(false); setSelected(null); };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const selectedLabel = selected ? CATEGORY_LABELS[selected] : '';

  return (
    <div className="relative hidden md:block" ref={ref}>
      <BellButton open={open} hovered={hovered} setHovered={setHovered} totalCount={totalCount}
        onClick={() => { setOpen(prev => !prev); setSelected(null); }} />

      {open && createPortal(
        <div className="fixed inset-0 z-[9998] flex items-center justify-center"
          style={{ paddingLeft: sidebarW }}
          onClick={close}
        >
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] transition-opacity duration-200"
            style={{ paddingLeft: sidebarW }} />

          <div
            className="relative z-[9999] w-full rounded-2xl overflow-hidden
              animate-[notifSlideIn_0.25s_ease-out]"
            style={{
              maxWidth: 'min(680px, calc(100% - 48px))',
              maxHeight: '80vh',
              background: t.dropdown.bg,
              border: `1px solid ${t.dropdown.border}`,
              boxShadow: `0 25px 60px -12px rgba(0,0,0,0.5), ${t.dropdown.shadow}`,
              backdropFilter: 'blur(24px)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <NotifHeader t={t} selected={selected} setSelected={setSelected}
              selectedLabel={selectedLabel} totalCount={totalCount} onClose={close} />

            <div className="overflow-y-auto" style={{ maxHeight: 'calc(80vh - 56px)' }}>
              {!selected ? (
                <AdminNotificationCards {...props} onSelect={setSelected} />
              ) : (
                <AdminNotificationDetail category={selected} {...props} onClose={close} />
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

function BellButton({ open, hovered, setHovered, totalCount, onClick }: {
  open: boolean; hovered: boolean; setHovered: (v: boolean) => void;
  totalCount: number; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all duration-200"
      style={{
        background: open
          ? 'rgba(14,165,233,0.12)'
          : hovered ? 'rgba(14,165,233,0.08)' : 'rgba(14,165,233,0.04)',
        border: `1px solid ${open ? 'rgba(14,165,233,0.25)' : hovered ? 'rgba(14,165,233,0.18)' : 'rgba(14,165,233,0.10)'}`,
        boxShadow: open ? '0 0 12px rgba(14,165,233,0.08)' : 'none',
      }}
    >
      <Bell className="w-4 h-4 flex-shrink-0" style={{ color: '#0ea5e9' }} />
      <span className="text-[11px] font-medium hidden lg:inline" style={{ color: '#0ea5e9' }}>
        Notifications
      </span>
      {totalCount > 0 && (
        <span
          className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[9px] font-bold text-white"
          style={{
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            boxShadow: '0 0 8px rgba(239,68,68,0.5), 0 1px 3px rgba(0,0,0,0.2)',
          }}
        >
          {totalCount > 99 ? '99+' : totalCount}
        </span>
      )}
    </button>
  );
}

function NotifHeader({ t, selected, setSelected, selectedLabel, totalCount, onClose }: {
  t: ThemeTokens; selected: NotifCategory | null; setSelected: (v: NotifCategory | null) => void;
  selectedLabel: string; totalCount: number; onClose: () => void;
}) {
  return (
    <div className="flex items-center gap-2 px-5 py-3.5"
      style={{ borderBottom: `1px solid ${t.dropdown.border}` }}>
      {selected && (
        <button onClick={() => setSelected(null)}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5"
          style={{ color: t.dropdown.itemText }}>
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold tracking-wide" style={{ color: t.dropdown.itemTextHover }}>
          {selected ? selectedLabel : 'Notifications'}
        </p>
        {!selected && totalCount > 0 && (
          <p className="text-[11px] mt-0.5" style={{ color: t.dropdown.itemText }}>
            {totalCount} non lue{totalCount > 1 ? 's' : ''}
          </p>
        )}
      </div>
      {totalCount > 0 && !selected && (
        <span className="flex items-center justify-center min-w-[24px] h-[24px] px-1.5 rounded-full text-[10px] font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', boxShadow: '0 0 8px rgba(239,68,68,0.3)' }}>
          {totalCount > 99 ? '99+' : totalCount}
        </span>
      )}
      <button onClick={onClose}
        className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10 ml-1"
        style={{ color: t.dropdown.itemText }}>
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

const CATEGORY_LABELS: Record<NotifCategory, string> = {
  client: 'Messages clients',
  vendeur: 'Messages vendeurs',
  'super-admin': 'Super Admin',
  agenda: 'Agenda perso',
  equipe: 'Agenda equipe',
  propositions: 'Propositions RDV',
  rdv: 'RDV Confirmes',
  decalages: 'Reponses decalages',
  'demandes-decalage': 'Demandes de decalage',
};
