import { useState, useRef } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import NotifHubReorderRow from './NotifHubReorderRow';
import type { HubCardDef } from './notifHubTypes';
import type { ThemeTokens } from '../../../lib/themeTokensTypes';

/**
 * Grille des categories du hub Notifications, partagee par tous les panels.
 *
 * Elle recoit les cartes PAR DEFAUT (ordre d'origine, compteurs reels) et trois
 * personnalisations independantes : un ordre, des libelles, un ensemble masque.
 *
 * Point important pour les forfaits : la reorganisation raisonne sur les index
 * de l'ordre COMPLET, masquees comprises. Une categorie masquee garde donc sa
 * place dans la liste stockee et ne peut pas reapparaitre parce qu'on a deplace
 * ses voisines.
 */

export interface NotifHubCardsProps {
  cards: HubCardDef[];
  tokens: ThemeTokens;
  onSelect: (key: string) => void;
  hideEditMode?: boolean;
  hiddenCards?: Set<string>;
  onToggleCard?: (key: string) => void;
  cardOrder?: string[];
  cardLabels?: Record<string, string>;
  reorderMode?: boolean;
  onMoveDraft?: (from: number, to: number) => void;
  onRenameDraft?: (key: string, newLabel: string) => void;
}

function orderedKeys(cards: HubCardDef[], order?: string[]): string[] {
  const known = new Set(cards.map(c => c.key));
  if (!order || order.length === 0) return cards.map(c => c.key);
  // Une cle inconnue (categorie retiree du produit) est ignoree ; une categorie
  // nouvelle, absente de l'ordre enregistre, se range a la fin.
  const kept = order.filter(k => known.has(k));
  const missing = cards.map(c => c.key).filter(k => !kept.includes(k));
  return [...kept, ...missing];
}

export default function NotifHubCards(props: NotifHubCardsProps) {
  const {
    cards, tokens: t, onSelect, hideEditMode, hiddenCards, onToggleCard,
    cardOrder, cardLabels, reorderMode, onMoveDraft, onRenameDraft,
  } = props;

  const byKey = new Map(cards.map(c => [c.key, c]));
  const allKeys = orderedKeys(cards, cardOrder);

  if (reorderMode && onMoveDraft && onRenameDraft) {
    return (
      <ReorderView allKeys={allKeys} byKey={byKey} labels={cardLabels} hiddenCards={hiddenCards}
        onMove={onMoveDraft} onRename={onRenameDraft} t={t} />
    );
  }

  const visible = allKeys
    .filter(k => hideEditMode || !hiddenCards?.has(k))
    .map(k => byKey.get(k))
    .filter((c): c is HubCardDef => !!c);

  return (
    <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
      {visible.map(card => (
        <NotifCard
          key={card.key}
          card={cardLabels?.[card.key] ? { ...card, label: cardLabels[card.key] } : card}
          tokens={t}
          onClick={() => { if (!hideEditMode) onSelect(card.key); }}
          isHidden={hiddenCards?.has(card.key)}
          hideEditMode={hideEditMode}
          onToggleHide={() => onToggleCard?.(card.key)}
        />
      ))}
    </div>
  );
}

