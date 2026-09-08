import { useState, useEffect, useRef } from 'react';
import { ChevronRight, Menu } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { useTimezone } from '../../hooks/useTimezone';
import { getCurrentTime } from '../../lib/timezone';
import TimezoneModal from '../../components/TimezoneSearchDropdown';
import type { AgendaNotifEntry } from '../../hooks/useAgendaNotifications';
import { VendorClockButton, VendorProfileDropdown } from './components/topbar';
import VendorMobileBellMenu from './components/topbar/VendorMobileBellMenu';
import VendorNotificationsHub from './components/topbar/VendorNotificationsHub';
import { vendorNotifCards, type VendorNotifData } from './components/topbar/vendorNotifCategories';

export interface VendorClientNotifEntry {
  clientAuthId: string;
  leadId: string;
  prenom: string;
  nom: string;
  email: string;
  count: number;
  latestAt: string;
  /** Dernier message recu, tel qu il a ete ecrit. */
  preview: string;
}

export interface ConfirmedProposalEntry {
  id: string;
  lead_name: string;
  created_at: string;
  created_by_role?: string;
  parent_proposal_id?: string | null;
}

interface VendorTopBarProps {
  breadcrumb: string;
  onMobileMenuToggle?: () => void;
  vendorName?: string;
  isImpersonating?: boolean;
  onBackToAdmin?: () => void;
  unreadAdminCount?: number;
  unreadAdminLatestAt?: string | null;
  unreadAdminPreview?: string;
  /** Identite reelle du responsable. Jamais un UUID. */
  adminName?: string;
  adminSubtitle?: string;
  onAdminNotifClick?: () => void;
  unreadClientCount?: number;
  unreadClientEntries?: VendorClientNotifEntry[];
  onClientEntryClick?: (entry: VendorClientNotifEntry) => void;
  agendaCount?: number;
  agendaEntries?: AgendaNotifEntry[];
  onAgendaEntryClick?: (rdvId: string, type?: 'starting' | 'untreated') => void;
  proposalsCount?: number;
  proposalsEntries?: ConfirmedProposalEntry[];
  onProposalEntryClick?: (proposalId: string) => void;
  confirmedCount?: number;
  confirmedEntries?: ConfirmedProposalEntry[];
  onConfirmedEntryClick?: (proposalId: string) => void;
  demoSlot?: React.ReactNode;
  demoStatus?: 'idle' | 'pending' | 'active';

