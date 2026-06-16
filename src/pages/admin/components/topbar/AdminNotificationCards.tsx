import { useState, useRef, type ReactNode } from 'react';
import { MessageSquareText, CalendarDays, CalendarClock, CalendarCheck, Shield, RefreshCw, Eye, EyeOff } from 'lucide-react';
import NotifCardReorderEntry from './NotifCardReorderEntry';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';

export type NotifCategory =
  | 'client' | 'vendeur' | 'super-admin'
  | 'agenda' | 'equipe'
  | 'propositions' | 'rdv'
  | 'decalages' | 'demandes-decalage';

export interface CardDef {
  key: NotifCategory;
  icon: ReactNode;
  label: string;
  desc: string;
  accent: string;
  accentBg: string;
}

export const CARDS: CardDef[] = [
  { key: 'client', icon: <MessageSquareText className="w-4 h-4" />, label: 'Client', desc: 'Messages clients', accent: '#0ea5e9', accentBg: 'rgba(14,165,233,0.12)' },
  { key: 'vendeur', icon: <MessageSquareText className="w-4 h-4" />, label: 'Vendeur', desc: 'Messages vendeurs', accent: '#8b5cf6', accentBg: 'rgba(139,92,246,0.12)' },
  { key: 'agenda', icon: <CalendarDays className="w-4 h-4" />, label: 'Agenda perso', desc: 'Rendez-vous a venir', accent: '#06b6d4', accentBg: 'rgba(6,182,212,0.12)' },
  { key: 'propositions', icon: <CalendarClock className="w-4 h-4" />, label: 'Propositions', desc: 'Nouvelles propositions RDV', accent: '#f59e0b', accentBg: 'rgba(245,158,11,0.12)' },
  { key: 'rdv', icon: <CalendarCheck className="w-4 h-4" />, label: 'RDV Confirmes', desc: 'Confirmations recentes', accent: '#22c55e', accentBg: 'rgba(34,197,94,0.12)' },
  { key: 'super-admin', icon: <Shield className="w-4 h-4" />, label: 'Super Admin', desc: 'Messages du Super Admin', accent: '#f59e0b', accentBg: 'rgba(245,158,11,0.10)' },
  { key: 'equipe', icon: <CalendarDays className="w-4 h-4" />, label: 'Agenda equipe', desc: 'RDV equipe imminents', accent: '#06b6d4', accentBg: 'rgba(6,182,212,0.10)' },
  { key: 'decalages', icon: <RefreshCw className="w-4 h-4" />, label: 'Decalages', desc: 'Reponses aux decalages', accent: '#64748b', accentBg: 'rgba(100,116,139,0.10)' },
  { key: 'demandes-decalage', icon: <RefreshCw className="w-4 h-4" />, label: 'Demandes', desc: 'Demandes de decalage', accent: '#f59e0b', accentBg: 'rgba(245,158,11,0.08)' },
];

const CARD_MAP = new Map(CARDS.map(c => [c.key, c]));

interface Props {
  unreadClientCount: number;
  unreadVendorCount: number;
  agendaPersoCount: number;
  agendaEquipeCount: number;
  proposalsCount: number;
  confirmedCount: number;
  rescheduleCount: number;
  rescheduleRequestCount: number;
  unreadSuperAdminCount: number;
  onSelect: (cat: NotifCategory) => void;
  tokens: ThemeTokens;
  hideEditMode?: boolean;
  hiddenCards?: Set<string>;
  onToggleCard?: (key: string) => void;
  cardOrder?: string[];
  cardLabels?: Record<string, string>;
  reorderMode?: boolean;
  onMoveDraft?: (from: number, to: number) => void;
  onRenameDraft?: (key: string, newLabel: string) => void;
}

function getCount(key: NotifCategory, p: Props): number {
  switch (key) {
    case 'client': return p.unreadClientCount;
    case 'vendeur': return p.unreadVendorCount;
    case 'super-admin': return p.unreadSuperAdminCount;
    case 'agenda': return p.agendaPersoCount;
    case 'equipe': return p.agendaEquipeCount;
    case 'propositions': return p.proposalsCount;
    case 'rdv': return p.confirmedCount;
    case 'decalages': return p.rescheduleCount;
    case 'demandes-decalage': return p.rescheduleRequestCount;
  }
}

function resolveCards(order: string[] | undefined, labels: Record<string, string> | undefined, hiddenCards: Set<string> | undefined, hideEditMode: boolean): CardDef[] {
  const keys = order && order.length > 0 ? order : CARDS.map(c => c.key);
  const result: CardDef[] = [];
  for (const k of keys) {
    const base = CARD_MAP.get(k as NotifCategory);
    if (!base) continue;
    if (!hideEditMode && hiddenCards?.has(k)) continue;
    const customLabel = labels?.[k];
    result.push(customLabel ? { ...base, label: customLabel } : base);
  }
  return result;
}

export default function AdminNotificationCards(props: Props) {
  const { onSelect, tokens: t, hideEditMode, hiddenCards, onToggleCard, cardOrder, cardLabels, reorderMode, onMoveDraft, onRenameDraft } = props;

  if (reorderMode && onMoveDraft && onRenameDraft) {
    return <ReorderView order={cardOrder} labels={cardLabels} hiddenCards={hiddenCards} onMove={onMoveDraft} onRename={onRenameDraft} t={t} />;
  }

  const cards = resolveCards(cardOrder, cardLabels, hiddenCards, !!hideEditMode);

  return (
    <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
      {cards.map(card => (
        <NotifCard
          key={card.key}
          card={card}
          count={getCount(card.key, props)}
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

function ReorderView({ order, labels, hiddenCards, onMove, onRename, t }: {
  order?: string[]; labels?: Record<string, string>;
  hiddenCards?: Set<string>;
  onMove: (from: number, to: number) => void;
  onRename: (key: string, newLabel: string) => void;
  t: ThemeTokens;
}) {
  const allKeys = order && order.length > 0 ? order : CARDS.map(c => c.key);
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
        const base = CARD_MAP.get(k as NotifCategory);
        if (!base) return null;
        const customLabel = labels?.[k];
        const displayLabel = customLabel || base.label;
        return (
          <NotifCardReorderEntry
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

function NotifCard({ card, count, tokens: t, onClick, isHidden, hideEditMode, onToggleHide }: {
  card: CardDef; count: number; tokens: ThemeTokens; onClick: () => void;
  isHidden?: boolean; hideEditMode?: boolean; onToggleHide?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const hasNotif = count > 0;
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
            {count > 99 ? '99+' : count}
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
