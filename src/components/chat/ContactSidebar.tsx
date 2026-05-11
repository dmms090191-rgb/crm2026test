import { Search, CornerUpLeft, Trash2, CheckSquare, X } from 'lucide-react';
import type { ChatContact } from './chatTypes';

interface ContactSidebarProps {
  contacts: ChatContact[];
  selectedContactId: string | null;
  onSelectContact: (id: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  contactLoading: boolean;
  accentColor: string;
  accentRgb: string;
  tokens: ReturnType<typeof import('../../lib/themeTokens').getThemeTokens>;
  className?: string;
  currentRole?: string;
  returnContactId?: string | null;
  onReturnClick?: () => void;
  selectable?: boolean;
  selectMode?: boolean;
  onToggleSelectMode?: () => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onSelectAll?: (all: boolean) => void;
  onDeleteSelected?: () => void;
}

function formatShortTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Hier';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

export default function ContactSidebar({
  contacts,
  selectedContactId,
  onSelectContact,
  search,
  onSearchChange,
  contactLoading,
  accentColor,
  accentRgb,
  tokens,
  className = '',
  currentRole,
  returnContactId,
  onReturnClick,
  selectable,
  selectMode,
  onToggleSelectMode,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onDeleteSelected,
}: ContactSidebarProps) {
  const filtered = contacts.filter(c =>
    c.displayName.toLowerCase().includes(search.toLowerCase()) ||
    (c.subtitle ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const isSelecting = selectable && selectMode;

  return (
    <div
      className={`flex flex-col overflow-hidden ${className}`}
      style={{
        background: tokens.chat.listBg,
        borderRight: `1px solid ${tokens.chat.border}`,
      }}
    >
      <div className="px-3 pt-3 pb-2 flex-shrink-0 space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: tokens.text.quaternary }} />
          <input
            type="text"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Rechercher..."
            className="w-full pl-8 pr-3 py-2 rounded-lg text-xs outline-none transition-all"
            style={{
              background: tokens.chat.inputBg,
              border: `1px solid ${tokens.chat.inputBorder}`,
              color: tokens.chat.inputText,
            }}
            onFocus={e => (e.currentTarget.style.borderColor = `rgba(${accentRgb},0.3)`)}
            onBlur={e => (e.currentTarget.style.borderColor = tokens.chat.inputBorder)}
          />
        </div>
        {selectable && onToggleSelectMode && (
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleSelectMode}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:scale-[1.02]"
              style={isSelecting ? {
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)',
                color: '#ef4444',
              } : {
                background: tokens.surface.hover,
                border: `1px solid ${tokens.surface.borderLight}`,
                color: tokens.text.secondary,
              }}
            >
              {isSelecting ? <><X className="w-3 h-3" />Annuler</> : <><CheckSquare className="w-3 h-3" />Selectionner</>}
            </button>
            {isSelecting && selectedIds && selectedIds.size > 0 && onDeleteSelected && (
              <button
                onClick={onDeleteSelected}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:scale-[1.02]"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444' }}
              >
                <Trash2 className="w-3 h-3" />
                Supprimer ({selectedIds.size})
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {isSelecting && onSelectAll && filtered.length > 0 && selectedIds && (
          <button
            onClick={() => onSelectAll(selectedIds.size < filtered.length)}
            className="w-full flex items-center gap-2 px-2.5 py-2 mb-1 rounded-lg text-left transition-all"
            style={{ background: tokens.surface.hover, border: `1px solid ${tokens.surface.borderLight}` }}
          >
            <span
              className="flex items-center justify-center rounded flex-shrink-0"
              style={{
                width: 16,
                height: 16,
                background: selectedIds.size === filtered.length && filtered.length > 0 ? 'rgba(239,68,68,0.12)' : tokens.input.bg,
                border: selectedIds.size === filtered.length && filtered.length > 0 ? '1px solid rgba(239,68,68,0.4)' : `1px solid ${tokens.input.border}`,
              }}
            >
              {selectedIds.size === filtered.length && filtered.length > 0 && (
                <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                  <path d="M1 3.5L3.5 6L8 1" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {selectedIds.size > 0 && selectedIds.size < filtered.length && (
                <svg width="8" height="2" viewBox="0 0 8 2" fill="none">
                  <path d="M1 1H7" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              )}
            </span>
            <span className="text-[11px] font-semibold" style={{ color: tokens.text.secondary }}>Tout selectionner</span>
          </button>
        )}
        {contactLoading ? (
          <div className="flex items-center justify-center h-20">
            <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: tokens.surface.border, borderTopColor: accentColor }} />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-center py-6" style={{ color: tokens.chat.emptyText }}>Aucune conversation</p>
        ) : (
          filtered.map(contact => {
            const isActive = contact.id === selectedContactId;
            const hasLastMsg = !!contact.lastMessage;
            const lastMsgPrefix = contact.lastMessageSender === currentRole ? 'Vous : ' : '';
            const lastMsgDisplay = hasLastMsg
              ? `${lastMsgPrefix}${contact.lastMessage}`
              : 'Aucun message';
            const showReturn = returnContactId === contact.id && !!onReturnClick;

            return (
              <div key={contact.id} className="relative mb-0.5">
                <div
                  className="w-full flex items-center gap-1.5 px-1.5 py-2.5 rounded-xl text-left transition-all"
                  style={isActive ? {
                    background: `rgba(${accentRgb},0.1)`,
                    border: `1px solid rgba(${accentRgb},0.2)`,
                  } : {
                    background: 'transparent',
                    border: '1px solid transparent',
                  }}
                >
                  {isSelecting && onToggleSelect && selectedIds && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onToggleSelect(contact.id); }}
                      className="flex items-center justify-center rounded transition-all flex-shrink-0"
                      style={{
                        width: 16,
                        height: 16,
                        background: selectedIds.has(contact.id) ? 'rgba(239,68,68,0.12)' : tokens.input.bg,
                        border: selectedIds.has(contact.id) ? '1px solid rgba(239,68,68,0.4)' : `1px solid ${tokens.input.border}`,
                      }}
                    >
                      {selectedIds.has(contact.id) && (
                        <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                          <path d="M1 3.5L3.5 6L8 1" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => onSelectContact(contact.id)}
                    className="flex-1 flex items-center gap-2.5 text-left min-w-0"
                  >
                  <div
                    className="w-9 h-9 md:w-8 md:h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{
                      background: isActive ? `rgba(${accentRgb},0.8)` : tokens.chat.messageBubbleOther,
                      boxShadow: isActive ? `0 0 8px rgba(${accentRgb},0.3)` : 'none',
                      color: '#ffffff',
                    }}
                  >
                    {contact.initial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-sm md:text-xs font-semibold truncate" style={{ color: isActive ? tokens.text.primary : tokens.chat.listItemText }}>
                        {contact.displayName}
                      </p>
                      {contact.lastMessageAt && (
                        <span className="text-[10px] flex-shrink-0 md:hidden" style={{ color: tokens.chat.listItemSub }}>
                          {formatShortTime(contact.lastMessageAt)}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] truncate md:hidden" style={{ color: tokens.chat.listItemSub }}>
                      {lastMsgDisplay}
                    </p>
                    {contact.subtitle && (
                      <p className="text-[10px] truncate hidden md:block" style={{ color: tokens.chat.listItemSub }}>{contact.subtitle}</p>
                    )}
                  </div>
                  </button>
                </div>
                {showReturn && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onReturnClick!(); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center transition-all hover:scale-110"
                    style={{
                      background: tokens.surface.secondary,
                      border: `1px solid ${tokens.surface.borderLight}`,
                      boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                    }}
                    title="Retour"
                  >
                    <CornerUpLeft className="w-3 h-3" style={{ color: tokens.text.secondary }} />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
