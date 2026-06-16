import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Bell, ChevronLeft, X, EyeOff, Check, ArrowUpDown, RotateCcw } from 'lucide-react';
import AdminNotificationCards, { type NotifCategory, CARDS } from './AdminNotificationCards';
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
  canHideNotifCards?: boolean;
  hiddenNotifCards?: Set<string>;
  hiddenNotifCardsLoaded?: boolean;
  onToggleNotifCard?: (key: string) => void;
  canReorderNotifCards?: boolean;
  notifCardOrder?: string[];
  notifCardLabels?: Record<string, string>;
  notifReordering?: boolean;
  onStartNotifReorder?: () => void;
  onCancelNotifReorder?: () => void;
  onConfirmNotifReorder?: () => void;
  onMoveNotifDraft?: (from: number, to: number) => void;
  onRenameNotifDraft?: (key: string, newLabel: string) => void;
  onResetNotifDefault?: () => void;
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
  const {
    tokens: t, canHideNotifCards, hiddenNotifCards, onToggleNotifCard,
    canReorderNotifCards, notifCardOrder, notifCardLabels,
    notifReordering, onStartNotifReorder, onCancelNotifReorder, onConfirmNotifReorder,
    onMoveNotifDraft, onRenameNotifDraft, onResetNotifDefault,
  } = props;
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<NotifCategory | null>(null);
  const [hideEditMode, setHideEditMode] = useState(false);
  const [hovered, setHovered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const sidebarW = useSidebarWidth();

  const totalCount = props.unreadClientCount + props.unreadVendorCount + props.unreadSuperAdminCount
    + props.agendaPersoCount + props.agendaEquipeCount + props.proposalsCount
    + props.confirmedCount + props.rescheduleCount + props.rescheduleRequestCount;

  const close = () => {
    if (notifReordering) onCancelNotifReorder?.();
    setOpen(false); setSelected(null); setHideEditMode(false);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, notifReordering]);

  const selectedLabel = selected ? resolveSelectedLabel(selected, notifCardLabels) : '';

  return (
    <div className="relative hidden md:block" ref={ref}>
      <BellButton open={open} hovered={hovered} setHovered={setHovered} totalCount={totalCount}
        onClick={() => {
          if (notifReordering) onCancelNotifReorder?.();
          setOpen(prev => !prev); setSelected(null); setHideEditMode(false);
        }} />

      {open && createPortal(
        <div className="fixed inset-0 z-[9998] flex items-center justify-center"
          style={{ paddingLeft: sidebarW }} onClick={close}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] transition-opacity duration-200"
            style={{ paddingLeft: sidebarW }} />
          <div
            className="relative z-[9999] w-full rounded-2xl overflow-hidden animate-[notifSlideIn_0.25s_ease-out]"
            style={{
              maxWidth: 'min(680px, calc(100% - 48px))', maxHeight: '80vh',
              background: t.dropdown.bg, border: `1px solid ${t.dropdown.border}`,
              boxShadow: `0 25px 60px -12px rgba(0,0,0,0.5), ${t.dropdown.shadow}`,
              backdropFilter: 'blur(24px)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <NotifHeader
              t={t} selected={selected} setSelected={setSelected} selectedLabel={selectedLabel}
              totalCount={totalCount} onClose={close}
              canHide={canHideNotifCards && !selected && !notifReordering}
              hideEditMode={hideEditMode}
              onToggleHideMode={() => setHideEditMode(prev => !prev)}
              canReorder={canReorderNotifCards && !selected && !hideEditMode}
              reorderMode={!!notifReordering}
              onStartReorder={onStartNotifReorder}
              onConfirmReorder={onConfirmNotifReorder}
              onCancelReorder={onCancelNotifReorder}
              onResetDefault={onResetNotifDefault}
            />
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(80vh - 56px)' }}>
              {!selected ? (
                <AdminNotificationCards
                  {...props} onSelect={setSelected}
                  hideEditMode={hideEditMode} hiddenCards={hiddenNotifCards} onToggleCard={onToggleNotifCard}
                  cardOrder={notifCardOrder} cardLabels={notifCardLabels}
                  reorderMode={notifReordering} onMoveDraft={onMoveNotifDraft} onRenameDraft={onRenameNotifDraft}
                />
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

function resolveSelectedLabel(cat: NotifCategory, labels?: Record<string, string>): string {
  const custom = labels?.[cat];
  if (custom) return custom;
  return CATEGORY_LABELS[cat];
}

function BellButton({ open, hovered, setHovered, totalCount, onClick }: {
  open: boolean; hovered: boolean; setHovered: (v: boolean) => void;
  totalCount: number; onClick: () => void;
}) {
  return (
    <button onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all duration-200"
      style={{
        background: open ? 'rgba(14,165,233,0.12)' : hovered ? 'rgba(14,165,233,0.08)' : 'rgba(14,165,233,0.04)',
        border: `1px solid ${open ? 'rgba(14,165,233,0.25)' : hovered ? 'rgba(14,165,233,0.18)' : 'rgba(14,165,233,0.10)'}`,
        boxShadow: open ? '0 0 12px rgba(14,165,233,0.08)' : 'none',
      }}>
      <Bell className="w-4 h-4 flex-shrink-0" style={{ color: '#0ea5e9' }} />
      <span className="text-[11px] font-medium hidden lg:inline" style={{ color: '#0ea5e9' }}>Notifications</span>
      {totalCount > 0 && (
        <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[9px] font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', boxShadow: '0 0 8px rgba(239,68,68,0.5), 0 1px 3px rgba(0,0,0,0.2)' }}>
          {totalCount > 99 ? '99+' : totalCount}
        </span>
      )}
    </button>
  );
}

function NotifHeader({ t, selected, setSelected, selectedLabel, totalCount, onClose,
  canHide, hideEditMode, onToggleHideMode,
  canReorder, reorderMode, onStartReorder, onConfirmReorder, onCancelReorder, onResetDefault,
}: {
  t: ThemeTokens; selected: NotifCategory | null; setSelected: (v: NotifCategory | null) => void;
  selectedLabel: string; totalCount: number; onClose: () => void;
  canHide?: boolean; hideEditMode?: boolean; onToggleHideMode?: () => void;
  canReorder?: boolean; reorderMode?: boolean;
  onStartReorder?: () => void; onConfirmReorder?: () => void;
  onCancelReorder?: () => void; onResetDefault?: () => void;
}) {
  const [btnHovered, setBtnHovered] = useState('');

  return (
    <div className="flex items-center gap-2 px-5 py-3.5" style={{ borderBottom: `1px solid ${t.dropdown.border}` }}>
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
        {!selected && totalCount > 0 && !hideEditMode && !reorderMode && (
          <p className="text-[11px] mt-0.5" style={{ color: t.dropdown.itemText }}>
            {totalCount} non lue{totalCount > 1 ? 's' : ''}
          </p>
        )}
        {hideEditMode && (
          <p className="text-[11px] mt-0.5" style={{ color: '#f59e0b' }}>
            Cliquez sur une carte pour la masquer ou l'afficher
          </p>
        )}
        {reorderMode && (
          <p className="text-[11px] mt-0.5" style={{ color: '#0ea5e9' }}>
            Glissez ou utilisez les fleches pour reorganiser
          </p>
        )}
      </div>

      {reorderMode ? (
        <div className="flex items-center gap-1.5">
          <HdrBtn label="Par defaut" icon={<RotateCcw className="w-3.5 h-3.5" />}
            bg="rgba(148,163,184,0.08)" border="rgba(148,163,184,0.15)" color="#94a3b8"
            hoverBg="rgba(148,163,184,0.14)" hoverBorder="rgba(148,163,184,0.25)"
            hovered={btnHovered === 'reset'} setHovered={v => setBtnHovered(v ? 'reset' : '')}
            onClick={onResetDefault} />
          <HdrBtn label="Valider" icon={<Check className="w-3.5 h-3.5" />}
            bg="rgba(34,197,94,0.10)" border="rgba(34,197,94,0.20)" color="#22c55e"
            hoverBg="rgba(34,197,94,0.15)" hoverBorder="rgba(34,197,94,0.35)"
            hovered={btnHovered === 'confirm'} setHovered={v => setBtnHovered(v ? 'confirm' : '')}
            onClick={onConfirmReorder} />
          <HdrBtn label="Annuler" icon={<X className="w-3.5 h-3.5" />}
            bg="rgba(248,113,113,0.08)" border="rgba(248,113,113,0.20)" color="#f87171"
            hoverBg="rgba(248,113,113,0.14)" hoverBorder="rgba(248,113,113,0.30)"
            hovered={btnHovered === 'cancel'} setHovered={v => setBtnHovered(v ? 'cancel' : '')}
            onClick={onCancelReorder} />
        </div>
      ) : (
        <>
          {canReorder && (
            <HdrBtn label="Reorganiser" icon={<ArrowUpDown className="w-3.5 h-3.5" />}
              bg="rgba(14,165,233,0.06)" border="rgba(14,165,233,0.12)" color="#0ea5e9"
              hoverBg="rgba(14,165,233,0.12)" hoverBorder="rgba(14,165,233,0.25)"
              hovered={btnHovered === 'reorder'} setHovered={v => setBtnHovered(v ? 'reorder' : '')}
              onClick={onStartReorder} />
          )}
          {canHide && (
            <HdrBtn
              label={hideEditMode ? 'Terminer' : 'Masquer'}
              icon={hideEditMode ? <Check className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              bg={hideEditMode ? 'rgba(34,197,94,0.10)' : 'rgba(148,163,184,0.06)'}
              border={hideEditMode ? 'rgba(34,197,94,0.20)' : 'rgba(148,163,184,0.12)'}
              color={hideEditMode ? '#22c55e' : t.dropdown.itemText}
              hoverBg={hideEditMode ? 'rgba(34,197,94,0.15)' : 'rgba(148,163,184,0.12)'}
              hoverBorder={hideEditMode ? 'rgba(34,197,94,0.35)' : 'rgba(148,163,184,0.25)'}
              hovered={btnHovered === 'hide'} setHovered={v => setBtnHovered(v ? 'hide' : '')}
              onClick={onToggleHideMode}
            />
          )}
          {totalCount > 0 && !selected && !hideEditMode && (
            <span className="flex items-center justify-center min-w-[24px] h-[24px] px-1.5 rounded-full text-[10px] font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', boxShadow: '0 0 8px rgba(239,68,68,0.3)' }}>
              {totalCount > 99 ? '99+' : totalCount}
            </span>
          )}
        </>
      )}

      {!reorderMode && (
        <button onClick={onClose}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10 ml-1"
          style={{ color: t.dropdown.itemText }}>
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

function HdrBtn({ label, icon, bg, border, color, hoverBg, hoverBorder, hovered, setHovered, onClick }: {
  label: string; icon: ReactNode; bg: string; border: string; color: string;
  hoverBg: string; hoverBorder: string; hovered: boolean; setHovered: (v: boolean) => void;
  onClick?: () => void;
}) {
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200"
      style={{ background: hovered ? hoverBg : bg, border: `1px solid ${hovered ? hoverBorder : border}`, color }}>
      {icon}{label}
    </button>
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
