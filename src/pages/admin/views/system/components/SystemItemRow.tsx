import { useState, useRef, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import type { useThemeTokens } from '../../../../../hooks/useThemeTokens';
import type { SystemItem, SystemStatus } from '../types';
import SystemItemActions from './SystemItemActions';

interface Props {
  item: SystemItem;
  index: number;
  total: number;
  tokens: ReturnType<typeof useThemeTokens>;
  statuses: SystemStatus[];
  /** Note en cours de modification (titre edite sur place). */
  renamingItemId: string | null;
  renameDraft: string;
  onSetStatus: (itemId: string, statusId: string | null) => void;
  onAskDelete: () => void;
  onStartRename: () => void;
  onRenameDraftChange: (v: string) => void;
  onConfirmRename: () => void;
  onCancelRename: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export default function SystemItemRow({
  item, index, total, tokens, statuses, renamingItemId, renameDraft,
  onSetStatus, onAskDelete, onStartRename, onRenameDraftChange, onConfirmRename, onCancelRename, onMoveUp, onMoveDown,
}: Props) {
  const currentStatus = item.status_id ? statuses.find((s) => s.id === item.status_id) : null;
  const rowBg = currentStatus ? `${currentStatus.color}08` : tokens.surface.primary;
  const borderColor = currentStatus ? `${currentStatus.color}30` : tokens.surface.border;
  const isRenaming = renamingItemId === item.id;

  return (
    <div
      data-tx-note
      className="rounded-lg transition-all duration-150"
      style={{ background: rowBg, border: `1px solid ${borderColor}` }}
    >
      {/* Main row */}
      <div className="flex items-center gap-2 px-2.5 sm:px-3 py-2 min-w-0">
        {/* Status dot */}
        {currentStatus ? (
          <div className="shrink-0 w-2.5 h-2.5 rounded-full" style={{ background: currentStatus.color }} />
        ) : (
          <div className="shrink-0 w-2.5 h-2.5 rounded-full" style={{ background: tokens.text.quaternary, opacity: 0.3 }} />
        )}

        {/* Titre, ou champ de modification : meme idiome que le renommage d'une categorie. */}
        {isRenaming ? (
          <>
            <input
              type="text"
              value={renameDraft}
              onChange={(e) => onRenameDraftChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') onConfirmRename(); if (e.key === 'Escape') onCancelRename(); }}
              className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg text-xs outline-none"
              style={{ background: tokens.input.bg, border: `1px solid ${tokens.input.borderFocus}`, color: tokens.input.text }}
              autoFocus
            />
            <button onClick={onConfirmRename} aria-label="Valider" className="p-1.5 rounded-md shrink-0" style={{ color: tokens.success.text }}><Check className="w-4 h-4" /></button>
            <button onClick={onCancelRename} aria-label="Annuler" className="p-1.5 rounded-md shrink-0" style={{ color: tokens.text.tertiary }}><X className="w-4 h-4" /></button>
          </>
        ) : (
          <>
            <span className="flex-1 text-xs sm:text-[13px] min-w-0 break-words leading-snug" style={{ color: tokens.text.secondary }}>
              {item.title}
            </span>

            {/* Current status badge - desktop */}
            {currentStatus && (
              <span
                className="hidden sm:inline-block shrink-0 px-2 py-0.5 rounded text-[10px] font-medium"
                style={{ background: `${currentStatus.color}18`, color: currentStatus.color, border: `1px solid ${currentStatus.color}30` }}
              >
                {currentStatus.name}
              </span>
            )}

            {/* Desktop status buttons */}
            <div className="hidden sm:flex items-center gap-1 shrink-0">
              {statuses.slice(0, 3).map((s) => (
                <button
                  key={s.id}
                  onClick={() => onSetStatus(item.id, item.status_id === s.id ? null : s.id)}
                  className="px-2 py-0.5 rounded text-[10px] font-medium transition-all duration-150"
                  style={{
                    background: item.status_id === s.id ? `${s.color}20` : tokens.surface.tertiary,
                    color: item.status_id === s.id ? s.color : tokens.text.quaternary,
                    border: `1px solid ${item.status_id === s.id ? `${s.color}40` : tokens.surface.border}`,
                  }}
                >
                  {s.name}
                </button>
              ))}
              {statuses.length > 3 && (
                <StatusDropdown
                  statuses={statuses.slice(3)}
                  currentStatusId={item.status_id}
                  tokens={tokens}
                  onSelect={(sId) => onSetStatus(item.id, item.status_id === sId ? null : sId)}
                />
              )}
            </div>

            {/*
              Menu « ... » TOUJOURS visible. Avant, ce bloc etait rendu transparent au-dela du
              palier sm et ne reapparaissait qu au survol de la ligne : sur desktop la corbeille
              n existait donc qu une fois la souris dessus, et personne ne la trouvait.
            */}
            <div className="shrink-0">
              <SystemItemActions
                title={item.title}
                tokens={tokens}
                isFirst={index === 0}
                isLast={index === total - 1}
                onMoveUp={onMoveUp}
                onMoveDown={onMoveDown}
                onRename={onStartRename}
                onDelete={onAskDelete}
              />
            </div>
          </>
        )}
      </div>

      {/* Mobile status buttons row */}
      {!isRenaming && (
        <div className="sm:hidden flex items-center gap-1 px-2.5 pb-2 flex-wrap">
          {currentStatus && (
            <span
              className="px-2 py-0.5 rounded text-[10px] font-medium mr-1"
              style={{ background: `${currentStatus.color}18`, color: currentStatus.color, border: `1px solid ${currentStatus.color}30` }}
            >
              {currentStatus.name}
            </span>
          )}
          {statuses.map((s) => (
            <button
              key={s.id}
              onClick={() => onSetStatus(item.id, item.status_id === s.id ? null : s.id)}
              className="px-2 py-1 rounded text-[10px] font-medium transition-all"
              style={{
                background: item.status_id === s.id ? `${s.color}20` : tokens.surface.tertiary,
                color: item.status_id === s.id ? s.color : tokens.text.quaternary,
                border: `1px solid ${item.status_id === s.id ? `${s.color}40` : tokens.surface.border}`,
              }}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusDropdown({ statuses, currentStatusId, tokens, onSelect }: { statuses: SystemStatus[]; currentStatusId: string | null; tokens: ReturnType<typeof useThemeTokens>; onSelect: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="px-2 py-0.5 rounded text-[10px] font-medium"
        style={{ background: tokens.surface.tertiary, color: tokens.text.quaternary, border: `1px solid ${tokens.surface.border}` }}
      >
        Plus...
      </button>
      {open && (
        <div data-tx-drop className="absolute right-0 top-full mt-1 z-50 rounded-lg shadow-lg py-1 min-w-[130px]" style={{ background: tokens.surface.primary, border: `1px solid ${tokens.surface.border}` }}>
          {statuses.map((s) => (
            <button
              key={s.id}
              onClick={() => { onSelect(s.id); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors"
              style={{ color: currentStatusId === s.id ? s.color : tokens.text.secondary }}
            >
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
              <span>{s.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