function ReorderView({ allKeys, byKey, labels, hiddenCards, onMove, onRename, t }: {
  allKeys: string[];
  byKey: Map<string, HubCardDef>;
  labels?: Record<string, string>;
  hiddenCards?: Set<string>;
  onMove: (from: number, to: number) => void;
  onRename: (key: string, newLabel: string) => void;
  t: ThemeTokens;
}) {
  // On ne montre que ce que ce niveau a le droit de voir, mais on deplace dans
  // l'ordre complet : `toFull` fait la traduction.
  const keys = allKeys.filter(k => !hiddenCards?.has(k));
  const toFull = keys.map(k => allKeys.indexOf(k));

  const dragIdx = useRef<number | null>(null);
  const [dragSourceIdx, setDragSourceIdx] = useState<number | null>(null);
  const [dropTargetIdx, setDropTargetIdx] = useState<number | null>(null);
  const [dropEdge, setDropEdge] = useState<'before' | 'after'>('before');

  const handleDragStart = (idx: number) => { dragIdx.current = idx; setDragSourceIdx(idx); setDropTargetIdx(null); };
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx.current === null || dragIdx.current === idx) { if (dragIdx.current === idx) setDropTargetIdx(null); return; }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const mid = rect.top + rect.height / 2;
    setDropTargetIdx(idx);
    setDropEdge(e.clientY < mid ? 'before' : 'after');
  };
  const handleDragEnd = () => {
    if (dragIdx.current !== null && dropTargetIdx !== null) {
      const fromFull = toFull[dragIdx.current];
      const targetFull = toFull[dropTargetIdx];
      let toFullIdx = dropEdge === 'after' ? targetFull + 1 : targetFull;
      if (fromFull < toFullIdx) toFullIdx -= 1;
      if (fromFull !== toFullIdx && toFullIdx >= 0) onMove(fromFull, toFullIdx);
    }
    dragIdx.current = null; setDragSourceIdx(null); setDropTargetIdx(null);
  };

  const handleArrowMove = (visibleFrom: number, visibleTo: number) => {
    const ff = toFull[visibleFrom];
    const ft = toFull[visibleTo];
    if (ff !== undefined && ft !== undefined) onMove(ff, ft);
  };

  return (
    <div className="p-3 space-y-0">
      {keys.map((k, idx) => {
        const base = byKey.get(k);
        if (!base) return null;
        const displayLabel = labels?.[k] || base.label;
        return (
          <NotifHubReorderRow
            key={k}
            cardKey={k}
            icon={base.icon}
            label={displayLabel}
            defaultLabel={base.label}
            accent={base.accent}
            accentBg={base.accentBg}
            idx={idx}
            total={keys.length}
            onMove={handleArrowMove}
            onRename={onRename}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            isDragging={dragSourceIdx === idx}
            showIndicatorBefore={dropTargetIdx === idx && dropEdge === 'before' && dragSourceIdx !== idx && dragSourceIdx !== idx - 1}
            showIndicatorAfter={dropTargetIdx === idx && dropEdge === 'after' && dragSourceIdx !== idx && dragSourceIdx !== idx + 1}
            t={t}
          />
        );
      })}
    </div>
  );
}

function NotifCard({ card, tokens: t, onClick, isHidden, hideEditMode, onToggleHide }: {
  card: HubCardDef; tokens: ThemeTokens; onClick: () => void;
  isHidden?: boolean; hideEditMode?: boolean; onToggleHide?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const hasNotif = card.count > 0;
  const dimmed = hideEditMode && isHidden;

  return (
    <div className="relative">
      <button
        onClick={hideEditMode ? onToggleHide : onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="relative w-full flex items-start gap-2.5 p-2.5 rounded-xl text-left transition-all duration-200"
        style={{
          background: hovered ? `linear-gradient(135deg, ${card.accentBg}, transparent)` : 'rgba(148,163,184,0.03)',
          border: `1px solid ${hovered ? card.accent + '30' : 'rgba(148,163,184,0.08)'}`,
          boxShadow: hovered ? `0 4px 12px ${card.accent}12` : 'none',
          transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
          opacity: dimmed ? 0.4 : 1,
        }}
      >
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200"
          style={{
            background: hovered ? card.accentBg : 'rgba(148,163,184,0.06)',
            border: `1px solid ${hovered ? card.accent + '25' : 'rgba(148,163,184,0.08)'}`,
            color: hovered ? card.accent : t.dropdown.itemText,
          }}>
          {card.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11.5px] font-semibold leading-tight truncate transition-colors duration-200"
            style={{ color: hovered ? card.accent : t.dropdown.itemTextHover }}>
            {card.label}
          </p>
          <p className="text-[10px] mt-0.5 truncate" style={{ color: t.dropdown.itemText }}>{card.desc}</p>
        </div>
        {hasNotif && !hideEditMode && (
          <span className="absolute top-1.5 right-1.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[9px] font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', boxShadow: '0 0 8px rgba(239,68,68,0.4)' }}>
            {card.count > 99 ? '99+' : card.count}
          </span>
        )}
      </button>
      {hideEditMode && (
        <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
          {isHidden && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold"
              style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>Masque</span>
          )}
          <div className="w-5 h-5 rounded-md flex items-center justify-center"
            style={{ background: isHidden ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.10)', color: isHidden ? '#ef4444' : '#22c55e' }}>
            {isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          </div>
        </div>
      )}
    </div>
  );
}