  // --- Personnalisation du hub Notifications -------------------------------
  /** Reorganiser : personnalisation d'interface du titulaire du panel. */
  canReorderNotifCards?: boolean;
  /** Masquer : decide de ce qui existe. Talvex uniquement. */
  canHideNotifCards?: boolean;
  hiddenNotifCards?: Set<string>;
  onToggleNotifCard?: (key: string) => void;
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

export default function VendorTopBar({
  breadcrumb, onMobileMenuToggle, vendorName = 'Vendeur',
  unreadAdminCount = 0, unreadAdminLatestAt, unreadAdminPreview = '',
  adminName = 'Administrateur', adminSubtitle, onAdminNotifClick,
  unreadClientCount = 0, unreadClientEntries = [], onClientEntryClick,
  agendaCount = 0, agendaEntries = [], onAgendaEntryClick,
  proposalsCount = 0, proposalsEntries = [], onProposalEntryClick,
  confirmedCount = 0, confirmedEntries = [], onConfirmedEntryClick,
  canReorderNotifCards, canHideNotifCards, hiddenNotifCards, onToggleNotifCard,
  notifCardOrder, notifCardLabels, notifReordering,
  onStartNotifReorder, onCancelNotifReorder, onConfirmNotifReorder,
  onMoveNotifDraft, onRenameNotifDraft, onResetNotifDefault,
}: VendorTopBarProps) {
  const { theme, setTheme } = useTheme();
  const tokens = useThemeTokens();
  const { timezone, tzLabel, tzCode, setTimezone } = useTimezone();
  const [tzModalOpen, setTzModalOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [mobileNotifOpen, setMobileNotifOpen] = useState(false);
  const [mobileNotifCategory, setMobileNotifCategory] = useState<string | null>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const mobileNotifRef = useRef<HTMLDivElement>(null);
  const mobileNotifPanelRef = useRef<HTMLDivElement>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick(v => v + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
      if (mobileNotifRef.current && !mobileNotifRef.current.contains(e.target as Node) && (!mobileNotifPanelRef.current || !mobileNotifPanelRef.current.contains(e.target as Node))) {
        setMobileNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const clock = getCurrentTime(timezone);

  // Source unique des cinq categories : desktop et mobile lisent la meme chose.
  const notifData: VendorNotifData = {
    unreadAdminCount, unreadAdminLatestAt, unreadAdminPreview,
    adminName, adminSubtitle, onAdminNotifClick,
    unreadClientCount, unreadClientEntries, onClientEntryClick,
    agendaCount, agendaEntries, onAgendaEntryClick,
    proposalsCount, proposalsEntries, onProposalEntryClick,
    confirmedCount, confirmedEntries, onConfirmedEntryClick,
  };
  const cards = vendorNotifCards(notifData);
  // Une categorie masquee ne doit pas gonfler la pastille : elle n'existe pas
  // pour ce niveau.
  const totalNotifCount = cards
    .filter(c => !hiddenNotifCards?.has(c.key))
    .reduce((sum, c) => sum + c.count, 0);

  return (
    <div className="flex-shrink-0">
    <header
      className="relative z-30 flex items-center justify-between px-3 sm:px-4 md:px-6 h-14 md:h-16"
      style={{
        background: tokens.topbar.bg,
        borderBottom: `1px solid ${tokens.topbar.border}`,
        backdropFilter: 'blur(12px)',
      }}
    >
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
        {onMobileMenuToggle && (
          <button
            onClick={onMobileMenuToggle}
            className="md:hidden p-1.5 rounded-lg transition-colors"
            style={{ color: tokens.topbar.breadcrumbText }}
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <span className="text-xs hidden md:inline" style={{ color: tokens.topbar.breadcrumbPrefix }}>Principal</span>
        <ChevronRight className="w-3 h-3 hidden md:block" style={{ color: tokens.topbar.chevron }} />
        <span className="hidden md:inline text-sm font-semibold truncate" style={{ color: tokens.topbar.breadcrumbText }}>{breadcrumb}</span>
      </div>

      <div className="flex items-center gap-1 min-w-0">
        <VendorMobileBellMenu
          open={mobileNotifOpen}
          setOpen={setMobileNotifOpen}
          category={mobileNotifCategory}
          setCategory={setMobileNotifCategory}
          totalNotifCount={totalNotifCount}
          cards={cards}
          cardOrder={notifCardOrder}
          cardLabels={notifCardLabels}
          hiddenCards={hiddenNotifCards}
          data={notifData}
          timezone={timezone}
          tokens={tokens}
          containerRef={mobileNotifRef}
          panelRef={mobileNotifPanelRef}
        />

        <VendorNotificationsHub
          {...notifData}
          tokens={tokens}
          canReorderNotifCards={canReorderNotifCards}
          canHideNotifCards={canHideNotifCards}
          hiddenNotifCards={hiddenNotifCards}
          onToggleNotifCard={onToggleNotifCard}
          notifCardOrder={notifCardOrder}
          notifCardLabels={notifCardLabels}
          notifReordering={notifReordering}
          onStartNotifReorder={onStartNotifReorder}
          onCancelNotifReorder={onCancelNotifReorder}
          onConfirmNotifReorder={onConfirmNotifReorder}
          onMoveNotifDraft={onMoveNotifDraft}
          onRenameNotifDraft={onRenameNotifDraft}
          onResetNotifDefault={onResetNotifDefault}
        />

        <VendorClockButton tzLabel={tzLabel} tzCode={tzCode} clock={clock} onClick={() => setTzModalOpen(true)} />

        <VendorProfileDropdown
          vendorName={vendorName}
          theme={theme}
          setTheme={setTheme}
          tokens={tokens}
          open={profileDropdownOpen}
          setOpen={setProfileDropdownOpen}
          dropdownRef={profileDropdownRef}
        />
      </div>
    </header>

    <TimezoneModal
      open={tzModalOpen}
      currentTimezone={timezone}
      onSelect={(tz) => { setTimezone(tz); setTzModalOpen(false); }}
      onClose={() => setTzModalOpen(false)}
    />
    </div>
  );
}
