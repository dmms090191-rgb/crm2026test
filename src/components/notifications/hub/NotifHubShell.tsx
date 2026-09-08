import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { BellButton, NotifHeader } from './NotifHubChrome';
import NotifHubCards from './NotifHubCards';
import type { HubCardDef } from './notifHubTypes';
import type { ThemeTokens } from '../../../lib/themeTokensTypes';

/**
 * Hub Notifications : une cloche unique, un modal, N categories.
 *
 * Le meme composant sert le panel Societe et le panel Commercial. Chacun fournit
 * ses cartes (avec leurs compteurs reels) et le rendu du detail d'une categorie.
 * Le hub ne connait aucun metier.
 *
 * Deux personnalisations, volontairement distinctes :
 *  - REORGANISER (`canReorder`) : personnalisation d'interface, ouverte au
 *    titulaire du panel.
 *  - MASQUER (`canHide`) : decide de ce qui EXISTE, et pilotera les forfaits.
 *    Refuse par defaut, comme dans la Sidebar V2.
 */

export interface NotifHubShellProps {
  tokens: ThemeTokens;
  /** Cartes dans leur ordre PAR DEFAUT, compteurs reels inclus. */
  cards: HubCardDef[];
  /** Rendu du contenu d'une categorie. `close` ferme le modal entier. */
  renderDetail: (key: string, close: () => void) => ReactNode;
  /**
   * Titre de l'en-tete quand une categorie est ouverte, si differe du libelle
   * de sa carte. Le panel Societe en a un jeu propre (« Client » sur la carte,
   * « Messages clients » en en-tete). Un renommage utilisateur prime toujours.
   */
  headerLabels?: Record<string, string>;

  canReorder?: boolean;
  /** Droit de masquer / reafficher. Refuse par defaut : Talvex uniquement. */
  canHide?: boolean;

  hiddenCards?: Set<string>;
  onToggleCard?: (key: string) => void;
  cardOrder?: string[];
  cardLabels?: Record<string, string>;
  reordering?: boolean;
  onStartReorder?: () => void;
  onCancelReorder?: () => void;
  onConfirmReorder?: () => void;
  onMoveDraft?: (from: number, to: number) => void;
  onRenameDraft?: (key: string, newLabel: string) => void;
  onResetDefault?: () => void;
}

/**
 * Largeur de la sidebar, pour centrer le modal sur la zone de contenu et non
 * sur la fenetre. Mesuree en direct : la sidebar est repliable.
 */
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

export default function NotifHubShell({
  tokens: t, cards, renderDetail,
  canReorder, canHide = false,
  hiddenCards, onToggleCard, cardOrder, cardLabels,
  reordering, onStartReorder, onCancelReorder, onConfirmReorder,
  onMoveDraft, onRenameDraft, onResetDefault, headerLabels,
}: NotifHubShellProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [hideEditMode, setHideEditMode] = useState(false);
  const [hovered, setHovered] = useState(false);
  const sidebarW = useSidebarWidth();

  // Le total ne compte que ce que ce niveau voit reellement : une categorie
  // masquee par Talvex ne doit pas gonfler la pastille.
  const totalCount = cards
    .filter(c => !hiddenCards?.has(c.key))
    .reduce((sum, c) => sum + c.count, 0);

  const close = useCallback(() => {
    if (reordering) onCancelReorder?.();
    setOpen(false); setSelected(null); setHideEditMode(false);
  }, [reordering, onCancelReorder]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close]);

  const selectedLabel = selected
    ? (cardLabels?.[selected] || headerLabels?.[selected]
       || cards.find(c => c.key === selected)?.label || '')
    : '';

  return (
    <div className="relative hidden md:block">
      <BellButton open={open} hovered={hovered} setHovered={setHovered} totalCount={totalCount}
        onClick={() => {
          if (reordering) onCancelReorder?.();
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
              canHide={canHide && !selected && !reordering}
              hideEditMode={hideEditMode}
              onToggleHideMode={() => setHideEditMode(prev => !prev)}
              canReorder={canReorder && !selected && !hideEditMode}
              reorderMode={!!reordering}
              onStartReorder={onStartReorder}
              onConfirmReorder={onConfirmReorder}
              onCancelReorder={onCancelReorder}
              onResetDefault={onResetDefault}
            />
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(80vh - 56px)' }}>
              {!selected ? (
                <NotifHubCards
                  cards={cards} tokens={t} onSelect={setSelected}
                  hideEditMode={hideEditMode} hiddenCards={hiddenCards} onToggleCard={onToggleCard}
                  cardOrder={cardOrder} cardLabels={cardLabels}
                  reorderMode={reordering} onMoveDraft={onMoveDraft} onRenameDraft={onRenameDraft}
                />
              ) : renderDetail(selected, close)}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
